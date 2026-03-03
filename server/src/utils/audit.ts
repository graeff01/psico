import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
import { encrypt } from "./encryption.js";

interface AuditEntry {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: number;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  result?: "success" | "failure" | "denied";
  errorMessage?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      details: entry.details ? encrypt(entry.details) : null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      result: entry.result ?? "success",
      errorMessage: entry.errorMessage ?? null,
    });
  } catch (error) {
    console.error("❌ Erro ao registrar log de auditoria:", error);
  }
}

export function getClientIP(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || "unknown";
}
