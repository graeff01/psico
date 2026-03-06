import { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import {
  CID10_CODES,
  DSM5_CODES,
  DIAGNOSIS_STATUS,
  type DiagnosticCode,
} from "../lib/cid-dsm-data";
import {
  Plus,
  Search,
  Loader2,
  X,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  patientId: number;
}

export function DiagnosisManager({ patientId }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [system, setSystem] = useState<"cid10" | "dsm5">("cid10");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiagnosticCode | null>(null);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: diagnoses, isLoading } = trpc.clinical.listDiagnoses.useQuery({
    patientId,
  });
  const addMutation = trpc.clinical.addDiagnosis.useMutation();
  const updateMutation = trpc.clinical.updateDiagnosis.useMutation();
  const deleteMutation = trpc.clinical.deleteDiagnosis.useMutation();

  const codes = system === "cid10" ? CID10_CODES : DSM5_CODES;
  const filtered = search.length >= 2
    ? codes.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()) ||
          c.category.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleAdd = async () => {
    if (!selected) return;
    try {
      await addMutation.mutateAsync({
        patientId,
        code: selected.code,
        system,
        description: selected.description,
        notes: notes || undefined,
      });
      toast.success("Diagnostico adicionado");
      setShowAdd(false);
      setSelected(null);
      setNotes("");
      setSearch("");
      utils.clinical.listDiagnoses.invalidate({ patientId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar");
    }
  };

  const handleUpdateStatus = async (
    id: number,
    status: "active" | "in_remission" | "resolved"
  ) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      utils.clinical.listDiagnoses.invalidate({ patientId });
      toast.success("Status atualizado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover este diagnostico?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      utils.clinical.listDiagnoses.invalidate({ patientId });
      toast.success("Diagnostico removido");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">
            Diagnosticos (CID-10 / DSM-5)
          </h3>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 border border-rose-200/60 transition-colors"
        >
          {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAdd ? "Cancelar" : "Adicionar"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-4 rounded-xl bg-surface border border-border-light space-y-3">
          {/* System toggle */}
          <div className="flex gap-2">
            {(["cid10", "dsm5"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSystem(s);
                  setSearch("");
                  setSelected(null);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  system === s
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-white text-text-muted border-border-light hover:border-rose-200"
                )}
              >
                {s === "cid10" ? "CID-10" : "DSM-5"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder="Buscar codigo ou descricao... (min. 2 caracteres)"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400"
            />
          </div>

          {/* Results */}
          {filtered.length > 0 && !selected && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border-light divide-y divide-border-light">
              {filtered.slice(0, 20).map((code) => (
                <button
                  key={code.code}
                  onClick={() => {
                    setSelected(code);
                    setSearch(`${code.code} - ${code.description}`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-rose-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      {code.code}
                    </span>
                    <span className="text-xs text-text-secondary truncate">
                      {code.description}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {code.category}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Selected + notes */}
          {selected && (
            <>
              <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-rose-700">
                    {selected.code}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {selected.description}
                  </span>
                </div>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notas adicionais (opcional)..."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 resize-none"
              />
              <button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-60 transition-colors"
              >
                {addMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Confirmar Diagnostico
              </button>
            </>
          )}
        </div>
      )}

      {/* Diagnoses list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
          <span className="text-sm text-text-muted">Carregando...</span>
        </div>
      ) : diagnoses && diagnoses.length > 0 ? (
        <div className="space-y-2">
          {diagnoses.map((d: any) => {
            const statusInfo =
              DIAGNOSIS_STATUS[d.status as keyof typeof DIAGNOSIS_STATUS] ??
              DIAGNOSIS_STATUS.active;
            return (
              <div
                key={d.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-surface/50 border border-border-light"
              >
                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded mt-0.5">
                  {d.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium">
                    {d.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-medium text-text-muted">
                      {d.system === "cid10" ? "CID-10" : "DSM-5"}
                    </span>
                    <select
                      value={d.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          d.id,
                          e.target.value as "active" | "in_remission" | "resolved"
                        )
                      }
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium border appearance-none cursor-pointer",
                        `bg-${statusInfo.color}-50 text-${statusInfo.color}-700 border-${statusInfo.color}-200`
                      )}
                    >
                      <option value="active">Ativo</option>
                      <option value="in_remission">Em remissao</option>
                      <option value="resolved">Resolvido</option>
                    </select>
                  </div>
                  {d.notes && (
                    <p className="text-xs text-text-muted mt-1">{d.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-4">
          Nenhum diagnostico registrado
        </p>
      )}
    </div>
  );
}
