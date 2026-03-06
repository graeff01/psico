import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { PATIENT_MOODS, COMMON_INTERVENTIONS } from "../lib/scales-data";
import {
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  consultationId: number;
}

export function EvolutionForm({ consultationId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [sessionNumber, setSessionNumber] = useState<number | undefined>();
  const [sessionObjective, setSessionObjective] = useState("");
  const [techniquesUsed, setTechniquesUsed] = useState("");
  const [clinicalObservations, setClinicalObservations] = useState("");
  const [patientMood, setPatientMood] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [nextSessionPlan, setNextSessionPlan] = useState("");
  const [interventions, setInterventions] = useState<string[]>([]);

  const { data: existing, isLoading } =
    trpc.evolution.getByConsultation.useQuery({ consultationId });

  const saveMutation = trpc.evolution.save.useMutation();

  useEffect(() => {
    if (existing) {
      setSessionNumber(existing.sessionNumber ?? undefined);
      setSessionObjective(existing.sessionObjective ?? "");
      setTechniquesUsed(existing.techniquesUsed ?? "");
      setClinicalObservations(existing.clinicalObservations ?? "");
      setPatientMood(existing.patientMood ?? "");
      setProgressNotes(existing.progressNotes ?? "");
      setNextSessionPlan(existing.nextSessionPlan ?? "");
      setInterventions(existing.interventions ?? []);
      setExpanded(true);
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        consultationId,
        sessionNumber,
        sessionObjective: sessionObjective || undefined,
        techniquesUsed: techniquesUsed || undefined,
        clinicalObservations: clinicalObservations || undefined,
        patientMood: patientMood || undefined,
        progressNotes: progressNotes || undefined,
        nextSessionPlan: nextSessionPlan || undefined,
        interventions,
      });
      setDirty(false);
      toast.success("Prontuario de evolucao salvo!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const toggleIntervention = (intervention: string) => {
    setDirty(true);
    setInterventions((prev) =>
      prev.includes(intervention)
        ? prev.filter((i) => i !== intervention)
        : [...prev, intervention]
    );
  };

  const markDirty = () => setDirty(true);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-border-light p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
          <span className="text-sm text-text-muted">Carregando prontuario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border-light overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <ClipboardList className="w-4.5 h-4.5 text-violet-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-text-primary">
              Prontuario de Evolucao
            </h3>
            <p className="text-xs text-text-muted">
              {existing
                ? "Registro preenchido"
                : "Registro CFP obrigatorio por sessao"}
            </p>
          </div>
          {existing && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200/60">
              Salvo
            </span>
          )}
          {dirty && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200/60">
              Nao salvo
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border-light p-5 space-y-5">
          {/* Row 1: Session number + Mood */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Numero da Sessao
              </label>
              <input
                type="number"
                min={1}
                value={sessionNumber ?? ""}
                onChange={(e) => {
                  setSessionNumber(e.target.value ? Number(e.target.value) : undefined);
                  markDirty();
                }}
                placeholder="Ex: 12"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Estado Emocional do Paciente
              </label>
              <select
                value={patientMood}
                onChange={(e) => {
                  setPatientMood(e.target.value);
                  markDirty();
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400"
              >
                <option value="">Selecionar...</option>
                {PATIENT_MOODS.map((mood) => (
                  <option key={mood.value} value={mood.value}>
                    {mood.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Objetivo da Sessao
            </label>
            <textarea
              value={sessionObjective}
              onChange={(e) => {
                setSessionObjective(e.target.value);
                markDirty();
              }}
              rows={2}
              placeholder="Qual era o objetivo principal desta sessao..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 resize-none"
            />
          </div>

          {/* Clinical Observations */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Observacoes Clinicas
            </label>
            <textarea
              value={clinicalObservations}
              onChange={(e) => {
                setClinicalObservations(e.target.value);
                markDirty();
              }}
              rows={3}
              placeholder="Observacoes sobre comportamento, afeto, discurso, aparencia do paciente..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 resize-none"
            />
          </div>

          {/* Interventions */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">
              Intervencoes / Tecnicas Utilizadas
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTERVENTIONS.map((intervention) => {
                const selected = interventions.includes(intervention);
                return (
                  <button
                    key={intervention}
                    type="button"
                    onClick={() => toggleIntervention(intervention)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      selected
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-surface text-text-muted border-border-light hover:border-violet-200 hover:text-violet-600"
                    )}
                  >
                    {selected && <Check className="w-3 h-3 inline mr-1" />}
                    {intervention}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Techniques description */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Descricao das Tecnicas (detalhamento)
            </label>
            <textarea
              value={techniquesUsed}
              onChange={(e) => {
                setTechniquesUsed(e.target.value);
                markDirty();
              }}
              rows={2}
              placeholder="Detalhamento das tecnicas e intervencoes aplicadas..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 resize-none"
            />
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Notas de Progresso
            </label>
            <textarea
              value={progressNotes}
              onChange={(e) => {
                setProgressNotes(e.target.value);
                markDirty();
              }}
              rows={3}
              placeholder="Evolucao do paciente, avancos, dificuldades observadas..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 resize-none"
            />
          </div>

          {/* Next Session Plan */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Plano para Proxima Sessao
            </label>
            <textarea
              value={nextSessionPlan}
              onChange={(e) => {
                setNextSessionPlan(e.target.value);
                markDirty();
              }}
              rows={2}
              placeholder="O que trabalhar na proxima sessao, tarefas para o paciente..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Prontuario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
