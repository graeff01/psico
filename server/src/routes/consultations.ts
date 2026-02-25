import { z } from "zod";
import { eq, and, desc, sql, gte, lte, between } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import {
  consultations,
  patients,
  audioRecordings,
  transcriptions,
  aiAnalyses,
} from "../db/schema.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";

export const consultationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        patientId: z.number().optional(),
        status: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);
      const { patientId, status, startDate, endDate, page, limit } = input ?? {
        page: 1,
        limit: 20,
      };
      const offset = ((page ?? 1) - 1) * (limit ?? 20);

      const conditions = [eq(consultations.userId, userId)];

      if (patientId) conditions.push(eq(consultations.patientId, patientId));
      if (status) conditions.push(eq(consultations.status, status));
      if (startDate) conditions.push(gte(consultations.date, new Date(startDate)));
      if (endDate) conditions.push(lte(consultations.date, new Date(endDate)));

      const results = await db
        .select({
          consultation: consultations,
          patientName: patients.name,
        })
        .from(consultations)
        .innerJoin(patients, eq(consultations.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(desc(consultations.date))
        .limit(limit ?? 20)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(consultations)
        .where(and(...conditions));

      return {
        consultations: results.map((r) => ({
          ...r.consultation,
          notes: r.consultation.notes ? decrypt(r.consultation.notes) : null,
          patientName: decrypt(r.patientName),
        })),
        total: Number(countResult.count),
        page: page ?? 1,
        totalPages: Math.ceil(Number(countResult.count) / (limit ?? 20)),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [result] = await db
        .select({
          consultation: consultations,
          patientName: patients.name,
        })
        .from(consultations)
        .innerJoin(patients, eq(consultations.patientId, patients.id))
        .where(
          and(eq(consultations.id, input.id), eq(consultations.userId, userId))
        );

      if (!result) throw new Error("Consulta não encontrada");

      // Buscar áudios, transcrições e análises
      const audios = await db
        .select()
        .from(audioRecordings)
        .where(eq(audioRecordings.consultationId, input.id));

      const transcriptionResults = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.consultationId, input.id));

      const analyses = await db
        .select()
        .from(aiAnalyses)
        .where(eq(aiAnalyses.consultationId, input.id))
        .orderBy(desc(aiAnalyses.createdAt));

      await logAudit({
        userId,
        action: "VIEW_CONSULTATION",
        resourceType: "consultation",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return {
        ...result.consultation,
        notes: result.consultation.notes ? decrypt(result.consultation.notes) : null,
        patientName: decrypt(result.patientName),
        audioRecordings: audios,
        transcriptions: transcriptionResults.map((t) => ({
          ...t,
          text: decrypt(t.text),
        })),
        aiAnalyses: analyses.map((a) => ({
          ...a,
          content: decrypt(a.content),
        })),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        date: z.string(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      // Verificar se o paciente pertence ao psicólogo
      const [patient] = await db
        .select()
        .from(patients)
        .where(
          and(eq(patients.id, input.patientId), eq(patients.userId, userId))
        );

      if (!patient) throw new Error("Paciente não encontrado");

      const [consultation] = await db
        .insert(consultations)
        .values({
          patientId: input.patientId,
          userId,
          date: new Date(input.date),
          notes: input.notes ? encrypt(input.notes) : null,
          tags: input.tags ?? [],
          status: input.status,
        })
        .returning();

      await logAudit({
        userId,
        action: "CREATE_CONSULTATION",
        resourceType: "consultation",
        resourceId: consultation.id,
        ipAddress: getClientIP(ctx.req),
      });

      return consultation;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          date: z.string().optional(),
          notes: z.string().optional(),
          status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
          duration: z.number().optional(),
          tags: z.array(z.string()).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [existing] = await db
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.id, input.id),
            eq(consultations.userId, userId)
          )
        );

      if (!existing) throw new Error("Consulta não encontrada");

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.data.date) updateData.date = new Date(input.data.date);
      if (input.data.notes !== undefined)
        updateData.notes = input.data.notes ? encrypt(input.data.notes) : null;
      if (input.data.status) updateData.status = input.data.status;
      if (input.data.duration !== undefined) updateData.duration = input.data.duration;
      if (input.data.tags) updateData.tags = input.data.tags;

      const [updated] = await db
        .update(consultations)
        .set(updateData)
        .where(eq(consultations.id, input.id))
        .returning();

      await logAudit({
        userId,
        action: "UPDATE_CONSULTATION",
        resourceType: "consultation",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [existing] = await db
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.id, input.id),
            eq(consultations.userId, userId)
          )
        );

      if (!existing) throw new Error("Consulta não encontrada");

      await db.delete(consultations).where(eq(consultations.id, input.id));

      await logAudit({
        userId,
        action: "DELETE_CONSULTATION",
        resourceType: "consultation",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { success: true };
    }),

  // Estatísticas para dashboard
  getStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "quarter", "year"]).default("month"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);
      const period = input?.period ?? "month";

      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const periodConsultations = await db
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.userId, userId),
            gte(consultations.date, startDate)
          )
        )
        .orderBy(consultations.date);

      const byStatus = periodConsultations.reduce(
        (acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const byMonth = periodConsultations.reduce(
        (acc, c) => {
          const month = c.date.toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Tags mais usadas
      const allTags = periodConsultations.flatMap(
        (c) => (c.tags as string[]) ?? []
      );
      const tagCounts = allTags.reduce(
        (acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      return {
        total: periodConsultations.length,
        byStatus,
        byMonth: Object.entries(byMonth).map(([month, count]) => ({
          month,
          count,
        })),
        topTags,
        avgDuration:
          periodConsultations.filter((c) => c.duration).length > 0
            ? Math.round(
                periodConsultations
                  .filter((c) => c.duration)
                  .reduce((sum, c) => sum + (c.duration ?? 0), 0) /
                  periodConsultations.filter((c) => c.duration).length
              )
            : 0,
      };
    }),
});
