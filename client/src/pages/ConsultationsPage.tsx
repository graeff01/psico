import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { formatDateTime } from "../lib/utils";
import { CONSULTATION_STATUS } from "../lib/types";
import {
  Mic,
  Calendar,
  ChevronRight,
  Loader2,
  User,
  Clock,
} from "lucide-react";

export function ConsultationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading } = trpc.consultations.list.useQuery({
    status: statusFilter || undefined,
    page: 1,
    limit: 50,
  });

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
        <Link
          to="/session"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Mic className="w-4 h-4" />
          Gravar Sessao
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "Todas" },
          { value: "scheduled", label: "Agendadas" },
          { value: "in_progress", label: "Em Andamento" },
          { value: "completed", label: "Concluidas" },
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
            Grave uma sessao pelo tablet para criar consultas automaticamente
          </p>
          <Link
            to="/session"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Mic className="w-4 h-4" />
            Iniciar Sessao
          </Link>
        </div>
      )}
    </div>
  );
}
