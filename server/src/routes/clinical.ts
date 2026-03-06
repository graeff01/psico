import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import {
  scaleApplications,
  patientDiagnoses,
  treatmentGoals,
  patients,
} from "../db/schema.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";

export const clinicalRouter = router({
  // ─── Escalas Clínicas ─────────────────────────────────────────────────

  applyScale: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        consultationId: z.number().optional(),
        scaleType: z.enum(["phq9", "gad7", "bdi"]),
        responses: z.array(z.number()),
        totalScore: z.number(),
        severity: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify patient ownership
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, input.patientId), eq(patients.userId, userId)));
      if (!patient) throw new Error("Paciente nao encontrado");

      const [record] = await db
        .insert(scaleApplications)
        .values({
          patientId: input.patientId,
          userId,
          consultationId: input.consultationId ?? null,
          scaleType: input.scaleType,
          responses: encrypt(JSON.stringify(input.responses)),
          totalScore: input.totalScore,
          severity: input.severity,
          notes: input.notes ? encrypt(input.notes) : null,
        })
        .returning();

      await logAudit({
        userId,
        action: "APPLY_SCALE",
        resourceType: "scale_application",
        resourceId: record.id,
        ipAddress: getClientIP(ctx.req),
        details: `${input.scaleType.toUpperCase()} score: ${input.totalScore} (${input.severity})`,
      });

      return {
        id: record.id,
        totalScore: record.totalScore,
        severity: record.severity,
      };
    }),

  getScaleHistory: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        scaleType: z.enum(["phq9", "gad7", "bdi"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const conditions = [
        eq(scaleApplications.patientId, input.patientId),
        eq(scaleApplications.userId, userId),
      ];
      if (input.scaleType) {
        conditions.push(eq(scaleApplications.scaleType, input.scaleType));
      }

      const records = await db
        .select()
        .from(scaleApplications)
        .where(and(...conditions))
        .orderBy(desc(scaleApplications.appliedAt));

      return records.map((r) => ({
        id: r.id,
        scaleType: r.scaleType,
        totalScore: r.totalScore,
        severity: r.severity,
        appliedAt: r.appliedAt,
        consultationId: r.consultationId,
        notes: r.notes ? decrypt(r.notes) : null,
        responses: JSON.parse(decrypt(r.responses)),
      }));
    }),

  deleteScale: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [record] = await db
        .select()
        .from(scaleApplications)
        .where(
          and(
            eq(scaleApplications.id, input.id),
            eq(scaleApplications.userId, userId)
          )
        );
      if (!record) throw new Error("Registro nao encontrado");

      await db
        .delete(scaleApplications)
        .where(eq(scaleApplications.id, input.id));

      await logAudit({
        userId,
        action: "DELETE_SCALE",
        resourceType: "scale_application",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { success: true };
    }),

  // ─── Diagnósticos ─────────────────────────────────────────────────────

  addDiagnosis: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        code: z.string().min(1),
        system: z.enum(["cid10", "dsm5"]),
        description: z.string().min(1),
        status: z.enum(["active", "in_remission", "resolved"]).default("active"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, input.patientId), eq(patients.userId, userId)));
      if (!patient) throw new Error("Paciente nao encontrado");

      const [record] = await db
        .insert(patientDiagnoses)
        .values({
          patientId: input.patientId,
          userId,
          code: input.code,
          system: input.system,
          description: input.description,
          status: input.status,
          notes: input.notes ? encrypt(input.notes) : null,
        })
        .returning();

      await logAudit({
        userId,
        action: "ADD_DIAGNOSIS",
        resourceType: "patient_diagnosis",
        resourceId: record.id,
        ipAddress: getClientIP(ctx.req),
        details: `${input.system.toUpperCase()} ${input.code}: ${input.description}`,
      });

      return record;
    }),

  listDiagnoses: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const records = await db
        .select()
        .from(patientDiagnoses)
        .where(
          and(
            eq(patientDiagnoses.patientId, input.patientId),
            eq(patientDiagnoses.userId, userId)
          )
        )
        .orderBy(desc(patientDiagnoses.createdAt));

      return records.map((r) => ({
        ...r,
        notes: r.notes ? decrypt(r.notes) : null,
      }));
    }),

  updateDiagnosis: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["active", "in_remission", "resolved"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(patientDiagnoses)
        .where(
          and(
            eq(patientDiagnoses.id, input.id),
            eq(patientDiagnoses.userId, userId)
          )
        );
      if (!existing) throw new Error("Diagnostico nao encontrado");

      const updates: any = { updatedAt: new Date() };
      if (input.status) {
        updates.status = input.status;
        if (input.status === "resolved") updates.resolvedAt = new Date();
      }
      if (input.notes !== undefined) {
        updates.notes = input.notes ? encrypt(input.notes) : null;
      }

      await db
        .update(patientDiagnoses)
        .set(updates)
        .where(eq(patientDiagnoses.id, input.id));

      await logAudit({
        userId,
        action: "UPDATE_DIAGNOSIS",
        resourceType: "patient_diagnosis",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { success: true };
    }),

  deleteDiagnosis: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(patientDiagnoses)
        .where(
          and(
            eq(patientDiagnoses.id, input.id),
            eq(patientDiagnoses.userId, userId)
          )
        );
      if (!existing) throw new Error("Diagnostico nao encontrado");

      await db
        .delete(patientDiagnoses)
        .where(eq(patientDiagnoses.id, input.id));

      return { success: true };
    }),

  // ─── Plano Terapêutico / Metas ────────────────────────────────────────

  addGoal: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        targetDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, input.patientId), eq(patients.userId, userId)));
      if (!patient) throw new Error("Paciente nao encontrado");

      const [record] = await db
        .insert(treatmentGoals)
        .values({
          patientId: input.patientId,
          userId,
          title: encrypt(input.title),
          description: input.description ? encrypt(input.description) : null,
          priority: input.priority,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
        })
        .returning();

      await logAudit({
        userId,
        action: "ADD_TREATMENT_GOAL",
        resourceType: "treatment_goal",
        resourceId: record.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { id: record.id };
    }),

  listGoals: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const records = await db
        .select()
        .from(treatmentGoals)
        .where(
          and(
            eq(treatmentGoals.patientId, input.patientId),
            eq(treatmentGoals.userId, userId)
          )
        )
        .orderBy(desc(treatmentGoals.createdAt));

      return records.map((r) => ({
        ...r,
        title: decrypt(r.title),
        description: r.description ? decrypt(r.description) : null,
        notes: r.notes ? decrypt(r.notes) : null,
      }));
    }),

  updateGoal: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "achieved", "discontinued"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        targetDate: z.string().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(treatmentGoals)
        .where(
          and(
            eq(treatmentGoals.id, input.id),
            eq(treatmentGoals.userId, userId)
          )
        );
      if (!existing) throw new Error("Meta nao encontrada");

      const updates: any = { updatedAt: new Date() };
      if (input.title) updates.title = encrypt(input.title);
      if (input.description !== undefined)
        updates.description = input.description ? encrypt(input.description) : null;
      if (input.status) {
        updates.status = input.status;
        if (input.status === "achieved") updates.achievedAt = new Date();
      }
      if (input.priority) updates.priority = input.priority;
      if (input.targetDate !== undefined)
        updates.targetDate = input.targetDate ? new Date(input.targetDate) : null;
      if (input.notes !== undefined)
        updates.notes = input.notes ? encrypt(input.notes) : null;

      await db
        .update(treatmentGoals)
        .set(updates)
        .where(eq(treatmentGoals.id, input.id));

      await logAudit({
        userId,
        action: "UPDATE_TREATMENT_GOAL",
        resourceType: "treatment_goal",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { success: true };
    }),

  deleteGoal: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(treatmentGoals)
        .where(
          and(
            eq(treatmentGoals.id, input.id),
            eq(treatmentGoals.userId, userId)
          )
        );
      if (!existing) throw new Error("Meta nao encontrada");

      await db
        .delete(treatmentGoals)
        .where(eq(treatmentGoals.id, input.id));

      return { success: true };
    }),
});
