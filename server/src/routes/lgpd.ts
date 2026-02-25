import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import {
  patients,
  consultations,
  audioRecordings,
  transcriptions,
  aiAnalyses,
  aiChatMessages,
  lgpdConsents,
  auditLogs,
} from "../db/schema.js";
import { decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";

export const lgpdRouter = router({
  // ─── Portabilidade: exportar todos os dados ──────────────────────────
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.user.id);

    // Buscar todos os pacientes com dados decriptados
    const allPatients = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId));

    const exportData = {
      exportDate: new Date().toISOString(),
      psychologist: {
        name: ctx.user.name,
        email: ctx.user.email,
      },
      patients: await Promise.all(
        allPatients.map(async (patient) => {
          const patientConsults = await db
            .select()
            .from(consultations)
            .where(eq(consultations.patientId, patient.id));

          const patientTranscriptions = await db
            .select()
            .from(transcriptions)
            .where(
              eq(
                transcriptions.consultationId,
                patientConsults[0]?.id ?? -1
              )
            );

          return {
            name: decrypt(patient.name),
            cpf: patient.cpf ? decrypt(patient.cpf) : null,
            email: patient.email ? decrypt(patient.email) : null,
            phone: patient.phone ? decrypt(patient.phone) : null,
            birthDate: patient.birthDate ? decrypt(patient.birthDate) : null,
            clinicalHistory: patient.clinicalHistory
              ? decrypt(patient.clinicalHistory)
              : null,
            tags: patient.tags,
            status: patient.status,
            consultations: patientConsults.map((c) => ({
              date: c.date,
              status: c.status,
              duration: c.duration,
              notes: c.notes ? decrypt(c.notes) : null,
              tags: c.tags,
            })),
          };
        })
      ),
    };

    await logAudit({
      userId,
      action: "LGPD_DATA_EXPORT",
      resourceType: "user",
      resourceId: userId,
      ipAddress: getClientIP(ctx.req),
      details: "Exportação de dados LGPD solicitada",
    });

    return exportData;
  }),

  // ─── Direito ao esquecimento: excluir paciente ───────────────────────
  deletePatientData: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      // Verificar propriedade
      const [patient] = await db
        .select()
        .from(patients)
        .where(
          and(eq(patients.id, input.patientId), eq(patients.userId, userId))
        );

      if (!patient) throw new Error("Paciente não encontrado");

      // Cascata: deletar tudo relacionado
      // (as foreign keys com onDelete: cascade cuidam de boa parte)
      await db.delete(patients).where(eq(patients.id, input.patientId));

      await logAudit({
        userId,
        action: "LGPD_DATA_DELETION",
        resourceType: "patient",
        resourceId: input.patientId,
        ipAddress: getClientIP(ctx.req),
        details: "Exclusão completa de dados do paciente (LGPD - Direito ao Esquecimento)",
      });

      return {
        success: true,
        message: "Todos os dados do paciente foram excluídos permanentemente.",
      };
    }),

  // ─── Status de consentimento ─────────────────────────────────────────
  getConsentStatus: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const consents = await db
        .select()
        .from(lgpdConsents)
        .where(
          and(
            eq(lgpdConsents.patientId, input.patientId),
            eq(lgpdConsents.userId, userId)
          )
        );

      return consents;
    }),

  // ─── Registrar consentimento ─────────────────────────────────────────
  grantConsent: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        type: z.enum([
          "data_collection",
          "processing",
          "storage",
          "ai_analysis",
          "audio_recording",
        ]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [consent] = await db
        .insert(lgpdConsents)
        .values({
          patientId: input.patientId,
          userId,
          type: input.type,
          description: input.description,
          granted: true,
          grantedAt: new Date(),
          ipAddress: getClientIP(ctx.req),
        })
        .returning();

      await logAudit({
        userId,
        action: "LGPD_CONSENT_GRANTED",
        resourceType: "lgpd_consent",
        resourceId: consent.id,
        ipAddress: getClientIP(ctx.req),
        details: `Consentimento concedido: ${input.type}`,
      });

      return consent;
    }),

  // ─── Revogar consentimento ───────────────────────────────────────────
  revokeConsent: protectedProcedure
    .input(z.object({ consentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [updated] = await db
        .update(lgpdConsents)
        .set({
          granted: false,
          revokedAt: new Date(),
        })
        .where(
          and(
            eq(lgpdConsents.id, input.consentId),
            eq(lgpdConsents.userId, userId)
          )
        )
        .returning();

      if (!updated) throw new Error("Consentimento não encontrado");

      await logAudit({
        userId,
        action: "LGPD_CONSENT_REVOKED",
        resourceType: "lgpd_consent",
        resourceId: input.consentId,
        ipAddress: getClientIP(ctx.req),
      });

      return updated;
    }),

  // ─── Logs de auditoria ──────────────────────────────────────────────
  getAuditLogs: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        action: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);
      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(auditLogs.userId, userId)];

      const logs = await db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(auditLogs.createdAt)
        .limit(input.limit)
        .offset(offset);

      return logs.map((log) => ({
        ...log,
        details: log.details ? decrypt(log.details) : null,
      }));
    }),
});
