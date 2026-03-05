import { z } from "zod";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import { payments, patients } from "../db/schema.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";

export const paymentsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          patientId: z.number().optional(),
          status: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { patientId, status, startDate, endDate, page, limit } = input ?? {
        page: 1,
        limit: 50,
      };
      const offset = ((page ?? 1) - 1) * (limit ?? 50);

      const conditions = [eq(payments.userId, userId)];
      if (patientId) conditions.push(eq(payments.patientId, patientId));
      if (status) conditions.push(eq(payments.status, status));
      if (startDate)
        conditions.push(gte(payments.createdAt, new Date(startDate)));
      if (endDate)
        conditions.push(lte(payments.createdAt, new Date(endDate)));

      const results = await db
        .select({
          payment: payments,
          patientName: patients.name,
        })
        .from(payments)
        .innerJoin(patients, eq(payments.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt))
        .limit(limit ?? 50)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(and(...conditions));

      return {
        payments: results.map((r) => ({
          ...r.payment,
          notes: r.payment.notes ? decrypt(r.payment.notes) : null,
          patientName: decrypt(r.patientName),
        })),
        total: Number(countResult.count),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        consultationId: z.number().optional(),
        amount: z.number().min(1),
        status: z
          .enum(["pending", "paid", "cancelled", "refunded"])
          .default("pending"),
        method: z
          .enum([
            "pix",
            "cash",
            "credit_card",
            "debit_card",
            "transfer",
            "other",
          ])
          .optional(),
        notes: z.string().optional(),
        paidAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verificar propriedade do paciente
      const [patient] = await db
        .select()
        .from(patients)
        .where(
          and(eq(patients.id, input.patientId), eq(patients.userId, userId))
        );
      if (!patient) throw new Error("Paciente não encontrado");

      const [payment] = await db
        .insert(payments)
        .values({
          patientId: input.patientId,
          consultationId: input.consultationId ?? null,
          userId,
          amount: input.amount,
          status: input.status,
          method: input.method ?? null,
          notes: input.notes ? encrypt(input.notes) : null,
          paidAt: input.paidAt ? new Date(input.paidAt) : null,
        })
        .returning();

      await logAudit({
        userId,
        action: "CREATE_PAYMENT",
        resourceType: "payment",
        resourceId: payment.id,
        ipAddress: getClientIP(ctx.req),
        details: `Pagamento R$ ${(input.amount / 100).toFixed(2)}`,
      });

      return payment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          amount: z.number().min(1).optional(),
          status: z
            .enum(["pending", "paid", "cancelled", "refunded"])
            .optional(),
          method: z
            .enum([
              "pix",
              "cash",
              "credit_card",
              "debit_card",
              "transfer",
              "other",
            ])
            .optional(),
          notes: z.string().optional(),
          paidAt: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(payments)
        .where(
          and(eq(payments.id, input.id), eq(payments.userId, userId))
        );
      if (!existing) throw new Error("Pagamento não encontrado");

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.data.amount !== undefined) updateData.amount = input.data.amount;
      if (input.data.status !== undefined) updateData.status = input.data.status;
      if (input.data.method !== undefined) updateData.method = input.data.method;
      if (input.data.notes !== undefined)
        updateData.notes = input.data.notes ? encrypt(input.data.notes) : null;
      if (input.data.paidAt !== undefined)
        updateData.paidAt = input.data.paidAt
          ? new Date(input.data.paidAt)
          : null;

      const [updated] = await db
        .update(payments)
        .set(updateData)
        .where(eq(payments.id, input.id))
        .returning();

      await logAudit({
        userId,
        action: "UPDATE_PAYMENT",
        resourceType: "payment",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [existing] = await db
        .select()
        .from(payments)
        .where(
          and(eq(payments.id, input.id), eq(payments.userId, userId))
        );
      if (!existing) throw new Error("Pagamento não encontrado");

      await db.delete(payments).where(eq(payments.id, input.id));

      await logAudit({
        userId,
        action: "DELETE_PAYMENT",
        resourceType: "payment",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { success: true };
    }),

  getMonthlyReport: protectedProcedure
    .input(
      z
        .object({
          month: z.number().min(1).max(12).optional(),
          year: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const now = new Date();
      const month = input?.month ?? now.getMonth() + 1;
      const year = input?.year ?? now.getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const monthPayments = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.userId, userId),
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate)
          )
        );

      const totalReceived = monthPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPending = monthPayments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0);

      const byMethod = monthPayments
        .filter((p) => p.status === "paid")
        .reduce(
          (acc, p) => {
            const method = p.method || "other";
            acc[method] = (acc[method] || 0) + p.amount;
            return acc;
          },
          {} as Record<string, number>
        );

      return {
        month,
        year,
        totalReceived,
        totalPending,
        totalPayments: monthPayments.length,
        paidCount: monthPayments.filter((p) => p.status === "paid").length,
        pendingCount: monthPayments.filter((p) => p.status === "pending").length,
        byMethod: Object.entries(byMethod).map(([method, amount]) => ({
          method,
          amount,
        })),
      };
    }),
});
