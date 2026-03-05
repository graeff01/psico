import { useState } from "react";
import { trpc } from "../lib/trpc";
import { formatDate } from "../lib/utils";
import { PAYMENT_STATUS, PAYMENT_METHODS } from "../lib/types";
import { toast } from "sonner";
import {
  DollarSign,
  Plus,
  Filter,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
  Save,
  User,
  CreditCard,
} from "lucide-react";

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = trpc.payments.list.useQuery({
    status: statusFilter || undefined,
    limit: 50,
    page: 1,
  });

  const { data: report } = trpc.payments.getMonthlyReport.useQuery();

  const formatCurrency = (cents: number) =>
    `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Financeiro</h1>
          <p className="text-text-secondary text-sm">
            Controle de pagamentos e receitas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Pagamento
        </button>
      </div>

      {/* Monthly Summary */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border-light p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(report.totalReceived)}
            </p>
            <p className="text-xs text-text-muted">
              Recebido este mes ({report.paidCount} pagamentos)
            </p>
          </div>
          <div className="bg-white rounded-xl border border-border-light p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(report.totalPending)}
            </p>
            <p className="text-xs text-text-muted">
              Pendente ({report.pendingCount} pagamentos)
            </p>
          </div>
          <div className="bg-white rounded-xl border border-border-light p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {formatCurrency(report.totalReceived + report.totalPending)}
            </p>
            <p className="text-xs text-text-muted">Total do mes</p>
          </div>
        </div>
      )}

      {/* Methods breakdown */}
      {report && report.byMethod.length > 0 && (
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Receita por Metodo
          </h3>
          <div className="flex flex-wrap gap-3">
            {report.byMethod.map((m) => (
              <div
                key={m.method}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface"
              >
                <CreditCard className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">
                  {PAYMENT_METHODS[
                    m.method as keyof typeof PAYMENT_METHODS
                  ] ?? m.method}
                </span>
                <span className="text-sm text-text-secondary">
                  {formatCurrency(m.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "Todos" },
          { value: "pending", label: "Pendentes" },
          { value: "paid", label: "Pagos" },
          { value: "cancelled", label: "Cancelados" },
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

      {/* Payments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : data?.payments && data.payments.length > 0 ? (
        <div className="bg-white rounded-xl border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light bg-surface">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Paciente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Valor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Metodo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <DollarSign className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            Nenhum pagamento encontrado
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Registrar Pagamento
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && <PaymentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function PaymentRow({
  payment,
  formatCurrency,
}: {
  payment: any;
  formatCurrency: (n: number) => string;
}) {
  const utils = trpc.useUtils();
  const update = trpc.payments.update.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.payments.getMonthlyReport.invalidate();
      toast.success("Pagamento atualizado!");
    },
  });

  const markPaid = () => {
    update.mutate({
      id: payment.id,
      data: { status: "paid", paidAt: new Date().toISOString() },
    });
  };

  return (
    <tr className="border-b border-border-light hover:bg-surface-hover/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">
            {payment.patientName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-text-primary">
        {formatCurrency(payment.amount)}
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary">
        {payment.method
          ? PAYMENT_METHODS[
              payment.method as keyof typeof PAYMENT_METHODS
            ] ?? payment.method
          : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              payment.status === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : payment.status === "pending"
                  ? "bg-amber-50 text-amber-700"
                  : payment.status === "cancelled"
                    ? "bg-red-50 text-red-700"
                    : "bg-blue-50 text-blue-700"
            }`}
          >
            {PAYMENT_STATUS[
              payment.status as keyof typeof PAYMENT_STATUS
            ] ?? payment.status}
          </span>
          {payment.status === "pending" && (
            <button
              onClick={markPaid}
              disabled={update.isPending}
              className="text-[10px] text-emerald-600 font-medium hover:text-emerald-700"
            >
              Confirmar
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {formatDate(payment.createdAt)}
      </td>
    </tr>
  );
}

function PaymentModal({ onClose }: { onClose: () => void }) {
  const [patientId, setPatientId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const [notes, setNotes] = useState("");

  const { data: patients } = trpc.patients.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();

  const create = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.payments.getMonthlyReport.invalidate();
      toast.success("Pagamento registrado!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !amount) return;

    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    create.mutate({
      patientId,
      amount: cents,
      status,
      method: (method as any) || undefined,
      notes: notes || undefined,
      paidAt: status === "paid" ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Novo Pagamento
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Paciente
            </label>
            <select
              value={patientId ?? ""}
              onChange={(e) => setPatientId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecionar paciente...</option>
              {patients?.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Valor (R$)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150,00"
              required
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Metodo
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecionar...</option>
              {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("pending")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${
                  status === "pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "border-border-light text-text-muted hover:bg-surface-hover"
                }`}
              >
                Pendente
              </button>
              <button
                type="button"
                onClick={() => setStatus("paid")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${
                  status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "border-border-light text-text-muted hover:bg-surface-hover"
                }`}
              >
                Pago
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Observacoes (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!patientId || !amount || create.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {create.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
