import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { db } from "../db/index.js";
import { env } from "../config/env.js";
import * as schema from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // atualiza a cada 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutos
    },
  },
  user: {
    additionalFields: {
      crp: { type: "string", required: false },
      specialty: { type: "string", required: false },
      phone: { type: "string", required: false },
      role: { type: "string", required: false, defaultValue: "psychologist" },
    },
  },
  plugins: [twoFactor()],
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    "http://localhost:5173",
  ],
});

export type Auth = typeof auth;
