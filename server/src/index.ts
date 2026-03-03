import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import { createContext } from "./trpc/index.js";
import { appRouter } from "./routes/index.js";
import { auth } from "./auth/index.js";
import {
  securityHeaders,
  generalLimiter,
  authLimiter,
  requestLogger,
} from "./middleware/security.js";
import { runMigrations } from "./db/migrate.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Trust proxy (Railway, Heroku, etc.) ────────────────────────────────
app.set("trust proxy", 1);

// ─── Segurança ─────────────────────────────────────────────────────────
app.use(securityHeaders);
app.use(requestLogger);
app.use(generalLimiter);

// ─── CORS ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.NODE_ENV === "production"
      ? env.BETTER_AUTH_URL
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// ─── Body parser ───────────────────────────────────────────────────────
app.use(express.json({ limit: "500mb" })); // Para upload de áudios em base64
app.use(express.urlencoded({ extended: true }));

// ─── Health check ──────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "PsicoIA Manager",
  });
});

// ─── Better Auth ───────────────────────────────────────────────────────
app.all("/api/auth/*splat", authLimiter, toNodeHandler(auth));

// ─── tRPC ──────────────────────────────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`❌ tRPC error on ${path}:`, error.message);
    },
  })
);

// ─── Servir frontend em produção ───────────────────────────────────────
if (env.NODE_ENV === "production") {
  // No Docker: __dirname = /app/server/dist -> clientDist = /app/client/dist
  const clientDist = path.resolve(__dirname, "../../client/dist");
  console.log(`📁 Serving static files from: ${clientDist}`);

  app.use(express.static(clientDist));

  // SPA fallback — todas as rotas que NÃO são /api vão pro index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    const indexPath = path.join(clientDist, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("❌ Erro ao servir index.html:", err);
        res.status(500).send("Erro interno do servidor");
      }
    });
  });
}

// ─── Start ─────────────────────────────────────────────────────────────
async function start() {
  // Rodar migrations automaticamente
  await runMigrations();

  app.listen(env.PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║         PsicoIA Manager v1.0.0            ║
  ║─────────────────────────────────────────  ║
  ║  🔒 Segurança: AES-256-GCM + TLS 1.3     ║
  ║  🤖 IA: GPT-4o + Whisper                  ║
  ║  📊 Servidor rodando na porta ${env.PORT}       ║
  ║  🌍 Ambiente: ${env.NODE_ENV.padEnd(25)}  ║
  ╚═══════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error("❌ Falha ao iniciar servidor:", err);
  process.exit(1);
});

export { app, appRouter };
