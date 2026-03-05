import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { formatDuration, cn } from "../lib/utils";
import { toast } from "sonner";
import {
  Search,
  User,
  Mic,
  Pause,
  Play,
  Square,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowLeft,
  Eye,
  Tag,
  Clock,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

type Phase = "selecting" | "recording" | "processing" | "complete";
type ProcessingStep = "uploading" | "transcribing" | "analyzing" | "done";

interface AnalysisResult {
  summary: string;
  insights: string[];
  suggestedTags: string[];
}

export function SessionPage() {
  const navigate = useNavigate();

  // Phase state
  const [phase, setPhase] = useState<Phase>("selecting");
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; name: string } | null>(null);
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("uploading");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Audio recorder
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

  // tRPC mutations
  const createConsultation = trpc.consultations.create.useMutation();
  const uploadAudio = trpc.audio.upload.useMutation();
  const transcribe = trpc.ai.transcribe.useMutation();
  const analyze = trpc.ai.analyze.useMutation();

  // Patients query
  const { data: patientsData } = trpc.patients.list.useQuery(
    { search, page: 1, limit: 50 },
    { enabled: phase === "selecting" }
  );

  // Wake Lock
  useEffect(() => {
    if (phase !== "recording") return;
    let wakeLock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        // Wake Lock not supported or denied
      }
    };

    acquire();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [phase]);

  // Prevent accidental tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === "recording" || phase === "processing") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // --- Phase handlers ---

  const handleSelectPatient = useCallback(
    async (patient: { id: number; name: string }) => {
      setSelectedPatient(patient);
      setError(null);

      try {
        // Create consultation
        const consultation = await createConsultation.mutateAsync({
          patientId: patient.id,
          date: new Date().toISOString(),
          status: "in_progress",
        });
        setConsultationId(consultation.id);

        // Start recording
        await startRecording();
        setPhase("recording");
      } catch (err: any) {
        toast.error(err.message || "Erro ao iniciar sessao");
        setSelectedPatient(null);
      }
    },
    [createConsultation, startRecording]
  );

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setPhase("processing");
  }, [stopRecording]);

  const handleCancelRecording = useCallback(() => {
    if (isRecording) {
      const confirmed = window.confirm(
        "Deseja cancelar a gravacao? O audio sera perdido."
      );
      if (!confirmed) return;
    }
    resetRecording();
    setPhase("selecting");
    setSelectedPatient(null);
    setConsultationId(null);
  }, [isRecording, resetRecording]);

  // Processing pipeline
  const pipelineRunRef = useRef(false);
  useEffect(() => {
    if (phase !== "processing" || !audioBlob || !consultationId || pipelineRunRef.current) return;
    pipelineRunRef.current = true;

    const runPipeline = async () => {
      try {
        // Step 1: Upload
        setProcessingStep("uploading");
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = () => reject(new Error("Erro ao ler audio"));
          reader.readAsDataURL(audioBlob);
        });

        const uploadResult = await uploadAudio.mutateAsync({
          consultationId,
          audioData: base64,
          fileName: `sessao-${consultationId}-${Date.now()}.webm`,
          mimeType: "audio/webm",
          duration,
        });

        // Step 2: Transcribe
        setProcessingStep("transcribing");
        await transcribe.mutateAsync({
          audioRecordingId: uploadResult.id,
        });

        // Step 3: Analyze
        setProcessingStep("analyzing");
        const result = await analyze.mutateAsync({
          consultationId,
        });

        setAnalysisResult(result);
        setProcessingStep("done");
        setPhase("complete");
        toast.success("Sessao processada com sucesso!");
      } catch (err: any) {
        setError(err.message || "Erro no processamento");
        toast.error("Erro no processamento. Tente novamente.");
      }
    };

    runPipeline();
  }, [phase, audioBlob, consultationId, duration, uploadAudio, transcribe, analyze]);

  const handleRetry = useCallback(() => {
    setError(null);
    pipelineRunRef.current = false;
    // Re-trigger by resetting the phase
    setPhase("selecting");
    setTimeout(() => setPhase("processing"), 0);
  }, []);

  const handleNewSession = useCallback(() => {
    resetRecording();
    setPhase("selecting");
    setSelectedPatient(null);
    setConsultationId(null);
    setAnalysisResult(null);
    setError(null);
    setSearch("");
    pipelineRunRef.current = false;
  }, [resetRecording]);

  // --- Render ---

  // Phase 1: Select Patient
  if (phase === "selecting") {
    return (
      <div className="min-h-dvh bg-surface flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border-light px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Iniciar Sessao</h1>
            <p className="text-xs text-text-muted">Selecione o paciente</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-light bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 text-base"
              autoFocus
            />
          </div>
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {patientsData?.patients && patientsData.patients.length > 0 ? (
            <div className="space-y-2">
              {patientsData.patients.map((patient: any) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient({ id: patient.id, name: patient.name })}
                  disabled={createConsultation.isPending}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-white border border-border-light hover:border-primary-300 hover:bg-primary-50/30 transition-all active:scale-[0.98] text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{patient.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full",
                          patient.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {patient.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                      {patient.tags?.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-xs text-text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Mic className="w-5 h-5 text-text-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="w-12 h-12 text-text-muted/30 mb-3" />
              <p className="text-text-muted text-sm">
                {search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
              </p>
            </div>
          )}

          {createConsultation.isPending && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-xl">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                <span className="text-text-primary font-medium">Preparando sessao...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase 2: Recording
  if (phase === "recording") {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleCancelRecording}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm text-white/60 truncate max-w-[200px]">
              {selectedPatient?.name}
            </p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Timer */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className={cn(
            "text-7xl sm:text-8xl font-mono font-bold tabular-nums tracking-tight",
            isPaused ? "text-amber-400" : "text-white animate-recording-pulse"
          )}>
            {formatDuration(duration)}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-4">
            {!isPaused ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-ring" />
                <span className="text-red-400 text-sm font-medium">Gravando...</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Pausado</span>
              </>
            )}
          </div>

          {/* Duration warning */}
          {duration > 4500 && (
            <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-xs">Aproximando do limite de 80 minutos</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="pb-12 pt-8 flex items-center justify-center gap-8">
          {/* Pause/Resume */}
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-amber-500/30"
          >
            {isPaused ? (
              <Play className="w-7 h-7 text-white ml-1" />
            ) : (
              <Pause className="w-7 h-7 text-white" />
            )}
          </button>

          {/* Stop */}
          <button
            onClick={handleStopRecording}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
          >
            <Square className="w-8 h-8 text-white fill-white" />
          </button>
        </div>
      </div>
    );
  }

  // Phase 3: Processing
  if (phase === "processing") {
    const steps: { key: ProcessingStep; label: string }[] = [
      { key: "uploading", label: "Enviando audio" },
      { key: "transcribing", label: "Transcrevendo com IA" },
      { key: "analyzing", label: "Gerando analise clinica" },
    ];

    const stepOrder: ProcessingStep[] = ["uploading", "transcribing", "analyzing"];
    const currentIdx = stepOrder.indexOf(processingStep);

    return (
      <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Processando sessao</h2>
            <p className="text-sm text-text-muted mt-1">{selectedPatient?.name}</p>
            <p className="text-xs text-text-muted mt-0.5">
              Duracao: {formatDuration(duration)}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isComplete = currentIdx > idx || processingStep === "done";
              const isActive = currentIdx === idx && !error;
              const isPending = currentIdx < idx;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border transition-all",
                    isComplete && "bg-emerald-50 border-emerald-200",
                    isActive && "bg-primary-50 border-primary-200",
                    isPending && "bg-white border-border-light opacity-50",
                    error && isActive && "bg-red-50 border-red-200"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : isActive && !error ? (
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin flex-shrink-0" />
                  ) : error && isActive ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isComplete && "text-emerald-700",
                      isActive && !error && "text-primary-700",
                      error && isActive && "text-red-700",
                      isPending && "text-text-muted"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error state */}
          {error && (
            <div className="mt-6 text-center">
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}

          {!error && (
            <p className="text-center text-xs text-text-muted mt-8">
              Isso pode levar alguns minutos para sessoes longas...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Phase 4: Complete
  return (
    <div className="min-h-dvh bg-surface">
      {/* Success header */}
      <div className="bg-gradient-to-b from-emerald-50 to-surface px-4 pt-8 pb-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-slide-up">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary animate-fade-in">
          Sessao concluida!
        </h2>
        <p className="text-sm text-text-muted mt-1">{selectedPatient?.name}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-sm text-text-muted">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pb-8 space-y-4">
        {analysisResult && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-xl border border-border-light p-5 animate-fade-in">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                Resumo Clinico
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {analysisResult.summary}
              </p>
            </div>

            {/* Insights */}
            {analysisResult.insights.length > 0 && (
              <div className="bg-white rounded-xl border border-border-light p-5 animate-fade-in">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-warm-500" />
                  Insights Clinicos
                </h3>
                <ul className="space-y-2.5">
                  {analysisResult.insights.map((insight: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-warm-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-text-secondary leading-relaxed">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {analysisResult.suggestedTags.length > 0 && (
              <div className="bg-white rounded-xl border border-border-light p-5 animate-fade-in">
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sage-500" />
                  Tags Sugeridas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.suggestedTags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-sage-50 text-sage-700 border border-sage-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate(`/consultations/${consultationId}`)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Ver detalhes completos
          </button>
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-border-light text-text-primary font-medium hover:bg-surface-hover transition-colors"
          >
            <Mic className="w-4 h-4" />
            Nova sessao
          </button>
        </div>
      </div>
    </div>
  );
}
