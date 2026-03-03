import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  try {
    // Em dev: migrações estão em server/drizzle
    // Em produção (Docker): migrações estão em /app/server/drizzle
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    console.log(`🔄 Rodando migrations de: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log("✅ Migrations aplicadas com sucesso");
  } catch (error: any) {
    // Se o erro for "already exists", é seguro ignorar
    if (error.message?.includes("already exists")) {
      console.log("✅ Tabelas já existem, migrations ok");
      return;
    }
    console.error("❌ Erro ao rodar migrations:", error);
    throw error;
  }
}
