import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index.js";
import { db } from "../db/index.js";
import {
  patients,
  consultations,
  transcriptions,
  aiAnalyses,
  aiChatMessages,
  audioRecordings,
} from "../db/schema.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import { logAudit, getClientIP } from "../utils/audit.js";
import {
  transcribeAudio,
  generateClinicalSummary,
  sendContextualMessage,
  isOpenAIConfigured,
} from "../services/openai.js";
import { getAudioBuffer, isStorageConfigured } from "../services/storage.js";
import { nanoid } from "nanoid";

export const aiRouter = router({
  // ─── Transcrever áudio de uma consulta ────────────────────────────────
  transcribe: protectedProcedure
    .input(z.object({ audioRecordingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!isOpenAIConfigured()) {
        throw new Error("IA nao configurada. Adicione a OPENAI_API_KEY nas variaveis de ambiente do Railway para usar transcricao e analise.");
      }
      if (!isStorageConfigured()) {
        throw new Error("Storage S3 nao configurado. Adicione as variaveis S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY e S3_SECRET_KEY no Railway para usar transcricao.");
      }

      const userId = ctx.user.id;

      // Buscar áudio
      const [audio] = await db
        .select()
        .from(audioRecordings)
        .where(
          and(
            eq(audioRecordings.id, input.audioRecordingId),
            eq(audioRecordings.userId, userId)
          )
        );

      if (!audio) throw new Error("Gravação não encontrada");

      // Atualizar status
      await db
        .update(audioRecordings)
        .set({ status: "transcribing" })
        .where(eq(audioRecordings.id, audio.id));

      try {
        // Baixar áudio do S3
        const s3Key = decrypt(audio.s3Key);
        const audioBuffer = await getAudioBuffer(s3Key);

        // Transcrever com Whisper
        const startTime = Date.now();
        const result = await transcribeAudio(
          audioBuffer,
          audio.fileName || "audio.webm"
        );
        const processingTime = Date.now() - startTime;

        // Salvar transcrição criptografada
        const [transcription] = await db
          .insert(transcriptions)
          .values({
            audioRecordingId: audio.id,
            consultationId: audio.consultationId,
            text: encrypt(result.text),
            language: result.language,
            confidence: 0.95,
            wordCount: result.text.split(/\s+/).length,
            processingTime,
          })
          .returning();

        // Atualizar status do áudio
        await db
          .update(audioRecordings)
          .set({ status: "transcribed" })
          .where(eq(audioRecordings.id, audio.id));

        await logAudit({
          userId,
          action: "TRANSCRIBE_AUDIO",
          resourceType: "audio_recording",
          resourceId: audio.id,
          ipAddress: getClientIP(ctx.req),
          details: `Transcrição concluída em ${processingTime}ms`,
        });

        return {
          id: transcription.id,
          text: result.text,
          language: result.language,
          wordCount: result.text.split(/\s+/).length,
          processingTime,
        };
      } catch (error) {
        await db
          .update(audioRecordings)
          .set({ status: "error" })
          .where(eq(audioRecordings.id, audio.id));

        throw error;
      }
    }),

  // ─── Gerar resumo e insights de uma consulta ─────────────────────────
  analyze: protectedProcedure
    .input(z.object({ consultationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!isOpenAIConfigured()) {
        throw new Error("IA nao configurada. Adicione a OPENAI_API_KEY nas variaveis de ambiente do Railway.");
      }

      const userId = ctx.user.id;

      // Verificar propriedade
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

      // Buscar transcrições da consulta
      const consultTranscriptions = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.consultationId, input.consultationId));

      if (consultTranscriptions.length === 0) {
        throw new Error("Nenhuma transcrição encontrada para esta consulta");
      }

      const fullText = consultTranscriptions
        .map((t) => decrypt(t.text))
        .join("\n\n");

      const tags = (consultation.tags as string[]) ?? [];

      // Gerar análise com IA
      const analysis = await generateClinicalSummary(fullText, tags);

      // Salvar resumo
      const [summary] = await db
        .insert(aiAnalyses)
        .values({
          consultationId: input.consultationId,
          userId,
          type: "summary",
          content: encrypt(
            JSON.stringify({
              summary: analysis.summary,
              insights: analysis.insights,
              suggestedTags: analysis.suggestedTags,
            })
          ),
          tags: analysis.suggestedTags,
          model: "gpt-4o",
        })
        .returning();

      await logAudit({
        userId,
        action: "AI_ANALYZE_CONSULTATION",
        resourceType: "consultation",
        resourceId: input.consultationId,
        ipAddress: getClientIP(ctx.req),
      });

      return {
        id: summary.id,
        summary: analysis.summary,
        insights: analysis.insights,
        suggestedTags: analysis.suggestedTags,
      };
    }),

  // ─── Chat contextual com IA ──────────────────────────────────────────
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        patientId: z.number().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOpenAIConfigured()) {
        throw new Error("IA nao configurada. Adicione a OPENAI_API_KEY nas variaveis de ambiente do Railway.");
      }

      const userId = ctx.user.id;
      const sessionId = input.sessionId || nanoid();

      // Montar contexto
      const [patientCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(eq(patients.userId, userId));

      const [consultCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(consultations)
        .where(eq(consultations.userId, userId));

      const context: {
        clinicStats: { totalPatients: number; totalConsultations: number };
        patientContext?: {
          consultationCount: number;
          tags: string[];
          recentNotes: string[];
          lastConsultation: string;
          progressTrend: string;
        };
        recentAnalyses?: string[];
      } = {
        clinicStats: {
          totalPatients: Number(patientCount.count),
          totalConsultations: Number(consultCount.count),
        },
      };

      // Se houver paciente específico, adicionar contexto
      if (input.patientId) {
        const [patient] = await db
          .select()
          .from(patients)
          .where(
            and(
              eq(patients.id, input.patientId),
              eq(patients.userId, userId)
            )
          );

        if (patient) {
          const patientConsults = await db
            .select()
            .from(consultations)
            .where(eq(consultations.patientId, input.patientId))
            .orderBy(desc(consultations.date))
            .limit(5);

          const recentAnalyses = await db
            .select()
            .from(aiAnalyses)
            .where(
              sql`${aiAnalyses.consultationId} IN (
                SELECT id FROM consultations WHERE patient_id = ${input.patientId}
              )`
            )
            .orderBy(desc(aiAnalyses.createdAt))
            .limit(3);

          context.patientContext = {
            consultationCount: patientConsults.length,
            tags: (patient.tags as string[]) ?? [],
            recentNotes: patientConsults
              .filter((c) => c.notes)
              .map((c) => decrypt(c.notes!))
              .slice(0, 3),
            lastConsultation: patientConsults[0]?.date?.toISOString() ?? "N/A",
            progressTrend:
              patientConsults.length > 1 ? "em acompanhamento" : "início",
          };

          context.recentAnalyses = recentAnalyses
            .map((a) => {
              try {
                const parsed = JSON.parse(decrypt(a.content));
                return parsed.summary || "";
              } catch {
                return "";
              }
            })
            .filter(Boolean);
        }
      }

      // Buscar histórico do chat
      const history = await db
        .select()
        .from(aiChatMessages)
        .where(
          and(
            eq(aiChatMessages.userId, userId),
            eq(aiChatMessages.sessionId, sessionId)
          )
        )
        .orderBy(aiChatMessages.createdAt)
        .limit(20);

      const chatHistory = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: decrypt(m.content),
      }));

      // Enviar para IA
      const result = await sendContextualMessage(
        input.message,
        context,
        chatHistory
      );

      // Salvar mensagens no banco (criptografadas)
      await db.insert(aiChatMessages).values([
        {
          userId,
          patientId: input.patientId ?? null,
          sessionId,
          role: "user",
          content: encrypt(input.message),
          contextUsed: Object.keys(context),
          tokensUsed: 0,
        },
        {
          userId,
          patientId: input.patientId ?? null,
          sessionId,
          role: "assistant",
          content: encrypt(result.response),
          contextUsed: [],
          tokensUsed: result.tokensUsed,
        },
      ]);

      await logAudit({
        userId,
        action: "AI_CHAT_MESSAGE",
        resourceType: "ai_chat",
        ipAddress: getClientIP(ctx.req),
        details: `Chat IA - sessão ${sessionId}`,
      });

      return {
        response: result.response,
        sessionId,
        tokensUsed: result.tokensUsed,
      };
    }),

  // ─── Histórico do chat ───────────────────────────────────────────────
  getChatHistory: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        patientId: z.number().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const conditions = [eq(aiChatMessages.userId, userId)];
      if (input.sessionId)
        conditions.push(eq(aiChatMessages.sessionId, input.sessionId));
      if (input.patientId)
        conditions.push(eq(aiChatMessages.patientId, input.patientId));

      const messages = await db
        .select()
        .from(aiChatMessages)
        .where(and(...conditions))
        .orderBy(aiChatMessages.createdAt)
        .limit(input.limit);

      return messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: decrypt(m.content),
        sessionId: m.sessionId,
        patientId: m.patientId,
        createdAt: m.createdAt,
      }));
    }),

  // ─── Limpar histórico do chat ────────────────────────────────────────
  clearChatHistory: protectedProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const conditions = [eq(aiChatMessages.userId, userId)];
      if (input.sessionId)
        conditions.push(eq(aiChatMessages.sessionId, input.sessionId));

      await db.delete(aiChatMessages).where(and(...conditions));

      return { success: true };
    }),
});
