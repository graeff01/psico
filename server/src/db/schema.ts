import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  real,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Usuários (Psicólogos) ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  password: text("password"),
  crp: varchar("crp", { length: 20 }),
  specialty: varchar("specialty", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 20 }).default("psychologist").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better Auth: Sessions ─────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better Auth: Accounts ─────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better Auth: Verifications ────────────────────────────────────────

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Pacientes ─────────────────────────────────────────────────────────

export const patients = pgTable(
  "patients",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Dados criptografados (AES-256-GCM)
    name: text("name").notNull(), // encrypted
    cpf: text("cpf"), // encrypted
    email: text("email"), // encrypted
    phone: text("phone"), // encrypted
    birthDate: text("birth_date"), // encrypted
    address: text("address"), // encrypted

    // Dados clínicos (criptografados)
    clinicalHistory: text("clinical_history"), // encrypted
    mainComplaint: text("main_complaint"), // encrypted
    medications: text("medications"), // encrypted
    emergencyContact: text("emergency_contact"), // encrypted

    // Hashes para busca (não reversíveis)
    nameHash: varchar("name_hash", { length: 64 }),
    cpfHash: varchar("cpf_hash", { length: 64 }),
    emailHash: varchar("email_hash", { length: 64 }),

    // Anamnese estruturada (JSON criptografado)
    anamnesis: text("anamnesis"), // encrypted JSON

    // Metadados (não sensíveis)
    status: varchar("status", { length: 20 }).default("active").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    consentLGPD: boolean("consent_lgpd").default(false).notNull(),
    consentDate: timestamp("consent_date"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("patients_user_id_idx").on(table.userId),
    index("patients_name_hash_idx").on(table.nameHash),
    index("patients_cpf_hash_idx").on(table.cpfHash),
    index("patients_status_idx").on(table.status),
  ]
);

// ─── Consultas ─────────────────────────────────────────────────────────

export const consultations = pgTable(
  "consultations",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    date: timestamp("date").notNull(),
    duration: integer("duration"), // minutos
    notes: text("notes"), // encrypted
    status: varchar("status", { length: 20 }).default("scheduled").notNull(),
    // scheduled | in_progress | completed | cancelled

    tags: jsonb("tags").$type<string[]>().default([]),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("consultations_patient_id_idx").on(table.patientId),
    index("consultations_user_id_idx").on(table.userId),
    index("consultations_date_idx").on(table.date),
    index("consultations_status_idx").on(table.status),
  ]
);

// ─── Gravações de Áudio ────────────────────────────────────────────────

