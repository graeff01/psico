import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

function deriveKey(): Buffer {
  return crypto.pbkdf2Sync(
    Buffer.from(env.ENCRYPTION_KEY, "hex"),
    env.ENCRYPTION_SALT,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha512"
  );
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!cachedKey) {
    cachedKey = deriveKey();
  }
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de dados criptografados inválido");
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function hashSensitiveData(data: string): string {
  return crypto
    .createHmac("sha256", env.ENCRYPTION_SALT)
    .update(data)
    .digest("hex");
}

export function maskCPF(cpf: string): string {
  if (!cpf || cpf.length < 11) return "***.***.***-**";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.***-**`;
}

export function maskEmail(email: string): string {
  if (!email) return "***@***.***";
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return "(##) ####-####";
  return `(${phone.slice(0, 2)}) ****-${phone.slice(-4)}`;
}
