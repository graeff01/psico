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
  MicOff,
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
  ChevronRight,
  FileAudio,
  Brain,
  Upload,
  FileText,
  Wand2,
  Plus,
} from "lucide-react";

type Phase = "selecting" | "recording" | "processing" | "complete";
type ProcessingStep = "uploading" | "transcribing" | "analyzing" | "done";

interface AnalysisResult {
  summary: string;
  insights: string[];
  suggestedTags: string[];
}

interface PipelineWarnings {
  transcribeSkipped?: string;
  analyzeSkipped?: string;
}

export function SessionPage() {
  const navigate = useNavigate();

  // Phase state
  const [phase, setPhase] = useState<Phase>("selecting");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [processingStep, setProcessingStep] =
    useState<ProcessingStep>("uploading");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PipelineWarnings>({});
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
  const updateConsultation = trpc.consultations.update.useMutation();
  const uploadAudio = trpc.audio.upload.useMutation();
  const transcribe = trpc.ai.transcribe.useMutation();
  const analyze = trpc.ai.analyze.useMutation();

  // Patients query
  const { data: patientsData, isLoading: patientsLoading } =
    trpc.patients.list.useQuery(
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
        const consultation = await createConsultation.mutateAsync({
          patientId: patient.id,
          date: new Date().toISOString(),
          status: "in_progress",
        });
        setConsultationId(consultation.id);

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

  // Processing pipeline with graceful degradation
  const pipelineRunRef = useRef(false);
  const audioBase64Ref = useRef<string | null>(null);
  useEffect(() => {
    if (
      phase !== "processing" ||
      !audioBlob ||
      !consultationId ||
      pipelineRunRef.current
    )
      return;
    pipelineRunRef.current = true;

    const runPipeline = async () => {
      const pipelineWarnings: PipelineWarnings = {};

      try {
        // Step 1: Upload (always runs)
        setProcessingStep("uploading");
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve((reader.result as string).split(",")[1]);
          reader.onerror = () => reject(new Error("Erro ao ler audio"));
          reader.readAsDataURL(audioBlob);
        });
        audioBase64Ref.current = base64;

        const uploadResult = await uploadAudio.mutateAsync({
          consultationId,
          audioData: base64,
          fileName: `sessao-${consultationId}-${Date.now()}.webm`,
          mimeType: "audio/webm",
          duration,
        });

        // Step 2: Transcribe (optional — skip if OpenAI not configured)
        setProcessingStep("transcribing");
        let transcribeOk = false;
        try {
          await transcribe.mutateAsync({
            audioRecordingId: uploadResult.id,
            audioData: base64, // send inline audio as fallback for no-S3
          });
          transcribeOk = true;
        } catch (err: any) {
          const msg = err.message || "";
          if (msg.includes("IA nao configurada") || msg.includes("OPENAI_API_KEY") || msg.includes("429") || msg.includes("quota") || msg.includes("insufficient_quota")) {
            pipelineWarnings.transcribeSkipped = "Transcricao indisponivel: IA nao configurada ou sem creditos na OpenAI.";
          } else if (msg.includes("S3") || msg.includes("Storage")) {
            pipelineWarnings.transcribeSkipped = "Transcricao indisponivel: storage nao configurado.";
          } else {
            pipelineWarnings.transcribeSkipped = `Transcricao falhou: ${msg}`;
          }
        }

        // Step 3: Analyze (optional — only if transcription exists)
        setProcessingStep("analyzing");
        if (transcribeOk) {
          try {
            const result = await analyze.mutateAsync({
              consultationId,
            });
            setAnalysisResult(result);
          } catch (err: any) {
            const msg = err.message || "";
            pipelineWarnings.analyzeSkipped = msg.includes("IA nao configurada") || msg.includes("429") || msg.includes("quota")
              ? "Analise indisponivel: IA sem creditos ou nao configurada."
              : `Analise falhou: ${msg}`;
          }
        } else {
          pipelineWarnings.analyzeSkipped = "Analise pulada: sem transcricao disponivel.";
        }

        // Mark consultation as completed
        try {
          await updateConsultation.mutateAsync({
            id: consultationId,
            data: { status: "completed", duration },
          });
        } catch {
          // Non-critical — consultation stays in_progress
        }

        setWarnings(pipelineWarnings);
        setProcessingStep("done");
        setPhase("complete");

        const hasWarnings = pipelineWarnings.transcribeSkipped || pipelineWarnings.analyzeSkipped;
        if (hasWarnings) {
          toast.success("Sessao salva! Transcricao/analise IA indisponiveis.");
        } else {
          toast.success("Sessao processada com sucesso!");
        }
      } catch (err: any) {
        // Only reaches here if upload itself fails
        setError(err.message || "Erro ao enviar audio");
        toast.error("Erro ao enviar audio. Tente novamente.");
      }
    };

    runPipeline();
  }, [
    phase,
    audioBlob,
    consultationId,
    duration,
    uploadAudio,
    updateConsultation,
    transcribe,
    analyze,
  ]);

  const handleRetry = useCallback(() => {
    setError(null);
    pipelineRunRef.current = false;
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
    setWarnings({});
    setSearch("");
    pipelineRunRef.current = false;
    audioBase64Ref.current = null;
  }, [resetRecording]);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: Select Patient
  // ═══════════════════════════════════════════════════════════════════
  if (phase === "selecting") {
    const patients = patientsData?.patients ?? [];

    return (
      <div className="min-h-dvh bg-gradient-to-b from-primary-50/60 via-surface to-surface flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 border-b border-border-light">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-text-primary">
                Nova Sessao
              </h1>
              <p className="text-xs text-text-muted">
                Escolha o paciente para iniciar a gravacao
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-4 pb-6">
          {/* Search */}
          <div className="py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar paciente por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 text-sm shadow-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Info card */}
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-primary-100/50 border border-primary-200/60">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileAudio className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-900">
                  Como funciona
                </p>
                <p className="text-xs text-primary-700/80 mt-1 leading-relaxed">
                  Selecione o paciente, grave a sessao inteira, e a IA gera
                  automaticamente a transcricao, resumo clinico e insights.
                </p>
              </div>
            </div>
          </div>

          {/* Patient List */}
          <div className="flex-1">
            {patientsLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-3" />
                <p className="text-sm text-text-muted">
                  Carregando pacientes...
                </p>
              </div>
            ) : patients.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-1 mb-3">
                  {patients.length} paciente{patients.length !== 1 ? "s" : ""}
                </p>
                {patients.map((patient: any) => (
                  <button
                    key={patient.id}
                    onClick={() =>
                      handleSelectPatient({
                        id: patient.id,
                        name: patient.name,
                      })
                    }
                    disabled={createConsultation.isPending}
                    className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-border-light hover:border-primary-300 hover:shadow-md hover:shadow-primary-500/5 transition-all active:scale-[0.98] text-left group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center flex-shrink-0 group-hover:from-primary-200 group-hover:to-primary-100 transition-colors">
                      <span className="text-base font-bold text-primary-600">
                        {patient.name?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {patient.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full font-medium",
                            patient.status === "active"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                              : "bg-gray-50 text-gray-400 border border-gray-200/60"
                          )}
                        >
                          {patient.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                        {patient.tags?.slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[11px] text-text-muted bg-surface px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-surface flex items-center justify-center mb-4">
                  <User className="w-7 h-7 text-text-muted/40" />
                </div>
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {search
                    ? "Nenhum paciente encontrado"
                    : "Nenhum paciente cadastrado"}
                </p>
                <p className="text-xs text-text-muted mb-4">
                  {search
                    ? "Tente buscar com outro nome"
                    : "Cadastre um paciente para iniciar"}
                </p>
                {!search && (
                  <button
                    onClick={() => navigate("/patients")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Paciente
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading overlay */}
        {createConsultation.isPending && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl mx-6 max-w-xs w-full">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-text-primary">
                  Preparando sessao...
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Aguarde um momento
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: Recording
  // ═══════════════════════════════════════════════════════════════════
  if (phase === "recording") {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");

    return (
      <div className="min-h-dvh bg-[#0c0f1a] flex flex-col relative overflow-hidden">
        {/* Background ambient glow */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000",
            isPaused ? "bg-amber-500" : "bg-red-500 animate-recording-pulse"
          )}
        />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
          <button
            onClick={handleCancelRecording}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/8 hover:bg-white/15 transition-colors backdrop-blur-sm border border-white/10"
          >
            <X className="w-4.5 h-4.5 text-white/70" />
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/8 backdrop-blur-sm border border-white/10">
            <User className="w-3.5 h-3.5 text-white/50" />
            <span className="text-xs font-medium text-white/70 truncate max-w-[180px]">
              {selectedPatient?.name}
            </span>
          </div>

          <div className="w-10" />
        </div>

        {/* Center: Timer */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          {/* Recording indicator */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="relative">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  isPaused ? "bg-amber-400" : "bg-red-500"
                )}
              />
              {!isPaused && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-widest",
                isPaused ? "text-amber-400" : "text-red-400"
              )}
            >
              {isPaused ? "Pausado" : "Gravando"}
            </span>
          </div>

          {/* Timer display */}
          <div className="flex items-baseline gap-1">
            {hours > 0 && (
              <>
                <span className="text-6xl sm:text-7xl font-mono font-bold text-white tabular-nums">
                  {pad(hours)}
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-bold text-white/30 mx-1">
                  :
                </span>
              </>
            )}
            <span
              className={cn(
                "font-mono font-bold tabular-nums transition-colors",
                hours > 0
                  ? "text-6xl sm:text-7xl text-white"
                  : "text-7xl sm:text-8xl text-white"
              )}
            >
              {pad(minutes)}
            </span>
            <span
              className={cn(
                "font-mono font-bold mx-1",
                hours > 0
                  ? "text-3xl sm:text-4xl text-white/30"
                  : "text-4xl sm:text-5xl text-white/30"
              )}
            >
              :
            </span>
            <span
              className={cn(
                "font-mono font-bold tabular-nums transition-colors",
                hours > 0
                  ? "text-6xl sm:text-7xl text-white"
                  : "text-7xl sm:text-8xl text-white"
              )}
            >
              {pad(seconds)}
            </span>
          </div>

          {/* Audio visualization placeholder */}
          <div className="flex items-center gap-[3px] mt-8 h-8">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-all duration-150",
                  isPaused
                    ? "bg-white/10 h-1"
                    : "bg-gradient-to-t from-red-500/60 to-red-400/40"
                )}
                style={
                  !isPaused
                    ? {
                        height: `${Math.max(4, Math.random() * 32)}px`,
                        animationDelay: `${i * 50}ms`,
                      }
                    : undefined
                }
              />
            ))}
          </div>

          {/* Duration warning */}
          {duration > 4500 && (
            <div className="flex items-center gap-2 mt-8 px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/20 backdrop-blur-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-xs font-medium">
                Aproximando do limite de 80 minutos
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="relative z-10 pb-14 pt-6 flex items-center justify-center gap-10">
          {/* Pause/Resume */}
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90",
              isPaused
                ? "bg-emerald-500 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
                : "bg-white/15 border border-white/20 hover:bg-white/25 backdrop-blur-sm"
            )}
          >
            {isPaused ? (
              <Play className="w-6 h-6 text-white ml-0.5" />
            ) : (
              <Pause className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Stop */}
          <button
            onClick={handleStopRecording}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 active:scale-90 flex items-center justify-center transition-all shadow-xl shadow-red-500/40 ring-4 ring-red-500/20"
          >
            <Square className="w-7 h-7 text-white fill-white rounded-sm" />
          </button>

          {/* Mute indicator (visual only) */}
          <div className="w-16 h-16 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
            {isPaused ? (
              <MicOff className="w-5 h-5 text-white/30" />
            ) : (
              <Mic className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>

        {/* Bottom label */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-[11px] text-white/25 font-medium">
            {isPaused
              ? "Toque em play para retomar"
              : "Toque no botao vermelho para finalizar"}
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: Processing
  // ═══════════════════════════════════════════════════════════════════
  if (phase === "processing") {
    const steps: { key: ProcessingStep; label: string; desc: string; icon: typeof Upload; optional?: boolean }[] = [
      { key: "uploading", label: "Enviando audio", desc: "Fazendo upload do arquivo de audio", icon: Upload },
      { key: "transcribing", label: "Transcrevendo", desc: "IA convertendo fala em texto", icon: FileText, optional: true },
      { key: "analyzing", label: "Analisando", desc: "Gerando resumo e insights clinicos", icon: Wand2, optional: true },
    ];

    const stepOrder: ProcessingStep[] = [
      "uploading",
      "transcribing",
      "analyzing",
    ];
    const currentIdx = stepOrder.indexOf(processingStep);

    return (
      <div className="min-h-dvh bg-gradient-to-b from-primary-50/40 to-surface flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-3xl bg-primary-100 animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Brain className="w-9 h-9 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              Processando sessao
            </h2>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-sm text-text-muted">
                {selectedPatient?.name}
              </span>
              <span className="text-text-muted/40">|</span>
              <span className="text-sm text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isComplete = currentIdx > idx || processingStep === "done";
              const isActive = currentIdx === idx && !error;
              const isStepPending = currentIdx < idx;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    isComplete &&
                      "bg-emerald-50/80 border-emerald-200/60 shadow-sm",
                    isActive &&
                      "bg-white border-primary-200 shadow-md shadow-primary-500/5",
                    isStepPending && "bg-surface/50 border-border-light opacity-40",
                    error && isActive && "bg-red-50 border-red-200 shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                      isComplete && "bg-emerald-100",
                      isActive && !error && "bg-primary-100",
                      isStepPending && "bg-surface",
                      error && isActive && "bg-red-100"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isActive && !error ? (
                      <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                    ) : error && isActive ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <StepIcon className="w-5 h-5 text-text-muted/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isComplete && "text-emerald-700",
                        isActive && !error && "text-primary-700",
                        error && isActive && "text-red-700",
                        isStepPending && "text-text-muted"
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-0.5",
                        isComplete && "text-emerald-600/70",
                        isActive && !error && "text-primary-600/70",
                        error && isActive && "text-red-600/70",
                        isStepPending && "text-text-muted/60"
                      )}
                    >
                      {isComplete ? "Concluido" : step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {!error && (
            <div className="mt-6 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700 ease-out"
                style={{
                  width:
                    processingStep === "done"
                      ? "100%"
                      : `${((currentIdx + 0.5) / 3) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-8">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200/60 mb-4">
                <p className="text-sm text-red-700 font-medium mb-1">
                  Erro no processamento
                </p>
                <p className="text-xs text-red-600/80">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}

          {!error && (
            <p className="text-center text-xs text-text-muted mt-6">
              Isso pode levar alguns minutos para sessoes longas...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4: Complete
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-dvh bg-surface">
      {/* Success header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/80 via-emerald-50/40 to-surface" />
        <div className="relative px-6 pt-10 pb-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20 animate-slide-up">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary animate-fade-in">
            Sessao concluida!
          </h2>
          <div className="flex items-center justify-center gap-3 mt-2 animate-fade-in">
            <span className="text-sm text-text-muted font-medium">
              {selectedPatient?.name}
            </span>
            <span className="text-text-muted/40">|</span>
            <span className="text-sm text-text-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-lg mx-auto px-4 pb-10 space-y-4 -mt-2">
        {/* Warnings */}
        {(warnings.transcribeSkipped || warnings.analyzeSkipped) && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200/60 p-5 animate-fade-in">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-amber-800">
                Processamento parcial
              </h3>
            </div>
            <div className="space-y-2">
              {warnings.transcribeSkipped && (
                <p className="text-xs text-amber-700 leading-relaxed">
                  {warnings.transcribeSkipped}
                </p>
              )}
              {warnings.analyzeSkipped && (
                <p className="text-xs text-amber-700 leading-relaxed">
                  {warnings.analyzeSkipped}
                </p>
              )}
            </div>
            <p className="text-[10px] text-amber-600 mt-3">
              O audio foi salvo. Voce pode reprocessar a sessao quando a IA estiver disponivel.
            </p>
          </div>
        )}

        {analysisResult && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  Resumo Clinico
                </h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {analysisResult.summary}
              </p>
            </div>

            {/* Insights */}
            {analysisResult.insights.length > 0 && (
              <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-warm-50 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-warm-600" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Insights Clinicos
                  </h3>
                </div>
                <div className="space-y-3">
                  {analysisResult.insights.map(
                    (insight: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl bg-warm-50/40"
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
                    )
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {analysisResult.suggestedTags.length > 0 && (
              <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-sage-600" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Tags Sugeridas
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.suggestedTags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-sage-50 text-sage-700 border border-sage-200/60"
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
        <div className="space-y-3 pt-4">
          <button
            onClick={() => navigate(`/consultations/${consultationId}`)}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Eye className="w-4.5 h-4.5" />
            Ver detalhes completos
          </button>
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white border border-border text-text-primary font-semibold hover:bg-surface-hover transition-colors"
          >
            <Mic className="w-4.5 h-4.5" />
            Nova sessao
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full text-center py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