export const audioRecordings = pgTable(
  "audio_recordings",
  {
    id: serial("id").primaryKey(),
    consultationId: integer("consultation_id")
      .notNull()
      .references(() => consultations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    s3Key: text("s3_key").notNull(), // encrypted
    fileName: varchar("file_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }).default("audio/webm"),
    duration: integer("duration"), // segundos
    fileSize: integer("file_size"), // bytes

    status: varchar("status", { length: 20 }).default("uploaded").notNull(),
    // uploaded | transcribing | transcribed | error

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audio_consultation_id_idx").on(table.consultationId),
  ]
);

// ─── Transcrições ──────────────────────────────────────────────────────

export const transcriptions = pgTable("transcriptions", {
  id: serial("id").primaryKey(),
  audioRecordingId: integer("audio_recording_id")
    .notNull()
    .references(() => audioRecordings.id, { onDelete: "cascade" }),
  consultationId: integer("consultation_id")
    .notNull()
    .references(() => consultations.id, { onDelete: "cascade" }),

  text: text("text").notNull(), // encrypted
  language: varchar("language", { length: 10 }).default("pt"),
  confidence: real("confidence"),
  wordCount: integer("word_count"),
  processingTime: integer("processing_time"), // ms

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Resumos e Insights da IA ──────────────────────────────────────────

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: serial("id").primaryKey(),
    consultationId: integer("consultation_id")
      .notNull()
      .references(() => consultations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    type: varchar("type", { length: 30 }).notNull(),
    // summary | insights | progress | risk_assessment

    content: text("content").notNull(), // encrypted
    tags: jsonb("tags").$type<string[]>().default([]),
    model: varchar("model", { length: 50 }).default("gpt-4o"),
    tokensUsed: integer("tokens_used"),
    riskLevel: varchar("risk_level", { length: 20 }).default("none"),
    // none | low | medium | high | critical

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_analyses_consultation_id_idx").on(table.consultationId),
    index("ai_analyses_type_idx").on(table.type),
  ]
);

// ─── Chat com IA ───────────────────────────────────────────────────────

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    sessionId: varchar("session_id", { length: 100 }).notNull(),

    role: varchar("role", { length: 20 }).notNull(), // user | assistant
    content: text("content").notNull(), // encrypted
    contextUsed: jsonb("context_used").$type<string[]>().default([]),
    tokensUsed: integer("tokens_used"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_chat_user_id_idx").on(table.userId),
    index("ai_chat_session_id_idx").on(table.sessionId),
  ]
);

// ─── Consentimentos LGPD ───────────────────────────────────────────────

export const lgpdConsents = pgTable("lgpd_consents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  type: varchar("type", { length: 50 }).notNull(),
  // data_collection | processing | storage | ai_analysis | audio_recording
  description: text("description"),
  granted: boolean("granted").default(false).notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at"),
  ipAddress: varchar("ip_address", { length: 45 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Logs de Auditoria ─────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: integer("resource_id"),
    details: text("details"), // encrypted
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    result: varchar("result", { length: 20 }).default("success").notNull(),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// ─── Backups ───────────────────────────────────────────────────────────

export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  s3Key: text("s3_key").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"),
  type: varchar("type", { length: 20 }).default("full").notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// ─── Pagamentos ───────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    consultationId: integer("consultation_id").references(
      () => consultations.id,
      { onDelete: "set null" }
    ),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    amount: integer("amount").notNull(), // centavos (R$ 150,00 = 15000)
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    // pending | paid | cancelled | refunded
    method: varchar("method", { length: 30 }),
    // pix | cash | credit_card | debit_card | transfer | other
    notes: text("notes"), // encrypted
    receiptNumber: varchar("receipt_number", { length: 50 }),
    paidAt: timestamp("paid_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_patient_id_idx").on(table.patientId),
    index("payments_user_id_idx").on(table.userId),
    index("payments_status_idx").on(table.status),
    index("payments_paid_at_idx").on(table.paidAt),
  ]
);

// ─── Prontuário de Evolução ───────────────────────────────────────────

export const evolutionRecords = pgTable(
  "evolution_records",
  {
    id: serial("id").primaryKey(),
    consultationId: integer("consultation_id")
      .notNull()
      .references(() => consultations.id, { onDelete: "cascade" }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    sessionNumber: integer("session_number"),
    sessionObjective: text("session_objective"), // encrypted
    techniquesUsed: text("techniques_used"), // encrypted
    clinicalObservations: text("clinical_observations"), // encrypted
    patientMood: varchar("patient_mood", { length: 30 }),
    // calm | anxious | sad | angry | euphoric | apathetic | agitated | fearful | other
    progressNotes: text("progress_notes"), // encrypted
    nextSessionPlan: text("next_session_plan"), // encrypted
    interventions: jsonb("interventions").$type<string[]>().default([]),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("evolution_consultation_id_idx").on(table.consultationId),
    index("evolution_patient_id_idx").on(table.patientId),
    index("evolution_user_id_idx").on(table.userId),
  ]
);

// ─── Aplicação de Escalas Clínicas ───────────────────────────────────

export const scaleApplications = pgTable(
  "scale_applications",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    consultationId: integer("consultation_id").references(
      () => consultations.id,
      { onDelete: "set null" }
    ),

    scaleType: varchar("scale_type", { length: 20 }).notNull(),
    // phq9 | gad7 | bdi
    responses: text("responses").notNull(), // encrypted JSON
    totalScore: integer("total_score").notNull(),
    severity: varchar("severity", { length: 30 }).notNull(),
    // minimal | mild | moderate | moderately_severe | severe
    notes: text("notes"), // encrypted

    appliedAt: timestamp("applied_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scale_patient_id_idx").on(table.patientId),
    index("scale_type_idx").on(table.scaleType),
    index("scale_applied_at_idx").on(table.appliedAt),
  ]
);

// ─── Diagnósticos do Paciente ────────────────────────────────────────

export const patientDiagnoses = pgTable(
  "patient_diagnoses",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    code: varchar("code", { length: 20 }).notNull(), // F41.1, F32.0, etc.
    system: varchar("system", { length: 10 }).notNull(), // cid10 | dsm5
    description: text("description").notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    // active | in_remission | resolved
    notes: text("notes"), // encrypted

    diagnosedAt: timestamp("diagnosed_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("diagnosis_patient_id_idx").on(table.patientId),
    index("diagnosis_code_idx").on(table.code),
    index("diagnosis_status_idx").on(table.status),
  ]
);

// ─── Plano Terapêutico / Metas ──────────────────────────────────────

export const treatmentGoals = pgTable(
  "treatment_goals",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(), // encrypted
    description: text("description"), // encrypted
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    // pending | in_progress | achieved | discontinued
    priority: varchar("priority", { length: 10 }).default("medium").notNull(),
    // low | medium | high
    targetDate: timestamp("target_date"),
    achievedAt: timestamp("achieved_at"),
    notes: text("notes"), // encrypted

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("goals_patient_id_idx").on(table.patientId),
    index("goals_status_idx").on(table.status),
  ]
);

// ─── Relations ─────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  consultations: many(consultations),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  aiChatMessages: many(aiChatMessages),
  backups: many(backups),
  payments: many(payments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  consultations: many(consultations),
  lgpdConsents: many(lgpdConsents),
  aiChatMessages: many(aiChatMessages),
  payments: many(payments),
  evolutionRecords: many(evolutionRecords),
  scaleApplications: many(scaleApplications),
  diagnoses: many(patientDiagnoses),
  treatmentGoals: many(treatmentGoals),
}));

