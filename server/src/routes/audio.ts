import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import { audioRecordings, consultations } from "../db/schema.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";
import { uploadAudio, getAudioUrl, deleteAudio } from "../services/storage.js";

export const audioRouter = router({
  // Upload de áudio via base64 (gravado no browser)
  upload: protectedProcedure
    .input(
      z.object({
        consultationId: z.number(),
        audioData: z.string(), // base64
        fileName: z.string().default("recording.webm"),
        mimeType: z.string().default("audio/webm"),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verificar propriedade da consulta
      const [consultation] = await db
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.id, input.consultationId),
            eq(consultations.userId, userId)
          )
        );

      if (!consultation) throw new Error("Consulta não encontrada");

      // Converter base64 para buffer
      const buffer = Buffer.from(input.audioData, "base64");

      // Validar tamanho (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new Error("Arquivo de áudio muito grande (máximo 500MB)");
      }

      // Upload para S3
      const { s3Key, size } = await uploadAudio(
        buffer,
        userId,
        input.consultationId,
        input.mimeType
      );

      // Salvar referência no banco
      const [recording] = await db
        .insert(audioRecordings)
        .values({
          consultationId: input.consultationId,
          userId,
          s3Key: encrypt(s3Key),
          fileName: input.fileName,
          mimeType: input.mimeType,
          duration: input.duration,
          fileSize: size,
          status: "uploaded",
        })
        .returning();

      // Atualizar status da consulta
      await db
        .update(consultations)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(consultations.id, input.consultationId));

      await logAudit({
        userId,
        action: "UPLOAD_AUDIO",
        resourceType: "audio_recording",
        resourceId: recording.id,
        ipAddress: getClientIP(ctx.req),
        details: `Upload de áudio: ${input.fileName} (${(size / 1024 / 1024).toFixed(2)}MB)`,
      });

      return {
        id: recording.id,
        fileName: recording.fileName,
        duration: recording.duration,
        fileSize: recording.fileSize,
        status: recording.status,
      };
    }),

  // Obter URL para reprodução
  getPlaybackUrl: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [recording] = await db
        .select()
        .from(audioRecordings)
        .where(
          and(
            eq(audioRecordings.id, input.id),
            eq(audioRecordings.userId, userId)
          )
        );

      if (!recording) throw new Error("Gravação não encontrada");

      const s3Key = decrypt(recording.s3Key);
      const url = await getAudioUrl(s3Key);

      return { url, duration: recording.duration };
    }),

  // Listar gravações de uma consulta
  listByConsultation: protectedProcedure
    .input(z.object({ consultationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const recordings = await db
        .select()
        .from(audioRecordings)
        .where(
          and(
            eq(audioRecordings.consultationId, input.consultationId),
            eq(audioRecordings.userId, userId)
          )
        );

      return recordings.map((r) => ({
        id: r.id,
        fileName: r.fileName,
        mimeType: r.mimeType,
        duration: r.duration,
        fileSize: r.fileSize,
        status: r.status,
        createdAt: r.createdAt,
      }));
    }),

  // Deletar gravação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [recording] = await db
        .select()
        .from(audioRecordings)
        .where(
          and(
            eq(audioRecordings.id, input.id),
            eq(audioRecordings.userId, userId)
          )
        );

      if (!recording) throw new Error("Gravação não encontrada");

      // Deletar do S3
      const s3Key = decrypt(recording.s3Key);
      await deleteAudio(s3Key);

      // Deletar do banco
      await db
        .delete(audioRecordings)
        .where(eq(audioRecordings.id, input.id));

      await logAudit({
        userId,
        action: "DELETE_AUDIO",
        resourceType: "audio_recording",
        resourceId: input.id,
        ipAddress: getClientIP(ctx.req),
      });

      return { success: true };
    }),
});
