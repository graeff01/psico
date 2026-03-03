import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  ENCRYPTION_KEY: z.string().min(64),
  ENCRYPTION_SALT: z.string().min(16),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Opcionais para MVP — funcionalidades de IA/áudio desabilitadas se ausentes
  OPENAI_API_KEY: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    console.warn(`\n⚠️  Variáveis de ambiente com problemas:\n${missing}\n`);

    // Em produção, só falha se DATABASE_URL ou chaves de criptografia estão ausentes
    if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || !process.env.ENCRYPTION_KEY)) {
      console.error(`\n❌ DATABASE_URL e ENCRYPTION_KEY são obrigatórios em produção\n`);
      process.exit(1);
    }

    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/psicoia",
      PORT: process.env.PORT || 3000,
      NODE_ENV: process.env.NODE_ENV || "development",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "0".repeat(64),
      ENCRYPTION_SALT: process.env.ENCRYPTION_SALT || "dev-salt-minimum-16",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "dev-secret-must-be-at-least-32-chars!!",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
      S3_ENDPOINT: process.env.S3_ENDPOINT || undefined,
      S3_REGION: process.env.S3_REGION || "us-east-1",
      S3_BUCKET: process.env.S3_BUCKET || undefined,
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || undefined,
      S3_SECRET_KEY: process.env.S3_SECRET_KEY || undefined,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
    });
  }

  return parsed.data;
}

export const env = validateEnv();