export const consultationsRelations = relations(
  consultations,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [consultations.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [consultations.userId],
      references: [users.id],
    }),
    audioRecordings: many(audioRecordings),
    transcriptions: many(transcriptions),
    aiAnalyses: many(aiAnalyses),
    payments: many(payments),
    evolutionRecords: many(evolutionRecords),
    scaleApplications: many(scaleApplications),
  })
);

export const audioRecordingsRelations = relations(
  audioRecordings,
  ({ one, many }) => ({
    consultation: one(consultations, {
      fields: [audioRecordings.consultationId],
      references: [consultations.id],
    }),
    user: one(users, {
      fields: [audioRecordings.userId],
      references: [users.id],
    }),
    transcriptions: many(transcriptions),
  })
);

export const transcriptionsRelations = relations(
  transcriptions,
  ({ one }) => ({
    audioRecording: one(audioRecordings, {
      fields: [transcriptions.audioRecordingId],
      references: [audioRecordings.id],
    }),
    consultation: one(consultations, {
      fields: [transcriptions.consultationId],
      references: [consultations.id],
    }),
  })
);

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  consultation: one(consultations, {
    fields: [aiAnalyses.consultationId],
    references: [consultations.id],
  }),
  user: one(users, {
    fields: [aiAnalyses.userId],
    references: [users.id],
  }),
}));

export const aiChatMessagesRelations = relations(
  aiChatMessages,
  ({ one }) => ({
    user: one(users, {
      fields: [aiChatMessages.userId],
      references: [users.id],
    }),
    patient: one(patients, {
      fields: [aiChatMessages.patientId],
      references: [patients.id],
    }),
  })
);

export const lgpdConsentsRelations = relations(lgpdConsents, ({ one }) => ({
  patient: one(patients, {
    fields: [lgpdConsents.patientId],
    references: [patients.id],
  }),
  user: one(users, {
    fields: [lgpdConsents.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  consultation: one(consultations, {
    fields: [payments.consultationId],
    references: [consultations.id],
  }),
  patient: one(patients, {
    fields: [payments.patientId],
    references: [patients.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const evolutionRecordsRelations = relations(
  evolutionRecords,
  ({ one }) => ({
    consultation: one(consultations, {
      fields: [evolutionRecords.consultationId],
      references: [consultations.id],
    }),
    patient: one(patients, {
      fields: [evolutionRecords.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [evolutionRecords.userId],
      references: [users.id],
    }),
  })
);

export const scaleApplicationsRelations = relations(
  scaleApplications,
  ({ one }) => ({
    patient: one(patients, {
      fields: [scaleApplications.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [scaleApplications.userId],
      references: [users.id],
    }),
    consultation: one(consultations, {
      fields: [scaleApplications.consultationId],
      references: [consultations.id],
    }),
  })
);

export const patientDiagnosesRelations = relations(
  patientDiagnoses,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientDiagnoses.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [patientDiagnoses.userId],
      references: [users.id],
    }),
  })
);

export const treatmentGoalsRelations = relations(
  treatmentGoals,
  ({ one }) => ({
    patient: one(patients, {
      fields: [treatmentGoals.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [treatmentGoals.userId],
      references: [users.id],
    }),
  })
);
