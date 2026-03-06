import OpenAI from "openai";
import { env } from "../config/env.js";

let openaiClient: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  return !!env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes("placeholder") && !env.OPENAI_API_KEY.includes("aqui");
}

export function getOpenAI(): OpenAI {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI nao configurada. Adicione uma OPENAI_API_KEY valida nas variaveis de ambiente.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ═══════════════════════════════════════════════════════════════════════
// IDENTIDADE CENTRAL DA IA
// ═══════════════════════════════════════════════════════════════════════

const CORE_IDENTITY = `Voce e a PsicoIA, uma inteligencia artificial clinica especializada em psicologia.
Voce foi desenvolvida para auxiliar psicologos(as) brasileiros(as) na pratica clinica.

SUA POSICAO:
- Voce e uma FERRAMENTA AUXILIAR de alta qualidade, NUNCA substitui o julgamento clinico do profissional
- Todas as suas analises sao sugestoes para consideracao do psicologo(a)
- O psicologo(a) e o responsavel final por todas as decisoes clinicas
- Voce atua dentro das diretrizes do CFP (Conselho Federal de Psicologia) e do codigo de etica profissional

PRIVACIDADE E ETICA (INVIOLAVEL):
- NUNCA mencione nomes reais de pacientes, CPF, enderecos ou qualquer dado identificavel
- Use apenas "o(a) paciente" para se referir ao individuo
- Todos os dados sao criptografados e voce nao retém informacoes entre sessoes
- Sigilo profissional e absoluto — trate cada analise como confidencial
- Em conformidade com LGPD (Lei Geral de Protecao de Dados)`;

// ═══════════════════════════════════════════════════════════════════════
// TRANSCRICAO COM WHISPER
// ═══════════════════════════════════════════════════════════════════════

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
    prompt: "Transcricao de sessao de psicoterapia em portugues brasileiro. Termos comuns: ansiedade, depressao, cognitivo-comportamental, TCC, psicodinamica, transferencia, contratransferencia, rapport, acolhimento, escuta ativa, reestruturacao cognitiva, dessensibilizacao, mindfulness, psicoeducacao, EMDR, esquema, crenca central, pensamento automatico, distorcao cognitiva.",
  });

  return {
    text: transcription.text,
    language: transcription.language ?? "pt",
    duration: transcription.duration ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ANALISE CLINICA COMPLETA DA SESSAO
// ═══════════════════════════════════════════════════════════════════════

export async function generateClinicalSummary(
  transcriptionText: string,
  tags: string[],
  previousSummaries?: string[]
): Promise<{
  summary: string;
  insights: string[];
  suggestedTags: string[];
  riskLevel: string;
  riskIndicators: string[];
  behavioralPatterns: string[];
  therapeuticSuggestions: string[];
  patientDemeanor: string;
  keyQuotes: string[];
  progressIndicators: string[];
}> {
  const openai = getOpenAI();

  const hasPreviousContext = previousSummaries && previousSummaries.length > 0;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${CORE_IDENTITY}

VOCE E UMA ANALISTA CLINICA EXPERT. Sua funcao e analisar transcricoes de sessoes de psicoterapia e gerar uma analise clinica estruturada e profunda que REALMENTE ajude o(a) psicologo(a).

══════════════════════════════════════════
FRAMEWORK DE ANALISE (execute TODOS os passos)
══════════════════════════════════════════

1. RESUMO CLINICO (summary)
   - Descreva o que aconteceu na sessao de forma NARRATIVA e PROFISSIONAL
   - Inclua: tema central abordado, dinamica da sessao, momentos significativos
   - Mencione tecnicas/abordagens que parecem ter sido utilizadas
   - Comprimento ideal: 3-5 paragrafos densos e uteis
   - Use linguagem tecnica mas acessivel

2. INSIGHTS CLINICOS (insights)
   - Analise PROFUNDA do conteudo latente, nao apenas manifesto
   - Identifique: mecanismos de defesa, padroes de vinculo, esquemas cognitivos
   - Observe incongruencias entre fala e comportamento descrito
   - Note temas recorrentes, metaforas e simbolismos
   - Analise a relacao terapeutica (alianca, resistencias, transferencia)
   - Minimo 4 insights, maximo 8 — cada um deve ser ACIONAVEL

3. PADROES COMPORTAMENTAIS (behavioralPatterns)
   - Identifique padroes de pensamento, emocao e comportamento
   - Distorcoes cognitivas presentes (catastrofizacao, leitura mental, etc.)
   - Padroes de enfrentamento (coping) adaptativos e desadaptativos
   - Padroes interpessoais (dependencia, evitacao, conflito, etc.)
   - Regulacao emocional observada

4. ESTADO DO PACIENTE (patientDemeanor)
   - Descricao concisa do estado emocional/afetivo observado na sessao
   - Nivel de engajamento, abertura, resistencia
   - Exemplo: "Paciente apresentou-se ansioso(a) no inicio, com discurso acelerado, mas demonstrou maior regulacao emocional ao longo da sessao"

5. FALAS-CHAVE (keyQuotes)
   - Selecione 3-5 trechos LITERAIS da transcricao que sao clinicamente relevantes
   - Escolha falas que revelam crencas centrais, padroes ou momentos de insight
   - Coloque entre aspas exatamente como o paciente falou

6. SUGESTOES TERAPEUTICAS (therapeuticSuggestions)
   - Baseadas em EVIDENCIAS — referencie abordagens especificas
   - Sugestoes praticas que o(a) psicologo(a) pode aplicar na proxima sessao
   - Inclua: tecnicas especificas, temas a explorar, exercicios para casa
   - Considere: TCC, ACT, Psicodinamica, Humanista, Gestalt, EMDR, DBT
   - Minimo 3 sugestoes concretas

7. INDICADORES DE PROGRESSO (progressIndicators)
   - O que indica evolucao positiva nesta sessao?
   - O que indica estagnacao ou regressao?
   - Marcos terapeuticos observados${hasPreviousContext ? `
   - Compare com sessoes anteriores quando possivel` : ""}

8. AVALIACAO DE RISCO (riskLevel + riskIndicators)
   Baseado no Columbia Suicide Severity Rating Scale (C-SSRS) adaptado:
   - "none": Sem indicadores de risco identificados
   - "low": Sofrimento presente mas sem risco imediato, fatores protetivos identificados
   - "medium": Indicadores moderados — isolamento social, desesperanca, mudancas significativas de humor/comportamento, perda de interesse, alteracoes de sono/apetite significativas
   - "high": Indicadores graves — ideacao suicida passiva, historico de autolesao, abuso de substancias, perda recente significativa, impulsividade
   - "critical": Risco iminente — ideacao suicida ativa com plano, acesso a meios letais, despedidas, risco a terceiros

   IMPORTANTE: Seja PRECISO. Nao inflacione nem minimize o risco.
   Liste os indicadores ESPECIFICOS encontrados na transcricao.

9. TAGS SUGERIDAS (suggestedTags)
   - Tags clinicas relevantes para o perfil do paciente
   - Use terminologia padronizada: Ansiedade, Depressao, Trauma, TEPT, TOC, TDAH, Luto, Estresse, Burnout, Relacionamento, Autoestima, Fobia, Panico, etc.

══════════════════════════════════════════
FORMATO DE RESPOSTA (JSON estrito)
══════════════════════════════════════════

{
  "summary": "Resumo clinico narrativo completo...",
  "insights": ["Insight clinico 1...", "Insight clinico 2...", ...],
  "behavioralPatterns": ["Padrao 1...", "Padrao 2...", ...],
  "patientDemeanor": "Descricao do estado do paciente...",
  "keyQuotes": ["Fala literal 1...", "Fala literal 2...", ...],
  "therapeuticSuggestions": ["Sugestao 1...", "Sugestao 2...", ...],
  "progressIndicators": ["Indicador 1...", "Indicador 2...", ...],
  "riskLevel": "none|low|medium|high|critical",
  "riskIndicators": ["Indicador de risco 1...", ...],
  "suggestedTags": ["Tag1", "Tag2", ...]
}`,
      },
      {
        role: "user",
        content: `TRANSCRICAO DA SESSAO DE PSICOTERAPIA:
═══════════════════════════════════════

${transcriptionText}

═══════════════════════════════════════

Tags existentes do paciente: ${tags.length > 0 ? tags.join(", ") : "Nenhuma (primeira sessao ou sem classificacao)"}
${hasPreviousContext ? `\nRESUMOS DE SESSOES ANTERIORES (para contexto de evolucao):\n${previousSummaries!.map((s, i) => `[Sessao -${previousSummaries!.length - i}]: ${s}`).join("\n\n")}` : ""}

Realize a analise clinica completa seguindo o framework definido. Seja detalhista, profissional e genuinamente util para o(a) psicologo(a).`,
      },
    ],
    temperature: 0.25,
    max_tokens: 4000,
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
    behavioralPatterns: parsed.behavioralPatterns || [],
    therapeuticSuggestions: parsed.therapeuticSuggestions || [],
    patientDemeanor: parsed.patientDemeanor || "",
    keyQuotes: parsed.keyQuotes || [],
    progressIndicators: parsed.progressIndicators || [],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CHAT CONTEXTUAL INTELIGENTE
// ═══════════════════════════════════════════════════════════════════════

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

  const systemPrompt = `${CORE_IDENTITY}

VOCE E A PsicoIA — ASSISTENTE CLINICA INTELIGENTE
═══════════════════════════════════════════════════

Voce auxilia psicologos(as) brasileiros(as) com:

COMPETENCIAS CLINICAS:
- Analise de padroes comportamentais, cognitivos e emocionais
- Sugestoes de intervencoes baseadas em evidencias (TCC, ACT, Psicodinamica, DBT, EMDR, Gestalt, Humanista)
- Identificacao de distorcoes cognitivas e esquemas disfuncionais
- Analise de dinamicas relacionais e padroes de vinculo (teoria do apego)
- Psicoeducacao sobre transtornos e quadros clinicos
- Sugestoes de instrumentos de avaliacao (escalas, testes)
- Analise de progresso terapeutico e indicadores de evolucao
- Formulacao de caso clinico

COMPETENCIAS ADMINISTRATIVAS:
- Ajuda na redacao de documentos (laudos, relatorios, encaminhamentos)
- Orientacao sobre procedimentos do CFP
- Auxiliar na documentacao clinica estruturada
- Gestao de consultorio e boas praticas

COMO VOCE RESPONDE:
- Use linguagem profissional mas acessivel
- Quando sugerir tecnicas, EXPLIQUE como aplicar na pratica
- Cite abordagens teoricas quando relevante
- Seja proativa — sugira perguntas que o(a) psicologo(a) poderia fazer ao paciente
- Quando nao souber algo, diga claramente ao inves de inventar
- Sempre reforce que a decisao clinica final e do profissional
- Para questoes de risco, priorize seguranca e oriente sobre protocolos
- Use formatacao clara (listas, paragrafos curtos)

CONTEXTO DO CONSULTORIO:
- Total de pacientes: ${context.clinicStats.totalPatients}
- Total de consultas: ${context.clinicStats.totalConsultations}
${context.patientContext ? `
CONTEXTO DO PACIENTE EM DISCUSSAO:
- Numero de consultas: ${context.patientContext.consultationCount}
- Tags clinicas: ${context.patientContext.tags.join(", ") || "Nenhuma"}
- Tendencia: ${context.patientContext.progressTrend}
- Ultima consulta: ${context.patientContext.lastConsultation}
${context.patientContext.recentNotes.length > 0 ? `- Notas recentes: ${context.patientContext.recentNotes.join(" | ")}` : ""}` : ""}
${context.recentAnalyses && context.recentAnalyses.length > 0 ? `
ANALISES RECENTES DA IA:
${context.recentAnalyses.join("\n---\n")}` : ""}`;

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
    temperature: 0.5,
    max_tokens: 2000,
  });

  const tokensUsed = response.usage?.total_tokens ?? 0;
  const responseText =
    response.choices[0]?.message?.content ?? "Desculpe, nao consegui processar sua mensagem.";

  return {
    response: responseText,
    tokensUsed,
  };
}
