import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { formatDateTime, formatDuration, formatFileSize } from "../lib/utils";
import {
  ArrowLeft,
  Mic,
  Brain,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  Tag,
  Eye,
  Calendar,
} from "lucide-react";
import { EvolutionForm } from "../components/EvolutionForm";

export function ConsultationDetailPage() {
  const { id } = useParams();
  const consultationId = Number(id);

  const {
    data: consultation,
    isLoading,
    refetch,
  } = trpc.consultations.getById.useQuery(
    { id: consultationId },
    { enabled: !!id }
  );

  const [analyzing, setAnalyzing] = useState(false);
  const analyze = trpc.ai.analyze.useMutation();
  const updateConsultation = trpc.consultations.update.useMutation();

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyze.mutateAsync({ consultationId });
      toast.success("Analise concluida com sucesso!");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar consulta");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleComplete = async () => {
    await updateConsultation.mutateAsync({
      id: consultationId,
      data: { status: "completed" },
    });
    toast.success("Consulta finalizada!");
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Consulta nao encontrada</p>
      </div>
    );
  }

  const hasTranscription =
    consultation.transcriptions && consultation.transcriptions.length > 0;
  const hasAnalysis =
    consultation.aiAnalyses && consultation.aiAnalyses.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/consultations"
          className="mt-1 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">
            Consulta - {consultation.patientName}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm text-text-secondary flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateTime(consultation.date)}
            </span>
            {consultation.duration && (
              <span className="text-sm text-text-secondary flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {consultation.duration} min
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                consultation.status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : consultation.status === "in_progress"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {consultation.status === "completed"
                ? "Concluida"
                : consultation.status === "in_progress"
                  ? "Em Andamento"
                  : "Agendada"}
            </span>
          </div>
        </div>
        {consultation.status !== "completed" && (
          <button
            onClick={handleComplete}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizar
          </button>
        )}
      </div>

      {/* Prontuário de Evolução */}
      <EvolutionForm consultationId={consultationId} />

      {/* Audio Recordings (read-only) */}
      {consultation.audioRecordings &&
        consultation.audioRecordings.length > 0 && (
          <div className="bg-white rounded-xl border border-border-light p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Mic className="w-4 h-4 text-sage-600" />
              Gravacoes
            </h3>
            <div className="space-y-2">
              {consultation.audioRecordings.map((audio) => (
                <div
                  key={audio.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface"
                >
                  <Mic className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-secondary flex-1 truncate">
                    {audio.fileName}
                  </span>
                  {audio.duration && (
                    <span className="text-xs text-text-muted">
                      {formatDuration(audio.duration)}
                    </span>
                  )}
                  {audio.fileSize && (
                    <span className="text-xs text-text-muted">
                      {formatFileSize(audio.fileSize)}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      audio.status === "transcribed"
                        ? "bg-emerald-50 text-emerald-700"
                        : audio.status === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {audio.status === "transcribed"
                      ? "Transcrito"
                      : audio.status === "error"
                        ? "Erro"
                        : "Enviado"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Transcription */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-600" />
          Transcricao
        </h3>

        {hasTranscription ? (
          <div className="space-y-3">
            {consultation.transcriptions!.map((t) => (
              <div key={t.id} className="space-y-2">
                <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {t.text}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-text-muted pt-2 border-t border-border-light">
                  <span>{t.wordCount} palavras</span>
                  <span>Idioma: {t.language}</span>
                  {t.processingTime && (
                    <span>
                      Processado em {(t.processingTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-border mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              Nenhuma transcricao disponivel
            </p>
            <p className="text-xs text-text-muted mt-1">
              Grave uma sessao pelo tablet para gerar a transcricao
            </p>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warm-500" />
            Analise da IA
          </h3>
          {hasTranscription && !hasAnalysis && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-3 py-1.5 rounded-lg bg-warm-50 text-warm-700 text-xs font-medium hover:bg-warm-100 disabled:opacity-60 flex items-center gap-1.5 border border-warm-200"
            >
              {analyzing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Brain className="w-3 h-3" />
              )}
              {analyzing ? "Analisando..." : "Gerar Analise"}
            </button>
          )}
        </div>

        {hasAnalysis ? (
          <div className="space-y-4">
            {consultation.aiAnalyses!.map((analysis) => {
              let parsed: {
                summary?: string;
                insights?: string[];
                suggestedTags?: string[];
              } = {};
              try {
                parsed = JSON.parse(analysis.content);
              } catch {
                parsed = { summary: analysis.content };
              }

              return (
                <div key={analysis.id} className="space-y-5">
                  {parsed.summary && (
                    <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-primary-600" />
                        <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider">
                          Resumo Clinico
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {parsed.summary}
                      </p>
                    </div>
                  )}

                  {parsed.insights && parsed.insights.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-warm-500" />
                        <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                          Insights Clinicos
                        </p>
                      </div>
                      <div className="space-y-2">
                        {parsed.insights.map((insight, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-xl bg-warm-50/50"
                          >
                            <div className="w-5 h-5 rounded-lg bg-warm-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-warm-600">
                                {i + 1}
                              </span>
                            </div>
                            <span className="text-sm text-text-secondary leading-relaxed">
                              {insight}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.suggestedTags &&
                    parsed.suggestedTags.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="w-4 h-4 text-sage-500" />
                          <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                            Tags Sugeridas
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {parsed.suggestedTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 rounded-lg text-xs font-medium bg-sage-50 text-sage-700 border border-sage-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  <p className="text-[10px] text-text-muted pt-2 border-t border-border-light">
                    Modelo: {analysis.model} | Gerado em{" "}
                    {formatDateTime(analysis.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-border mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              {hasTranscription
                ? 'Clique em "Gerar Analise" para obter insights da IA'
                : "Grave uma sessao primeiro para gerar analise"}
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      {consultation.notes && (
        <div className="bg-white rounded-xl border border-border-light p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Anotacoes
          </h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {consultation.notes}
          </p>
        </div>
      )}

      {/* Tags */}
      {consultation.tags && (consultation.tags as string[]).length > 0 && (
        <div className="bg-white rounded-xl border border-border-light p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-text-muted" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {(consultation.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
