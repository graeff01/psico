import { useSession } from "../lib/auth-client";
import { trpc } from "../lib/trpc";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Plus,
  ArrowRight,
  Brain,
  Mic,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["#5c7cfa", "#4f7a58", "#db8b2e", "#e64980", "#845ef7", "#20c997"];

export function DashboardPage() {
  const { data: session } = useSession();
  const { data: patientStats } = trpc.patients.getStats.useQuery();
  const { data: consultationStats } = trpc.consultations.getStats.useQuery({
    period: "month",
  });

  const firstName = session?.user?.name?.split(" ")[0] ?? "Profissional";

  const statsCards = [
    {
      label: "Pacientes ativos",
      value: patientStats?.activePatients ?? 0,
      total: patientStats?.totalPatients ?? 0,
      icon: Users,
      color: "text-primary-600",
      bg: "bg-primary-50",
    },
    {
      label: "Consultas realizadas",
      value: patientStats?.completedConsultations ?? 0,
      total: patientStats?.totalConsultations ?? 0,
      icon: Calendar,
      color: "text-sage-600",
      bg: "bg-sage-50",
    },
    {
      label: "Consultas no período",
      value: consultationStats?.total ?? 0,
      icon: TrendingUp,
      color: "text-warm-600",
      bg: "bg-warm-50",
    },
    {
      label: "Taxa de conclusão",
      value: patientStats?.totalConsultations
        ? `${Math.round(((patientStats?.completedConsultations ?? 0) / patientStats.totalConsultations) * 100)}%`
        : "0%",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Olá, {firstName}
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Aqui está o resumo do seu consultório
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/patients"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-border-light p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
            {"total" in stat && stat.total !== undefined && (
              <p className="text-xs text-text-muted">
                de {stat.total} total
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultas por mês */}
        <div className="bg-white rounded-xl border border-border-light p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Consultas por Período
          </h3>
          {consultationStats?.byMonth && consultationStats.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={consultationStats.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#8b919a" />
                <YAxis tick={{ fontSize: 12 }} stroke="#8b919a" />
                <Tooltip />
                <Bar dataKey="count" fill="#5c7cfa" radius={[4, 4, 0, 0]} name="Consultas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm">
              Nenhuma consulta registrada ainda
            </div>
          )}
        </div>

        {/* Tags mais usadas */}
        <div className="bg-white rounded-xl border border-border-light p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Tags Mais Utilizadas
          </h3>
          {consultationStats?.topTags && consultationStats.topTags.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={consultationStats.topTags}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="tag"
                  label={({ tag }) => tag}
                >
                  {consultationStats.topTags.map((_: unknown, index: number) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm">
              Nenhuma tag registrada ainda
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/session"
            className="flex items-center gap-3 p-4 rounded-lg border border-border-light hover:border-primary-200 hover:bg-primary-50/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-sage-50 flex items-center justify-center group-hover:bg-sage-100">
              <Mic className="w-5 h-5 text-sage-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Iniciar Sessao
              </p>
              <p className="text-xs text-text-muted">
                Gravar e transcrever com IA
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-600" />
          </Link>

          <Link
            to="/patients"
            className="flex items-center gap-3 p-4 rounded-lg border border-border-light hover:border-primary-200 hover:bg-primary-50/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Ver Pacientes
              </p>
              <p className="text-xs text-text-muted">
                Prontuários e histórico
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-600" />
          </Link>

          <button
            onClick={() => {
              const event = new CustomEvent("open-ai-chat");
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-3 p-4 rounded-lg border border-border-light hover:border-primary-200 hover:bg-primary-50/50 transition-colors group text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-warm-50 flex items-center justify-center group-hover:bg-warm-100">
              <Brain className="w-5 h-5 text-warm-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Chat com IA
              </p>
              <p className="text-xs text-text-muted">
                Insights e análises
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-600" />
          </button>
        </div>
      </div>

      {/* Security footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-text-muted py-2">
        <Shield className="w-3 h-3" />
        <span>
          Todos os dados são criptografados com AES-256-GCM | Conformidade LGPD
          e CFP
        </span>
      </div>

      {/* Mobile FAB - Iniciar Sessão */}
      <Link
        to="/session"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all lg:hidden z-30"
        aria-label="Iniciar Sessão"
      >
        <Mic className="w-6 h-6" />
      </Link>
    </div>
  );
}
