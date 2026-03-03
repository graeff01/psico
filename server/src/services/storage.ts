import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { nanoid } from "nanoid";

let s3Client: S3Client | null = null;

export function isStorageConfigured(): boolean {
  return !!env.S3_ENDPOINT && !!env.S3_BUCKET && !!env.S3_ACCESS_KEY && !!env.S3_SECRET_KEY;
}

function getS3(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error("Storage S3 não configurado. Adicione S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY e S3_SECRET_KEY nas variáveis de ambiente.");
  }
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY!,
        secretAccessKey: env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export async function uploadAudio(
  buffer: Buffer,
  userId: number,
  consultationId: number,
  mimeType: string = "audio/webm"
): Promise<{ s3Key: string; size: number }> {
  const extension = mimeType === "audio/webm" ? "webm" : "mp3";
  const s3Key = `audio/${userId}/${consultationId}/${nanoid()}.${extension}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: "AES256",
    })
  );

  return { s3Key, size: buffer.length };
}

export async function getAudioUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
  });

  // URL válida por 1 hora
  return getSignedUrl(getS3(), command, { expiresIn: 3600 });
}

export async function getAudioBuffer(s3Key: string): Promise<Buffer> {
  const response = await getS3().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
    })
  );

  const stream = response.Body;
  if (!stream) throw new Error("Arquivo não encontrado no storage");

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteAudio(s3Key: string): Promise<void> {
  await getS3().send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
    })
  );
}

export async function uploadBackup(
  buffer: Buffer,
  userId: number,
  fileName: string
): Promise<{ s3Key: string; size: number }> {
  const s3Key = `backups/${userId}/${fileName}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: "application/octet-stream",
      ServerSideEncryption: "AES256",
    })
  );

  return { s3Key, size: buffer.length };
}
