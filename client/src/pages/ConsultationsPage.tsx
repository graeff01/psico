import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "../lib/utils";
import { CONSULTATION_STATUS, CLINICAL_TAGS } from "../lib/types";
import {
  Plus,
  Calendar,
  ChevronRight,
  Loader2,
  X,
  User,
  Clock,
} from "lucide-react";

export function ConsultationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: patientsData } = trpc.patients.list.useQuery({
    limit: 100,
  });

  const { data, isLoading, refetch } = trpc.consultations.list.useQuery({
    status: statusFilter || undefined,
    page: 1,
    limit: 50,
  });

  const createConsultation = trpc.consultations.create.useMutation({
    onSuccess: () => {
      toast.success("Consulta criada com sucesso!");
      setShowForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    patientId: 0,
    date: new Date().toISOString().slice(0, 16),
    notes: "",
    tags: [] as string[],
    status: "scheduled" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast.error("Selecione um paciente");
      return;
    }
    createConsultation.mutate(form);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Consultas</h1>
          <p className="text-text-secondary text-sm">
            {data?.total ?? 0} consultas registradas
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancelar" : "Nova Consulta"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border-light p-6 animate-slide-up">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Agendar nova consulta
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Paciente *
                </label>
                <select
                  value={form.patientId}
                  onChange={(e) =>
                    setForm({ ...form, patientId: Number(e.target.value) })
                  }
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value={0}>Selecione o paciente</option>
                  {patientsData?.patients?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Data e hora *
                </label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Anotações iniciais
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Observações prévias da consulta..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CLINICAL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter((t) => t !== tag)
                          : [...prev.tags, tag],
                      }))
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      form.tags.includes(tag)
                        ? "bg-primary-100 text-primary-700 border border-primary-300"
                        : "bg-surface text-text-secondary border border-border hover:border-primary-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createConsultation.isPending}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {createConsultation.isPending ? "Criando..." : "Criar Consulta"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {[
          { value: "", label: "Todas" },
          { value: "scheduled", label: "Agendadas" },
          { value: "in_progress", label: "Em Andamento" },
          { value: "completed", label: "Concluídas" },
          { value: "cancelled", label: "Canceladas" },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-primary-100 text-primary-700"
                : "bg-white text-text-muted border border-border-light hover:text-text-secondary"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : data?.consultations && data.consultations.length > 0 ? (
        <div className="space-y-2">
          {data.consultations.map((consult) => (
            <Link
              key={consult.id}
              to={`/consultations/${consult.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-border-light p-4 hover:shadow-sm hover:border-primary-200 transition-all group"
            >
              <div className="w-11 h-11 rounded-lg bg-sage-50 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-sage-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {consult.patientName}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(consult.date)}
                  </span>
                  {consult.duration && (
                    <span className="text-xs text-text-muted">
                      {consult.duration} min
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  consult.status === "completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : consult.status === "in_progress"
                      ? "bg-blue-50 text-blue-700"
                      : consult.status === "cancelled"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                }`}
              >
                {CONSULTATION_STATUS[
                  consult.status as keyof typeof CONSULTATION_STATUS
                ] ?? consult.status}
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-600" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Calendar className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            Nenhuma consulta encontrada
          </p>
          <p className="text-text-muted text-sm mt-1">
            Agende uma consulta para começar
          </p>
        </div>
      )}
    </div>
  );
}
