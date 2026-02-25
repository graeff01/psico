import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adicionado unsafe-eval para alguns pacotes frontend
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"], // Permitir imagens de qualquer HTTPS (para avatares, etc)
      connectSrc: ["'self'", "https://api.openai.com", "https://*.railway.app"],
      mediaSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Desabilitado para evitar bloqueio de assets externos
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Aumentado para evitar falsos positivos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições. Tente novamente em 15 minutos.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Aumentado de 5 para 30
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Limite de mensagens com IA atingido. Tente novamente em 1 hora.",
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Limite de uploads atingido. Tente novamente em 1 hora.",
  },
});

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/api/health") {
      console.log(
        `${req.method} ${req.path} ${_res.statusCode} ${duration}ms`
      );
    }
  });
  next();
}
