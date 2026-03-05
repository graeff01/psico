import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { DollarSign, ArrowRight, TrendingUp, Clock } from "lucide-react";

export function FinancialWidget() {
  const { data: report } = trpc.payments.getMonthlyReport.useQuery();

  if (!report) return null;

  const formatCurrency = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="bg-white rounded-xl border border-border-light p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary-600" />
          Financeiro do Mes
        </h3>
        <Link
          to="/payments"
          className="text-xs text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
        >
          Ver tudo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-emerald-50">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-medium text-emerald-700">
              Recebido
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-700">
            {formatCurrency(report.totalReceived)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] font-medium text-amber-700">
              Pendente
            </span>
          </div>
          <p className="text-lg font-bold text-amber-700">
            {formatCurrency(report.totalPending)}
          </p>
        </div>
      </div>
    </div>
  );
}
