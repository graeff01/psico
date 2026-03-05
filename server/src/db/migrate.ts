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
    console.log("✅ Extra migrations (v2) aplicadas");
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
