import { z } from "zod";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import { patients, consultations, lgpdConsents } from "../db/schema.js";
import { encrypt, decrypt, hashSensitiveData } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";

const patientInput = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  clinicalHistory: z.string().optional(),
  mainComplaint: z.string().optional(),
  medications: z.string().optional(),
  emergencyContact: z.string().optional(),
  tags: z.array(z.string()).optional(),
  consentLGPD: z.boolean().default(false),
});

function encryptPatientData(data: z.infer<typeof patientInput>) {
  return {
    name: encrypt(data.name),
    cpf: data.cpf ? encrypt(data.cpf) : null,
    email: data.email ? encrypt(data.email) : null,
    phone: data.phone ? encrypt(data.phone) : null,
    birthDate: data.birthDate ? encrypt(data.birthDate) : null,
    address: data.address ? encrypt(data.address) : null,
    clinicalHistory: data.clinicalHistory ? encrypt(data.clinicalHistory) : null,
    mainComplaint: data.mainComplaint ? encrypt(data.mainComplaint) : null,
    medications: data.medications ? encrypt(data.medications) : null,
    emergencyContact: data.emergencyContact ? encrypt(data.emergencyContact) : null,
    nameHash: hashSensitiveData(data.name.toLowerCase()),
    cpfHash: data.cpf ? hashSensitiveData(data.cpf.replace(/\D/g, "")) : null,
    emailHash: data.email ? hashSensitiveData(data.email.toLowerCase()) : null,
    tags: data.tags ?? [],
    consentLGPD: data.consentLGPD,
    consentDate: data.consentLGPD ? new Date() : null,
  };
}

