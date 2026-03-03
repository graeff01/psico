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

export async function runMigrations() {
  try {
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    console.log(`🔄 Rodando migrations de: ${migrationsFolder}`);

    try {
      await migrate(db, { migrationsFolder });
      console.log("✅ Migrations aplicadas com sucesso");
    } catch (error: any) {
      // Se der conflito de schema (tipo errado, tabela já existe com schema diferente),
      // dropar tudo e tentar novamente (só funciona enquanto não há dados reais)
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
  } catch (error) {
    console.error("❌ Erro ao rodar migrations:", error);
    throw error;
  }
}
