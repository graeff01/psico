import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";
import { pool } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dropAllTables() {
  const client = await pool.connect();
  try {
    // Dropar todas as tabelas com CASCADE (banco está vazio, safe)
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    // Dropar o journal do drizzle para migration rodar do zero
    await client.query(`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`);
    console.log("🗑️  Tabelas antigas removidas (schema reset)");
  } finally {
    client.release();
  }
}

async function applyExtraMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "anamnesis" text`);
    await client.query(`ALTER TABLE "ai_analyses" ADD COLUMN IF NOT EXISTS "risk_level" varchar(20) DEFAULT 'none'`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" serial PRIMARY KEY NOT NULL,
        "consultation_id" integer REFERENCES "consultations"("id") ON DELETE SET NULL,
        "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "amount" integer NOT NULL,
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "method" varchar(30),
        "notes" text,
        "receipt_number" varchar(50),
        "paid_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "payments_patient_id_idx" ON "payments" ("patient_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments" ("user_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "payments_paid_at_idx" ON "payments" ("paid_at")`);

    // v3: Prontuário de Evolução
    await client.query(`
      CREATE TABLE IF NOT EXISTS "evolution_records" (
        "id" serial PRIMARY KEY NOT NULL,
        "consultation_id" integer NOT NULL REFERENCES "consultations"("id") ON DELETE CASCADE,
        "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "session_number" integer,
        "session_objective" text,
        "techniques_used" text,
        "clinical_observations" text,
        "patient_mood" varchar(30),
        "progress_notes" text,
        "next_session_plan" text,
        "interventions" jsonb DEFAULT '[]',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "evolution_consultation_id_idx" ON "evolution_records" ("consultation_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "evolution_patient_id_idx" ON "evolution_records" ("patient_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "evolution_user_id_idx" ON "evolution_records" ("user_id")`);

    // v3: Escalas Clínicas
    await client.query(`
      CREATE TABLE IF NOT EXISTS "scale_applications" (
        "id" serial PRIMARY KEY NOT NULL,
        "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "consultation_id" integer REFERENCES "consultations"("id") ON DELETE SET NULL,
        "scale_type" varchar(20) NOT NULL,
        "responses" text NOT NULL,
        "total_score" integer NOT NULL,
        "severity" varchar(30) NOT NULL,
        "notes" text,
        "applied_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "scale_patient_id_idx" ON "scale_applications" ("patient_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "scale_type_idx" ON "scale_applications" ("scale_type")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "scale_applied_at_idx" ON "scale_applications" ("applied_at")`);

    // v3: Diagnósticos
    await client.query(`
      CREATE TABLE IF NOT EXISTS "patient_diagnoses" (
        "id" serial PRIMARY KEY NOT NULL,
        "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "code" varchar(20) NOT NULL,
        "system" varchar(10) NOT NULL,
        "description" text NOT NULL,
        "status" varchar(20) DEFAULT 'active' NOT NULL,
        "notes" text,
        "diagnosed_at" timestamp DEFAULT now() NOT NULL,
        "resolved_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "diagnosis_patient_id_idx" ON "patient_diagnoses" ("patient_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "diagnosis_code_idx" ON "patient_diagnoses" ("code")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "diagnosis_status_idx" ON "patient_diagnoses" ("status")`);

    // v3: Plano Terapêutico / Metas
    await client.query(`
      CREATE TABLE IF NOT EXISTS "treatment_goals" (
        "id" serial PRIMARY KEY NOT NULL,
        "patient_id" integer NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "description" text,
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "priority" varchar(10) DEFAULT 'medium' NOT NULL,
        "target_date" timestamp,
        "achieved_at" timestamp,
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "goals_patient_id_idx" ON "treatment_goals" ("patient_id")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "goals_status_idx" ON "treatment_goals" ("status")`);

    console.log("✅ Extra migrations (v3) aplicadas");
  } catch (err: any) {
    if (!err.message?.includes("already exists")) {
      console.warn("⚠️ Extra migrations warning:", err.message);
    }
  } finally {
    client.release();
  }
}

export async function runMigrations() {
  try {
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    console.log(`🔄 Rodando migrations de: ${migrationsFolder}`);

    try {
      await migrate(db, { migrationsFolder });
      console.log("✅ Migrations aplicadas com sucesso");
    } catch (error: any) {
      if (
        error.message?.includes("already exists") ||
        error.message?.includes("type") ||
        error.message?.includes("column") ||
        error.severity === "ERROR"
      ) {
        console.warn("⚠️  Conflito de schema detectado, recriando tabelas...");
        await dropAllTables();
        await migrate(db, { migrationsFolder });
        console.log("✅ Migrations aplicadas com sucesso (após reset)");
      } else {
        throw error;
      }
    }

    // Apply schema changes not tracked by drizzle journal
    await applyExtraMigrations();
  } catch (error) {
    console.error("❌ Erro ao rodar migrations:", error);
    throw error;
  }
}
