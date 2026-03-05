import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { formatDate } from "../lib/utils";
import { RISK_LEVELS } from "../lib/types";
import { AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";

export function RiskAlertsWidget() {
  const { data: alerts } = trpc.consultations.getRiskAlerts.useQuery();

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-border-light p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        Alertas de Risco
      </h3>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => {
          const risk =
            RISK_LEVELS[
              (alert.riskLevel as keyof typeof RISK_LEVELS) || "medium"
            ] ?? RISK_LEVELS.medium;

          return (
            <Link
              key={alert.id}
              to={`/consultations/${alert.consultationId}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
            >
              <div
                className={`w-9 h-9 rounded-lg ${risk.bg} flex items-center justify-center`}
              >
                <AlertTriangle className={`w-4 h-4 ${risk.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {alert.patientName}
                </p>
                <p className="text-xs text-text-muted">
                  {formatDate(alert.consultationDate)} —{" "}
                  <span className={`font-medium ${risk.color}`}>
                    Risco {risk.label}
                  </span>
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-600" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
