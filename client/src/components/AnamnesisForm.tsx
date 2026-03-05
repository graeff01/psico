import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import {
  ClipboardList,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

interface AnamnesisData {
  queixaPrincipal?: string;
  inicioSintomas?: string;
  tratamentosAnteriores?: string;
  historicoFamiliar?: string;
  historicoSocial?: string;
  fatoresRisco?: string;
  medicamentos?: string;
  alergias?: string;
  usoSubstancias?: string;
  qualidadeSono?: string;
  objetivosTerapia?: string;
  observacoes?: string;
}

const SECTIONS = [
  { key: "queixaPrincipal", label: "Queixa Principal", placeholder: "Descreva a queixa principal do paciente..." },
  { key: "inicioSintomas", label: "Inicio dos Sintomas", placeholder: "Quando os sintomas comecaram? Como evoluiram?" },
  { key: "tratamentosAnteriores", label: "Tratamentos Anteriores", placeholder: "Tratamentos psicologicos ou psiquiatricos previos..." },
  { key: "historicoFamiliar", label: "Historico Familiar", placeholder: "Historico de saude mental na familia..." },
  { key: "historicoSocial", label: "Historico Social", placeholder: "Relacoes familiares, sociais, trabalho..." },
  { key: "fatoresRisco", label: "Fatores de Risco", placeholder: "Fatores de risco identificados..." },
  { key: "medicamentos", label: "Medicamentos em Uso", placeholder: "Medicamentos atuais e dosagens..." },
  { key: "alergias", label: "Alergias", placeholder: "Alergias conhecidas..." },
  { key: "usoSubstancias", label: "Uso de Substancias", placeholder: "Uso de alcool, tabaco, drogas..." },
  { key: "qualidadeSono", label: "Qualidade do Sono", placeholder: "Padrao de sono, dificuldades..." },
  { key: "objetivosTerapia", label: "Objetivos da Terapia", placeholder: "O que o paciente espera alcançar..." },
  { key: "observacoes", label: "Observacoes Adicionais", placeholder: "Outras observacoes relevantes..." },
] as const;

export function AnamnesisForm({ patientId }: { patientId: number }) {
  const [data, setData] = useState<AnamnesisData>({});
  const [expanded, setExpanded] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: existing, isLoading } = trpc.patients.getAnamnesis.useQuery(
    { patientId },
    { enabled: !!patientId }
  );

  const save = trpc.patients.saveAnamnesis.useMutation({
    onSuccess: () => {
      toast.success("Anamnese salva com sucesso!");
      setDirty(false);
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (existing) setData(existing);
  }, [existing]);

  const filledCount = SECTIONS.filter(
    (s) => data[s.key as keyof AnamnesisData]
  ).length;

  const handleChange = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    save.mutate({ patientId, data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border-light p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-text-primary">Anamnese</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              filledCount === SECTIONS.length
                ? "bg-emerald-50 text-emerald-700"
                : filledCount > 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-surface text-text-muted"
            }`}
          >
            {filledCount}/{SECTIONS.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleSave}
              disabled={save.isPending}
              className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center gap-1.5"
            >
              {save.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Salvar
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!expanded && filledCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {SECTIONS.filter((s) => data[s.key as keyof AnamnesisData]).map(
            (s) => (
              <span
                key={s.key}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-medium"
              >
                <CheckCircle2 className="w-3 h-3" />
                {s.label}
              </span>
            )
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-4 mt-2">
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {section.label}
              </label>
              <textarea
                value={data[section.key as keyof AnamnesisData] ?? ""}
                onChange={(e) => handleChange(section.key, e.target.value)}
                placeholder={section.placeholder}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
              />
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={save.isPending || !dirty}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {save.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Anamnese
          </button>
        </div>
      )}
    </div>
  );
}
