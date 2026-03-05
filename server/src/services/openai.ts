import OpenAI from "openai";
import { env } from "../config/env.js";

let openaiClient: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  return !!env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes("placeholder") && !env.OPENAI_API_KEY.includes("aqui");
}

export function getOpenAI(): OpenAI {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI não configurada. Adicione uma OPENAI_API_KEY válida nas variáveis de ambiente para usar funcionalidades de IA.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ─── Transcrição com Whisper ───────────────────────────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<{ text: string; language: string; duration: number }> {
  const openai = getOpenAI();

  const file = new File([new Uint8Array(audioBuffer)], fileName, { type: "audio/webm" });

  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "pt",
    response_format: "verbose_json",
  });

  return {
    text: transcription.text,
    language: transcription.language ?? "pt",
    duration: transcription.duration ?? 0,
  };
}

// ─── Gerar Resumo Clínico ──────────────────────────────────────────────

export async function generateClinicalSummary(
  transcriptionText: string,
  tags: string[]
): Promise<{
  summary: string;
  insights: string[];
  suggestedTags: string[];
  riskLevel: string;
  riskIndicators: string[];
}> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Você é um assistente clínico especializado em psicologia.
Sua função é gerar resumos clínicos profissionais a partir de transcrições de consultas.

REGRAS IMPORTANTES:
- NUNCA inclua nomes de pacientes, CPF, datas de nascimento ou dados identificáveis
- Foque em padrões comportamentais, emocionais e cognitivos
- Use linguagem técnica psicológica quando apropriado
- Sugira tags clínicas relevantes
- Seja conciso mas completo

AVALIAÇÃO DE RISCO (OBRIGATÓRIA):
Avalie o nível de risco do paciente baseado na transcrição:
- "none": Sem indicadores de risco
- "low": Sinais leves de sofrimento, sem risco imediato
- "medium": Indicadores moderados (isolamento, desesperança, mudanças significativas)
- "high": Indicadores graves (ideação suicida passiva, autolesão, abuso de substâncias severo)
- "critical": Risco iminente (ideação suicida ativa, plano concreto, risco a terceiros)

Identifique indicadores específicos de risco encontrados na transcrição.

Responda em formato JSON:
{
  "summary": "Resumo clínico da consulta...",
  "insights": ["Insight 1", "Insight 2", ...],
  "suggestedTags": ["tag1", "tag2", ...],
  "riskLevel": "none|low|medium|high|critical",
  "riskIndicators": ["Indicador 1", "Indicador 2", ...]
}`,
      },
      {
        role: "user",
        content: `Transcrição da consulta (dados anonimizados):

${transcriptionText}

Tags existentes do paciente: ${tags.join(", ") || "Nenhuma"}

Gere o resumo clínico, insights, tags sugeridas e avaliação de risco.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia da IA");

  const parsed = JSON.parse(content);

  return {
    summary: parsed.summary || "",
    insights: parsed.insights || [],
    suggestedTags: parsed.suggestedTags || [],
    riskLevel: parsed.riskLevel || "none",
    riskIndicators: parsed.riskIndicators || [],
  };
}

// ─── Chat Contextual ──────────────────────────────────────────────────

interface ChatContext {
  clinicStats: {
    totalPatients: number;
    totalConsultations: number;
  };
  patientContext?: {
    consultationCount: number;
    tags: string[];
    recentNotes: string[];
    lastConsultation: string;
    progressTrend: string;
  };
  recentAnalyses?: string[];
}

export async function sendContextualMessage(
  message: string,
  context: ChatContext,
  chatHistory: { role: "user" | "assistant"; content: string }[]
): Promise<{ response: string; tokensUsed: number }> {
  const openai = getOpenAI();

  const systemPrompt = `Você é a PsicoIA, assistente inteligente do sistema PsicoIA Manager.
Você auxilia psicólogos(as) na análise de dados clínicos, padrões e tendências.

REGRAS ABSOLUTAS DE PRIVACIDADE:
- NUNCA revele nomes de pacientes, CPF, endereços ou dados identificáveis
- Quando se referir a pacientes, use termos genéricos como "o paciente" ou "a paciente"
- Foque em dados clínicos, padrões e insights profissionais
- Você é uma FERRAMENTA AUXILIAR — nunca substitua o julgamento clínico do psicólogo
- Sempre reforce que decisões clínicas são responsabilidade do profissional

CAPACIDADES:
- Analisar padrões de comportamento e progresso
- Sugerir abordagens terapêuticas baseadas em evidências
- Identificar tendências em dados agregados
- Auxiliar na documentação clínica
- Responder dúvidas sobre técnicas psicológicas

CONTEXTO DA CLÍNICA:
${JSON.stringify(context, null, 2)}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.7,
    max_tokens: 1500,
  });

  const tokensUsed = response.usage?.total_tokens ?? 0;
  const responseText =
    response.choices[0]?.message?.content ?? "Desculpe, não consegui processar sua mensagem.";

  return {
    response: responseText,
    tokensUsed,
  };
}
