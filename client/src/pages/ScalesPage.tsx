import { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { SCALES, type ScaleType } from "../lib/scales-data";
import { cn } from "../lib/utils";
import {
  ClipboardCheck,
  Loader2,
  ChevronRight,
  Search,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
} from "lucide-react";

type View = "select-patient" | "select-scale" | "apply" | "results";

export function ScalesPage() {
  const [view, setView] = useState<View>("select-patient");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [selectedScale, setSelectedScale] = useState<ScaleType | null>(null);
  const [responses, setResponses] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [search, setSearch] = useState("");

  const { data: patientsData } = trpc.patients.list.useQuery(
    { search, page: 1, limit: 50 },
    { enabled: view === "select-patient" }
  );

  const { data: history, refetch: refetchHistory } =
    trpc.clinical.getScaleHistory.useQuery(
      { patientId: selectedPatient?.id ?? 0 },
      { enabled: !!selectedPatient && (view === "results" || view === "select-scale") }
    );

  const applyMutation = trpc.clinical.applyScale.useMutation();
  const deleteMutation = trpc.clinical.deleteScale.useMutation();
  const utils = trpc.useUtils();

  const handleSelectPatient = (patient: { id: number; name: string }) => {
    setSelectedPatient(patient);
    setView("select-scale");
  };

  const handleStartScale = (scaleType: ScaleType) => {
    setSelectedScale(scaleType);
    const scale = SCALES[scaleType];
    setResponses(new Array(scale.questions.length).fill(-1));
    setCurrentQuestion(0);
    setView("apply");
  };

  const handleAnswer = (value: number) => {
    const newResponses = [...responses];
    newResponses[currentQuestion] = value;
    setResponses(newResponses);

    // Auto-advance
    if (currentQuestion < responses.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 200);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedScale) return;
    const scale = SCALES[selectedScale];
    const totalScore = responses.reduce((a, b) => a + b, 0);
    const severity = scale.getSeverity(totalScore);

    try {
      await applyMutation.mutateAsync({
        patientId: selectedPatient.id,
        scaleType: selectedScale,
        responses,
        totalScore,
        severity: severity.level,
      });
      toast.success(`${scale.name} aplicado! Score: ${totalScore} (${severity.label})`);
      refetchHistory();
      utils.clinical.getScaleHistory.invalidate({ patientId: selectedPatient.id });
      setView("results");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDeleteScale = async (id: number) => {
    if (!confirm("Remover esta aplicacao?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      refetchHistory();
      toast.success("Aplicacao removida");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const allAnswered = responses.every((r) => r >= 0);
  const patients = patientsData?.patients ?? [];

  // ─── Select Patient ──────────────────────────────────────────────────
  if (view === "select-patient") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Escalas Clinicas
          </h1>
          <p className="text-sm text-text-muted mt-1">
            PHQ-9, GAD-7, BDI-II — Aplique e acompanhe a evolucao
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400"
          />
        </div>

        <div className="grid gap-2 max-w-2xl">
          {patients.map((patient: any) => (
            <button
              key={patient.id}
              onClick={() =>
                handleSelectPatient({ id: patient.id, name: patient.name })
              }
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-border-light hover:border-primary-300 hover:shadow-sm transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-600">
                  {patient.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {patient.name}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Select Scale ──────────────────────────────────────────────────
  if (view === "select-scale") {
    const scaleEntries = Object.entries(SCALES) as [ScaleType, typeof SCALES[ScaleType]][];

    // Group history by scale type for mini-charts
    const historyByScale: Record<string, any[]> = {};
    if (history) {
      for (const h of history) {
        if (!historyByScale[h.scaleType]) historyByScale[h.scaleType] = [];
        historyByScale[h.scaleType].push(h);
      }
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView("select-patient");
              setSelectedPatient(null);
            }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {selectedPatient?.name}
            </h1>
            <p className="text-sm text-text-muted">
              Selecione a escala para aplicar
            </p>
          </div>
        </div>

        <div className="grid gap-4 max-w-2xl">
          {scaleEntries.map(([key, scale]) => {
            const scaleHistory = historyByScale[key] ?? [];
            const lastApp = scaleHistory[0];

            return (
              <div
                key={key}
                className="bg-white rounded-xl border border-border-light p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-text-primary">
                      {scale.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {scale.description}
                    </p>
                    <p className="text-[10px] text-text-muted/70 mt-0.5">
                      {scale.questions.length} questoes | Score max: {scale.maxScore}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartScale(key)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Aplicar
                  </button>
                </div>

                {/* Last application */}
                {lastApp && (
                  <div className="p-3 rounded-lg bg-surface/50 border border-border-light">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">
                        Ultima aplicacao:{" "}
                        {new Date(lastApp.appliedAt).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          {lastApp.totalScore}/{scale.maxScore}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium",
                            `bg-${scale.getSeverity(lastApp.totalScore).color}-50 text-${scale.getSeverity(lastApp.totalScore).color}-700`
                          )}
                        >
                          {scale.getSeverity(lastApp.totalScore).label}
                        </span>
                      </div>
                    </div>

                    {/* Mini evolution chart */}
                    {scaleHistory.length >= 2 && (
                      <div className="mt-2 flex items-end gap-1 h-8">
                        {scaleHistory
                          .slice(0, 10)
                          .reverse()
                          .map((h: any, i: number) => {
                            const pct = (h.totalScore / scale.maxScore) * 100;
                            const sev = scale.getSeverity(h.totalScore);
                            return (
                              <div
                                key={h.id}
                                className={cn(
                                  "flex-1 rounded-sm min-w-[4px]",
                                  `bg-${sev.color}-400`
                                )}
                                style={{ height: `${Math.max(10, pct)}%` }}
                                title={`${h.totalScore} - ${new Date(h.appliedAt).toLocaleDateString("pt-BR")}`}
                              />
                            );
                          })}
                      </div>
                    )}

                    {/* Trend */}
                    {scaleHistory.length >= 2 && (
                      <div className="mt-1.5 flex items-center gap-1">
                        {scaleHistory[0].totalScore <
                        scaleHistory[1].totalScore ? (
                          <>
                            <TrendingDown className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 font-medium">
                              Melhora de{" "}
                              {scaleHistory[1].totalScore -
                                scaleHistory[0].totalScore}{" "}
                              pontos
                            </span>
                          </>
                        ) : scaleHistory[0].totalScore >
                          scaleHistory[1].totalScore ? (
                          <>
                            <TrendingUp className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] text-red-600 font-medium">
                              Aumento de{" "}
                              {scaleHistory[0].totalScore -
                                scaleHistory[1].totalScore}{" "}
                              pontos
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-3 h-3 text-text-muted" />
                            <span className="text-[10px] text-text-muted font-medium">
                              Estavel
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* View full history button */}
        {history && history.length > 0 && (
          <button
            onClick={() => setView("results")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Ver historico completo ({history.length} aplicacoes)
          </button>
        )}
      </div>
    );
  }

  // ─── Apply Scale ──────────────────────────────────────────────────
  if (view === "apply" && selectedScale) {
    const scale = SCALES[selectedScale];
    const question = scale.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / scale.questions.length) * 100;
    const currentScore = responses.reduce((a, b) => a + Math.max(0, b), 0);

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("select-scale")}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-text-primary">
              {scale.name} - {selectedPatient?.name}
            </h1>
            <p className="text-xs text-text-muted">{scale.fullName}</p>
          </div>
          <span className="text-sm font-mono font-bold text-primary-600">
            {currentQuestion + 1}/{scale.questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question nav dots */}
        <div className="flex gap-1.5 flex-wrap">
          {scale.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestion(i)}
              className={cn(
                "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                i === currentQuestion
                  ? "bg-primary-600 text-white"
                  : responses[i] >= 0
                    ? "bg-primary-50 text-primary-700 border border-primary-200"
                    : "bg-surface text-text-muted border border-border-light"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">
            Nas ultimas 2 semanas, com que frequencia voce foi incomodado(a) por:
          </p>
          <p className="text-base font-medium text-text-primary leading-relaxed mb-6">
            {selectedScale === "bdi" ? question.split(" — ")[0] : question}
          </p>

          {/* BDI has descriptions in the question text */}
          {selectedScale === "bdi" && question.includes(" — ") && (
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              {question.split(" — ")[1]}
            </p>
          )}

          {/* Options */}
          <div className="space-y-2">
            {scale.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                  responses[currentQuestion] === option.value
                    ? "bg-primary-50 border-primary-300 shadow-sm"
                    : "bg-white border-border-light hover:border-primary-200 hover:bg-primary-50/30"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    responses[currentQuestion] === option.value
                      ? "bg-primary-600 text-white"
                      : "bg-surface text-text-muted"
                  )}
                >
                  {option.value}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    responses[currentQuestion] === option.value
                      ? "text-primary-700"
                      : "text-text-secondary"
                  )}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation + Submit */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40 transition-colors"
          >
            Anterior
          </button>

          <span className="text-xs text-text-muted">
            Score parcial: {currentScore}
          </span>

          {currentQuestion < scale.questions.length - 1 ? (
            <button
              onClick={() =>
                setCurrentQuestion(
                  Math.min(scale.questions.length - 1, currentQuestion + 1)
                )
              }
              className="px-4 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              Proxima
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || applyMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {applyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Finalizar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Results History ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView("select-scale")}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Historico - {selectedPatient?.name}
          </h1>
          <p className="text-sm text-text-muted">
            Todas as aplicacoes de escalas clinicas
          </p>
        </div>
      </div>

      {/* Scale tabs */}
      {history && history.length > 0 ? (
        <>
          {/* Evolution charts per scale */}
          {(["phq9", "gad7", "bdi"] as ScaleType[]).map((scaleType) => {
            const scaleHistory = history.filter(
              (h: any) => h.scaleType === scaleType
            );
            if (scaleHistory.length === 0) return null;
            const scale = SCALES[scaleType];

            return (
              <div
                key={scaleType}
                className="bg-white rounded-xl border border-border-light p-5"
              >
                <h3 className="text-sm font-bold text-text-primary mb-1">
                  {scale.name}
                </h3>
                <p className="text-xs text-text-muted mb-4">
                  {scaleHistory.length} aplicacao{scaleHistory.length !== 1 ? "es" : ""}
                </p>

                {/* Visual bar chart */}
                <div className="flex items-end gap-2 h-24 mb-4">
                  {scaleHistory
                    .slice(0, 12)
                    .reverse()
                    .map((h: any) => {
                      const pct = (h.totalScore / scale.maxScore) * 100;
                      const sev = scale.getSeverity(h.totalScore);
                      return (
                        <div
                          key={h.id}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-[9px] font-bold text-text-secondary">
                            {h.totalScore}
                          </span>
                          <div
                            className={cn(
                              "w-full rounded-t-md min-h-[4px]",
                              sev.color === "emerald" && "bg-emerald-400",
                              sev.color === "yellow" && "bg-yellow-400",
                              sev.color === "amber" && "bg-amber-400",
                              sev.color === "orange" && "bg-orange-400",
                              sev.color === "red" && "bg-red-400"
                            )}
                            style={{ height: `${Math.max(8, pct)}%` }}
                          />
                          <span className="text-[8px] text-text-muted">
                            {new Date(h.appliedAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* History table */}
                <div className="divide-y divide-border-light">
                  {scaleHistory.map((h: any) => {
                    const sev = scale.getSeverity(h.totalScore);
                    return (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <span className="text-xs text-text-muted w-20">
                          {new Date(h.appliedAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-sm font-bold text-text-primary w-12">
                          {h.totalScore}/{scale.maxScore}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium",
                            sev.color === "emerald" && "bg-emerald-50 text-emerald-700",
                            sev.color === "yellow" && "bg-yellow-50 text-yellow-700",
                            sev.color === "amber" && "bg-amber-50 text-amber-700",
                            sev.color === "orange" && "bg-orange-50 text-orange-700",
                            sev.color === "red" && "bg-red-50 text-red-700"
                          )}
                        >
                          {sev.label}
                        </span>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleDeleteScale(h.id)}
                          className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            Nenhuma escala aplicada ainda
          </p>
        </div>
      )}
    </div>
  );
}
