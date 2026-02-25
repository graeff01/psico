import { useState } from "react";
import { useSession } from "../lib/auth-client";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import {
  Shield,
  Download,
  Trash2,
  Key,
  ScrollText,
  AlertTriangle,
  Loader2,
  Lock,
  Eye,
  Clock,
} from "lucide-react";

export function SettingsPage() {
  const { data: session } = useSession();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = trpc.lgpd.exportData.useMutation();
  const auditLogs = trpc.lgpd.getAuditLogs.useQuery({
    page: 1,
    limit: 20,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportData.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `psicoia-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso!");
    } catch {
      toast.error("Erro ao exportar dados");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary text-sm">
          Segurança, privacidade e conformidade LGPD
        </p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-primary-600" />
          Perfil
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Nome</span>
            <span className="text-sm font-medium text-text-primary">
              {session?.user?.name}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border-light">
            <span className="text-sm text-text-secondary">Email</span>
            <span className="text-sm font-medium text-text-primary">
              {session?.user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sage-600" />
          Segurança
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Criptografia de dados
              </p>
              <p className="text-xs text-text-muted">
                AES-256-GCM em repouso, TLS 1.3 em trânsito
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
              Ativo
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Rate Limiting
              </p>
              <p className="text-xs text-text-muted">
                Proteção contra brute force ativa
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
              Ativo
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Logs de auditoria
              </p>
              <p className="text-xs text-text-muted">
                Todos os acessos são registrados
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
              Ativo
            </span>
          </div>
        </div>
      </div>

      {/* LGPD */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-600" />
          Conformidade LGPD
        </h3>

        <div className="space-y-3">
          {/* Portabilidade */}
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Portabilidade de dados
              </p>
              <p className="text-xs text-text-muted">
                Exporte todos os seus dados em formato JSON
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-60 flex items-center gap-1.5"
            >
              {exporting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              Exportar
            </button>
          </div>

          {/* Direito ao esquecimento */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Direito ao esquecimento
              </p>
              <p className="text-xs text-text-muted">
                Excluir dados de pacientes específicos na página do paciente
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Informações
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 animate-slide-up">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium mb-1">
                  Como exercer o direito ao esquecimento:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Acesse a página do paciente</li>
                  <li>Clique no ícone de lixeira</li>
                  <li>Confirme a exclusão permanente</li>
                  <li>Todos os dados serão removidos irreversivelmente</li>
                </ol>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-2 text-amber-700 font-medium hover:underline"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-warm-600" />
          Logs de Auditoria (Últimos 20)
        </h3>

        {auditLogs.data && auditLogs.data.length > 0 ? (
          <div className="space-y-1">
            {auditLogs.data.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-2 border-b border-border-light last:border-0"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    log.result === "success"
                      ? "bg-emerald-500"
                      : log.result === "failure"
                        ? "bg-red-500"
                        : "bg-amber-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {log.action}
                  </p>
                  {log.details && (
                    <p className="text-[10px] text-text-muted truncate">
                      {log.details}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-text-muted shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-6">
            Nenhum log registrado
          </p>
        )}
      </div>

      {/* Privacy info */}
      <div className="bg-sage-50 border border-sage-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-sage-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-sage-800">
              Política de Privacidade
            </h4>
            <p className="text-xs text-sage-700 mt-1 leading-relaxed">
              O PsicoIA Manager garante que todos os dados de pacientes são
              criptografados com AES-256-GCM e nunca são compartilhados com
              terceiros. A IA processa apenas dados anonimizados e agregados. O
              sistema está em conformidade com a LGPD (Lei 13.709/2018), a
              Resolução CFP nº 09/2024 e o Código de Ética do CRP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
