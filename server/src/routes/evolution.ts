import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import { evolutionRecords, consultations, patients } from "../db/schema.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";

const ENCRYPTED_FIELDS = [
  "sessionObjective",
  "techniquesUsed",
  "clinicalObservations",
  "progressNotes",
  "nextSessionPlan",
] as const;

export const evolutionRouter = router({
  // Get evolution record for a consultation
  getByConsultation: protectedProcedure
    .input(z.object({ consultationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [record] = await db
        .select()
        .from(evolutionRecords)
        .where(
          and(
            eq(evolutionRecords.consultationId, input.consultationId),
            eq(evolutionRecords.userId, userId)
          )
        );

      if (!record) return null;

      const decrypted: any = { ...record };
      for (const field of ENCRYPTED_FIELDS) {
        if (decrypted[field]) {
          try {
            decrypted[field] = decrypt(decrypted[field]);
          } catch {
            decrypted[field] = "";
          }
        }
      }
      return decrypted;
    }),

  // Save or update evolution record
  save: protectedProcedure
    .input(
      z.object({
        consultationId: z.number(),
        sessionNumber: z.number().optional(),
        sessionObjective: z.string().optional(),
        techniquesUsed: z.string().optional(),
        clinicalObservations: z.string().optional(),
        patientMood: z.string().optional(),
        progressNotes: z.string().optional(),
        nextSessionPlan: z.string().optional(),
        interventions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify consultation ownership
      const [consultation] = await db
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.id, input.consultationId),
            eq(consultations.userId, userId)
          )
        );
      if (!consultation) throw new Error("Consulta nao encontrada");

      // Encrypt fields
      const data: any = {
        consultationId: input.consultationId,
        patientId: consultation.patientId,
        userId,
        sessionNumber: input.sessionNumber,
        patientMood: input.patientMood,
        interventions: input.interventions ?? [],
        updatedAt: new Date(),
      };

      for (const field of ENCRYPTED_FIELDS) {
        if (input[field] !== undefined) {
          data[field] = input[field] ? encrypt(input[field]) : null;
        }
      }

      // Upsert
      const [existing] = await db
        .select({ id: evolutionRecords.id })
        .from(evolutionRecords)
        .where(
          and(
            eq(evolutionRecords.consultationId, input.consultationId),
            eq(evolutionRecords.userId, userId)
          )
        );

      let record;
      if (existing) {
        [record] = await db
          .update(evolutionRecords)
          .set(data)
          .where(eq(evolutionRecords.id, existing.id))
          .returning();
      } else {
        [record] = await db
          .insert(evolutionRecords)
          .values(data)
          .returning();
      }

      await logAudit({
        userId,
        action: existing ? "UPDATE_EVOLUTION" : "CREATE_EVOLUTION",
        resourceType: "evolution_record",
        resourceId: record.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { id: record.id, saved: true };
    }),

  // List all evolution records for a patient
  listByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const records = await db
        .select()
        .from(evolutionRecords)
        .where(
          and(
            eq(evolutionRecords.patientId, input.patientId),
            eq(evolutionRecords.userId, userId)
          )
        )
        .orderBy(desc(evolutionRecords.createdAt));

      return records.map((r) => {
        const decrypted: any = { ...r };
        for (const field of ENCRYPTED_FIELDS) {
          if (decrypted[field]) {
            try {
              decrypted[field] = decrypt(decrypted[field]);
            } catch {
              decrypted[field] = "";
            }
          }
        }
        return decrypted;
      });
    }),
});
