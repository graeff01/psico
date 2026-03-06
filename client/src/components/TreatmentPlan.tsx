import { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { GOAL_STATUS, GOAL_PRIORITY } from "../lib/cid-dsm-data";
import {
  Plus,
  Loader2,
  X,
  Target,
  Trash2,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  patientId: number;
}

export function TreatmentPlan({ patientId }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [targetDate, setTargetDate] = useState("");

  const utils = trpc.useUtils();
  const { data: goals, isLoading } = trpc.clinical.listGoals.useQuery({
    patientId,
  });
  const addMutation = trpc.clinical.addGoal.useMutation();
  const updateMutation = trpc.clinical.updateGoal.useMutation();
  const deleteMutation = trpc.clinical.deleteGoal.useMutation();

  const handleAdd = async () => {
    if (!title.trim()) {
      toast.error("Informe o titulo da meta");
      return;
    }
    try {
      await addMutation.mutateAsync({
        patientId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        targetDate: targetDate || undefined,
      });
      toast.success("Meta adicionada");
      setShowAdd(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setTargetDate("");
      utils.clinical.listGoals.invalidate({ patientId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar");
    }
  };

  const handleUpdateStatus = async (
    id: number,
    status: "pending" | "in_progress" | "achieved" | "discontinued"
  ) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      utils.clinical.listGoals.invalidate({ patientId });
      toast.success("Status atualizado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover esta meta?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      utils.clinical.listGoals.invalidate({ patientId });
      toast.success("Meta removida");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const activeGoals = goals?.filter(
    (g: any) => g.status !== "achieved" && g.status !== "discontinued"
  ) ?? [];
  const completedGoals = goals?.filter(
    (g: any) => g.status === "achieved" || g.status === "discontinued"
  ) ?? [];

  return (
    <div className="bg-white rounded-xl border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Plano Terapeutico
            </h3>
            {goals && goals.length > 0 && (
              <p className="text-[10px] text-text-muted">
                {activeGoals.length} ativa{activeGoals.length !== 1 ? "s" : ""} / {completedGoals.length} concluida{completedGoals.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 border border-blue-200/60 transition-colors"
        >
          {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAdd ? "Cancelar" : "Nova Meta"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-4 rounded-xl bg-surface border border-border-light space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulo da meta terapeutica..."
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Descricao detalhada (opcional)..."
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              >
                <option value="low">Baixa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Data Alvo
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={addMutation.isPending || !title.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {addMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Adicionar Meta
          </button>
        </div>
      )}

      {/* Goals list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-sm text-text-muted">Carregando...</span>
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-4">
          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-2">
              {activeGoals.map((g: any) => {
                const statusInfo =
                  GOAL_STATUS[g.status as keyof typeof GOAL_STATUS] ??
                  GOAL_STATUS.pending;
                const priorityInfo =
                  GOAL_PRIORITY[g.priority as keyof typeof GOAL_PRIORITY] ??
                  GOAL_PRIORITY.medium;
                return (
                  <div
                    key={g.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface/50 border border-border-light"
                  >
                    <button
                      onClick={() =>
                        handleUpdateStatus(
                          g.id,
                          g.status === "pending" ? "in_progress" : "achieved"
                        )
                      }
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                        g.status === "in_progress"
                          ? "border-blue-400 bg-blue-50"
                          : "border-border hover:border-blue-300"
                      )}
                    >
                      {g.status === "in_progress" && (
                        <div className="w-2 h-2 rounded-sm bg-blue-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary font-medium">
                        {g.title}
                      </p>
                      {g.description && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {g.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            `bg-${priorityInfo.color}-50 text-${priorityInfo.color}-700`
                          )}
                        >
                          {priorityInfo.label}
                        </span>
                        <select
                          value={g.status}
                          onChange={(e) =>
                            handleUpdateStatus(g.id, e.target.value as any)
                          }
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium border-none appearance-none cursor-pointer",
                            `bg-${statusInfo.color}-50 text-${statusInfo.color}-700`
                          )}
                        >
                          <option value="pending">Pendente</option>
                          <option value="in_progress">Em andamento</option>
                          <option value="achieved">Alcancada</option>
                          <option value="discontinued">Descontinuada</option>
                        </select>
                        {g.targetDate && (
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(g.targetDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed goals */}
          {completedGoals.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Concluidas / Descontinuadas
              </p>
              <div className="space-y-1">
                {completedGoals.map((g: any) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-surface/30"
                  >
                    <CheckCircle2
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        g.status === "achieved"
                          ? "text-emerald-500"
                          : "text-red-400"
                      )}
                    />
                    <span className="text-sm text-text-muted line-through flex-1">
                      {g.title}
                    </span>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-4">
          Nenhuma meta terapeutica definida
        </p>
      )}
    </div>
  );
}
