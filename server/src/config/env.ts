import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  ENCRYPTION_KEY: z.string().min(64),
  ENCRYPTION_SALT: z.string().min(16),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  OPENAI_API_KEY: z.string().startsWith("sk-"),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    if (process.env.NODE_ENV === "production") {
      console.error(`\n❌ Variáveis de ambiente inválidas:\n${missing}\n`);
      process.exit(1);
    }

    console.warn(`\n⚠️  Variáveis de ambiente faltando (dev mode):\n${missing}\n`);

    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/psicoia",
      PORT: process.env.PORT || 3000,
      NODE_ENV: process.env.NODE_ENV || "development",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "0".repeat(64),
      ENCRYPTION_SALT: process.env.ENCRYPTION_SALT || "dev-salt-minimum-16",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "dev-secret-must-be-at-least-32-chars!!",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "sk-dev-placeholder",
      S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9000",
      S3_REGION: process.env.S3_REGION || "us-east-1",
      S3_BUCKET: process.env.S3_BUCKET || "psicoia-dev",
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "minioadmin",
      S3_SECRET_KEY: process.env.S3_SECRET_KEY || "minioadmin",
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
    });
  }

  return parsed.data;
}

export const env = validateEnv();
