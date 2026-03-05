import { useParams, Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { formatDate } from "../lib/utils";
import { RISK_LEVELS } from "../lib/types";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Brain,
  Tag,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export function PatientTimelinePage() {
  const { id } = useParams();
  const patientId = Number(id);

  const { data: patient, isLoading: loadingPatient } =
    trpc.patients.getById.useQuery({ id: patientId }, { enabled: !!id });

  const { data: timeline, isLoading: loadingTimeline } =
    trpc.consultations.getPatientTimeline.useQuery(
      { patientId },
      { enabled: !!id }
    );

  if (loadingPatient || loadingTimeline) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Paciente nao encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to={`/patients/${patientId}`}
          className="mt-1 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">
            Evolucao - {patient.name}
          </h1>
          <p className="text-sm text-text-secondary flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {timeline?.length ?? 0} consultas registradas
          </p>
        </div>
      </div>

      {/* Timeline */}
      {timeline && timeline.length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border-light" />

          <div className="space-y-6">
            {timeline.map((entry, index) => {
              const risk =
                RISK_LEVELS[
                  (entry.riskLevel as keyof typeof RISK_LEVELS) || "none"
                ] ?? RISK_LEVELS.none;

              return (
                <div key={entry.id} className="relative pl-12">
                  {/* Dot */}
                  <div
                    className={`absolute left-3.5 w-3 h-3 rounded-full border-2 border-white ${
                      entry.status === "completed"
                        ? "bg-emerald-500"
                        : entry.status === "in_progress"
                          ? "bg-blue-500"
                          : entry.status === "cancelled"
                            ? "bg-red-400"
                            : "bg-amber-400"
                    }`}
                  />

                  <div className="bg-white rounded-xl border border-border-light p-5 hover:shadow-sm transition-shadow">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-primary-500" />
                          {formatDate(entry.date)}
                        </span>
                        {entry.duration && (
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.duration} min
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.riskLevel && entry.riskLevel !== "none" && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${risk.bg} ${risk.color} ${risk.border} border`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {risk.label}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted">
                          #{index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Analysis */}
                    {entry.analysis ? (
                      <div className="space-y-3">
                        {entry.analysis.summary && (
                          <div className="p-3 rounded-lg bg-primary-50/50 border border-primary-100">
                            <p className="text-xs font-medium text-primary-700 mb-1 flex items-center gap-1">
                              <Brain className="w-3 h-3" /> Resumo
                            </p>
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {entry.analysis.summary}
                            </p>
                          </div>
                        )}

                        {entry.analysis.insights &&
                          entry.analysis.insights.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-warm-500" />{" "}
                                Insights
                              </p>
                              <div className="space-y-1">
                                {entry.analysis.insights.map(
                                  (insight, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-text-secondary"
                                    >
                                      <span className="text-[10px] font-bold text-warm-500 mt-0.5">
                                        {i + 1}.
                                      </span>
                                      <span className="leading-relaxed">
                                        {insight}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    ) : entry.notes ? (
                      <p className="text-sm text-text-secondary italic">
                        {entry.notes}
                      </p>
                    ) : (
                      <p className="text-sm text-text-muted italic">
                        Sem analise ou anotacoes
                      </p>
                    )}

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border-light">
                        <Tag className="w-3 h-3 text-text-muted mt-0.5" />
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-sage-50 text-sage-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Link */}
                    <Link
                      to={`/consultations/${entry.id}`}
                      className="mt-3 inline-block text-xs text-primary-600 font-medium hover:text-primary-700"
                    >
                      Ver consulta completa →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <TrendingUp className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            Nenhuma consulta registrada
          </p>
          <p className="text-text-muted text-sm mt-1">
            Grave sessoes para acompanhar a evolucao do paciente
          </p>
        </div>
      )}
    </div>
  );
}
