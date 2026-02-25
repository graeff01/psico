import { useParams, Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { formatDateTime, formatDuration, formatFileSize } from "../lib/utils";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useState } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Upload,
  Brain,
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export function ConsultationDetailPage() {
  const { id } = useParams();
  const consultationId = Number(id);

  const { data: consultation, isLoading, refetch } =
    trpc.consultations.getById.useQuery(
      { id: consultationId },
      { enabled: !!id }
    );

  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const uploadAudio = trpc.audio.upload.useMutation();
  const transcribe = trpc.ai.transcribe.useMutation();
  const analyze = trpc.ai.analyze.useMutation();

  const updateConsultation = trpc.consultations.update.useMutation();

  const handleUpload = async () => {
    if (!audioBlob) return;

    setUploading(true);
    try {
      // Converter para base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      const result = await uploadAudio.mutateAsync({
        consultationId,
        audioData: base64,
        fileName: `consulta-${consultationId}-${Date.now()}.webm`,
        mimeType: "audio/webm",
        duration,
      });

      toast.success("Áudio enviado com sucesso!");
      resetRecording();

      // Iniciar transcrição automaticamente
      setTranscribing(true);
      try {
        await transcribe.mutateAsync({
          audioRecordingId: result.id,
        });
        toast.success("Transcrição concluída!");
      } catch {
        toast.error("Erro na transcrição. Tente novamente.");
      } finally {
        setTranscribing(false);
      }

      refetch();
    } catch {
      toast.error("Erro ao enviar áudio");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyze.mutateAsync({ consultationId });
      toast.success("Análise concluída com sucesso!");
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
      data: { status: "completed", duration: Math.ceil(duration / 60) || undefined },
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
        <p className="text-text-secondary">Consulta não encontrada</p>
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
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-text-secondary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDateTime(consultation.date)}
            </span>
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
                ? "Concluída"
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

      {/* Audio Recorder */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Mic className="w-4 h-4 text-sage-600" />
          Gravação de Áudio
        </h3>

        <div className="flex flex-col items-center gap-4">
          {/* Timer */}
          <div className="text-4xl font-mono font-bold text-text-primary tabular-nums">
            {formatDuration(duration)}
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isPaused ? "bg-amber-500" : "bg-red-500 animate-pulse-ring"}`}
              />
              <span className="text-sm text-text-secondary">
                {isPaused ? "Pausado" : "Gravando..."}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg shadow-red-500/30"
              >
                <Mic className="w-7 h-7" />
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors"
                >
                  {isPaused ? (
                    <Play className="w-5 h-5 ml-0.5" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg shadow-red-500/30"
                >
                  <Square className="w-6 h-6" />
                </button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <button
                  onClick={resetRecording}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover"
                >
                  Descartar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Enviando..." : "Enviar e Transcrever"}
                </button>
              </>
            )}
          </div>

          {/* Processing status */}
          {transcribing && (
            <div className="flex items-center gap-2 text-sm text-primary-600 bg-primary-50 px-4 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcrevendo áudio com Whisper AI...
            </div>
          )}

          {/* Max duration warning */}
          {isRecording && duration > 4500 && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertCircle className="w-3 h-3" />
              Limite de 80 minutos se aproximando
            </div>
          )}
        </div>

        {/* Existing recordings */}
        {consultation.audioRecordings &&
          consultation.audioRecordings.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border-light">
              <p className="text-xs font-medium text-text-muted mb-2">
                Gravações anteriores
              </p>
              <div className="space-y-2">
                {consultation.audioRecordings.map((audio) => (
                  <div
                    key={audio.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-surface"
                  >
                    <Mic className="w-4 h-4 text-text-muted" />
                    <span className="text-xs text-text-secondary flex-1">
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
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        audio.status === "transcribed"
                          ? "bg-emerald-50 text-emerald-700"
                          : audio.status === "error"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {audio.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Transcription */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-600" />
          Transcrição
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
          <p className="text-sm text-text-muted text-center py-6">
            Nenhuma transcrição disponível. Grave um áudio para transcrever.
          </p>
        )}
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warm-500" />
            Análise da IA
          </h3>
          {hasTranscription && (
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
              {analyzing ? "Analisando..." : "Gerar Análise"}
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
                <div
                  key={analysis.id}
                  className="space-y-4 animate-slide-up"
                >
                  {parsed.summary && (
                    <div>
                      <p className="text-xs font-medium text-text-muted mb-1.5">
                        Resumo Clínico
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {parsed.summary}
                      </p>
                    </div>
                  )}

                  {parsed.insights && parsed.insights.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-muted mb-1.5">
                        Insights
                      </p>
                      <ul className="space-y-1.5">
                        {parsed.insights.map((insight, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-text-secondary"
                          >
                            <Sparkles className="w-3 h-3 text-warm-500 mt-1 shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.suggestedTags &&
                    parsed.suggestedTags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-text-muted mb-1.5">
                          Tags Sugeridas
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {parsed.suggestedTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-xs font-medium bg-warm-50 text-warm-700 border border-warm-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  <p className="text-[10px] text-text-muted">
                    Modelo: {analysis.model} | Gerado em{" "}
                    {formatDateTime(analysis.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-6">
            {hasTranscription
              ? 'Clique em "Gerar Análise" para obter insights da IA'
              : "Transcreva um áudio primeiro para gerar análise"}
          </p>
        )}
      </div>

      {/* Notes */}
      {consultation.notes && (
        <div className="bg-white rounded-xl border border-border-light p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Anotações
          </h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {consultation.notes}
          </p>
        </div>
      )}
    </div>
  );
}