function decryptPatient(patient: typeof patients.$inferSelect) {
  return {
    id: patient.id,
    name: decrypt(patient.name),
    cpf: patient.cpf ? decrypt(patient.cpf) : null,
    email: patient.email ? decrypt(patient.email) : null,
    phone: patient.phone ? decrypt(patient.phone) : null,
    birthDate: patient.birthDate ? decrypt(patient.birthDate) : null,
    address: patient.address ? decrypt(patient.address) : null,
    clinicalHistory: patient.clinicalHistory ? decrypt(patient.clinicalHistory) : null,
    mainComplaint: patient.mainComplaint ? decrypt(patient.mainComplaint) : null,
    medications: patient.medications ? decrypt(patient.medications) : null,
    emergencyContact: patient.emergencyContact ? decrypt(patient.emergencyContact) : null,
    tags: patient.tags as string[],
    status: patient.status,
    consentLGPD: patient.consentLGPD,
    consentDate: patient.consentDate,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

export const patientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "all"]).optional().default("all"),
        tags: z.array(z.string()).optional(),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);
      const { search, status, tags, page, limit } = input ?? {
        search: undefined,
        status: "all" as const,
        tags: undefined,
        page: 1,
        limit: 20,
      };
      const offset = (page - 1) * limit;

      const conditions = [eq(patients.userId, userId)];

      if (status && status !== "all") {
        conditions.push(eq(patients.status, status));
      }

      const allPatients = await db
        .select()
        .from(patients)
        .where(and(...conditions))
        .orderBy(desc(patients.updatedAt))
        .limit(limit)
        .offset(offset);

      let decrypted = allPatients.map(decryptPatient);

      // Filtro de busca client-side (dados são criptografados)
      if (search) {
        const searchLower = search.toLowerCase();
        decrypted = decrypted.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower) ||
            p.cpf?.includes(search)
        );
      }

      // Filtro por tags
      if (tags && tags.length > 0) {
        decrypted = decrypted.filter((p) =>
          tags.some((tag) => p.tags.includes(tag))
        );
      }

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(and(...conditions));

      await logAudit({
        userId,
        action: "LIST_PATIENTS",
        resourceType: "patient",
        ipAddress: getClientIP(ctx.req),
        details: `Listou pacientes (página ${page})`,
      });

      return {
        patients: decrypted,
        total: Number(countResult.count),
        page,
        totalPages: Math.ceil(Number(countResult.count) / limit),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [patient] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.id, input.id), eq(patients.userId, userId)));

      if (!patient) {
        throw new Error("Paciente não encontrado");
      }

      // Buscar consultas do paciente
      const patientConsultations = await db
        .select()
        .from(consultations)
        .where(eq(consultations.patientId, input.id))
        .orderBy(desc(consultations.date));

      await logAudit({
        userId,
        action: "VIEW_PATIENT",
        resourceType: "patient",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return {
        ...decryptPatient(patient),
        consultations: patientConsultations,
      };
    }),

  create: protectedProcedure
    .input(patientInput)
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);
      const encrypted = encryptPatientData(input);

      const [newPatient] = await db
        .insert(patients)
        .values({
          userId,
          ...encrypted,
        })
        .returning();

      // Registrar consentimento LGPD se concedido
      if (input.consentLGPD) {
        await db.insert(lgpdConsents).values({
          patientId: newPatient.id,
          userId,
          type: "data_collection",
          granted: true,
          grantedAt: new Date(),
          ipAddress: getClientIP(ctx.req),
        });
      }

      await logAudit({
        userId,
        action: "CREATE_PATIENT",
        resourceType: "patient",
        resourceId: newPatient.id,
        ipAddress: getClientIP(ctx.req),
        details: "Novo paciente cadastrado",
      });

      return decryptPatient(newPatient);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: patientInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      // Verificar propriedade
      const [existing] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.id, input.id), eq(patients.userId, userId)));

      if (!existing) {
        throw new Error("Paciente não encontrado");
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (input.data.name !== undefined) {
        updateData.name = encrypt(input.data.name);
        updateData.nameHash = hashSensitiveData(input.data.name.toLowerCase());
      }
      if (input.data.cpf !== undefined) {
        updateData.cpf = encrypt(input.data.cpf);
        updateData.cpfHash = hashSensitiveData(input.data.cpf.replace(/\D/g, ""));
      }
      if (input.data.email !== undefined) {
        updateData.email = input.data.email ? encrypt(input.data.email) : null;
        updateData.emailHash = input.data.email
          ? hashSensitiveData(input.data.email.toLowerCase())
          : null;
      }
      if (input.data.phone !== undefined)
        updateData.phone = input.data.phone ? encrypt(input.data.phone) : null;
      if (input.data.birthDate !== undefined)
        updateData.birthDate = input.data.birthDate ? encrypt(input.data.birthDate) : null;
      if (input.data.address !== undefined)
        updateData.address = input.data.address ? encrypt(input.data.address) : null;
      if (input.data.clinicalHistory !== undefined)
        updateData.clinicalHistory = input.data.clinicalHistory ? encrypt(input.data.clinicalHistory) : null;
      if (input.data.mainComplaint !== undefined)
        updateData.mainComplaint = input.data.mainComplaint ? encrypt(input.data.mainComplaint) : null;
      if (input.data.medications !== undefined)
        updateData.medications = input.data.medications ? encrypt(input.data.medications) : null;
      if (input.data.emergencyContact !== undefined)
        updateData.emergencyContact = input.data.emergencyContact ? encrypt(input.data.emergencyContact) : null;
      if (input.data.tags !== undefined)
        updateData.tags = input.data.tags;
      if (input.data.consentLGPD !== undefined)
        updateData.consentLGPD = input.data.consentLGPD;

      const [updated] = await db
        .update(patients)
        .set(updateData)
        .where(eq(patients.id, input.id))
        .returning();

      await logAudit({
        userId,
        action: "UPDATE_PATIENT",
        resourceType: "patient",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
        details: `Campos atualizados: ${Object.keys(input.data).join(", ")}`,
      });

      return decryptPatient(updated);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.user.id);

      const [existing] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.id, input.id), eq(patients.userId, userId)));

      if (!existing) {
        throw new Error("Paciente não encontrado");
      }

      await db.delete(patients).where(eq(patients.id, input.id));

      await logAudit({
        userId,
        action: "DELETE_PATIENT",
        resourceType: "patient",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
        details: "Paciente excluído permanentemente (LGPD)",
      });

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.user.id);

    const [totalPatients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.userId, userId));

    const [activePatients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(
        and(eq(patients.userId, userId), eq(patients.status, "active"))
      );

    const [totalConsultations] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(eq(consultations.userId, userId));

    const [completedConsultations] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(
        and(
          eq(consultations.userId, userId),
          eq(consultations.status, "completed")
        )
      );

    return {
      totalPatients: Number(totalPatients.count),
      activePatients: Number(activePatients.count),
      totalConsultations: Number(totalConsultations.count),
      completedConsultations: Number(completedConsultations.count),
    };
  }),
});
