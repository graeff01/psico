import { useParams, Link, useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { formatDate, formatCPF, formatPhone } from "../lib/utils";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Tag,
  Pill,
  FileText,
  Trash2,
  AlertTriangle,
  User,
  Loader2,
  Plus,
  TrendingUp,
  Download,
} from "lucide-react";
import { useState } from "react";
import { CONSULTATION_STATUS } from "../lib/types";
import { AnamnesisForm } from "../components/AnamnesisForm";
import { exportPatientPDF } from "../lib/pdf-export";

export function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const patientId = Number(id);
  const { data: patient, isLoading } = trpc.patients.getById.useQuery(
    { id: patientId },
    { enabled: !!id }
  );

  const { data: timeline } = trpc.consultations.getPatientTimeline.useQuery(
    { patientId },
    { enabled: !!id }
  );

  const { data: anamnesis } = trpc.patients.getAnamnesis.useQuery(
    { patientId },
    { enabled: !!id }
  );

  const deletePatient = trpc.patients.delete.useMutation({
    onSuccess: () => {
      toast.success("Paciente excluído permanentemente");
      navigate("/patients");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Paciente não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/patients"
          className="mt-1 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                {patient.name}
              </h1>
              <p className="text-sm text-text-secondary">
                Paciente desde {formatDate(patient.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/patients/${id}/timeline`}
            className="px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Evolucao
          </Link>
          <button
            onClick={() => {
              if (patient) {
                exportPatientPDF(patient, timeline ?? [], anamnesis ?? null);
              }
            }}
            className="px-3 py-2 rounded-lg bg-sage-50 text-sage-700 text-xs font-medium hover:bg-sage-100 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors"
            title="Excluir paciente"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Excluir paciente permanentemente?
              </p>
              <p className="text-xs text-red-600 mt-1">
                Esta ação é irreversível. Todos os dados, consultas, gravações e
                análises serão excluídos (LGPD - Direito ao Esquecimento).
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => deletePatient.mutate({ id: Number(id) })}
                  disabled={deletePatient.isPending}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                >
                  {deletePatient.isPending ? "Excluindo..." : "Sim, excluir"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-700 hover:bg-red-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="bg-white rounded-xl border border-border-light p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Informações Pessoais
          </h3>

          {patient.cpf && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">
                CPF: {formatCPF(patient.cpf)}
              </span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">{patient.email}</span>
            </div>
          )}
          {patient.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">
                {formatPhone(patient.phone)}
              </span>
            </div>
          )}
          {patient.birthDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">{patient.birthDate}</span>
            </div>
          )}
          {patient.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">{patient.address}</span>
            </div>
          )}

          {(patient.tags as string[])?.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Tag className="w-3 h-3 text-text-muted" />
                <span className="text-xs font-medium text-text-muted">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(patient.tags as string[]).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-sage-50 text-sage-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clinical */}
        <div className="bg-white rounded-xl border border-border-light p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Dados Clínicos
          </h3>

          {patient.mainComplaint && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-1">
                Queixa Principal
              </p>
              <p className="text-sm text-text-secondary">
                {patient.mainComplaint}
              </p>
            </div>
          )}

          {patient.clinicalHistory && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-1">
                Histórico Clínico
              </p>
              <p className="text-sm text-text-secondary">
                {patient.clinicalHistory}
              </p>
            </div>
          )}

          {patient.medications && (
            <div className="flex items-start gap-2">
              <Pill className="w-4 h-4 text-text-muted mt-0.5" />
              <div>
                <p className="text-xs font-medium text-text-muted mb-1">
                  Medicações
                </p>
                <p className="text-sm text-text-secondary">
                  {patient.medications}
                </p>
              </div>
            </div>
          )}

          {!patient.mainComplaint &&
            !patient.clinicalHistory &&
            !patient.medications && (
              <p className="text-sm text-text-muted py-4 text-center">
                Nenhum dado clínico registrado
              </p>
            )}
        </div>

        {/* Consent */}
        <div className="bg-white rounded-xl border border-border-light p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">
            LGPD & Consentimento
          </h3>
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              patient.consentLGPD
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-amber-50 border border-amber-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                patient.consentLGPD ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                patient.consentLGPD ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {patient.consentLGPD
                ? "Consentimento concedido"
                : "Consentimento pendente"}
            </span>
          </div>
          {patient.consentDate && (
            <p className="text-xs text-text-muted">
              Concedido em {formatDate(patient.consentDate)}
            </p>
          )}
        </div>
      </div>

      {/* Anamnesis */}
      <AnamnesisForm patientId={patientId} />

      {/* Consultations */}
      <div className="bg-white rounded-xl border border-border-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Consultas ({patient.consultations?.length ?? 0})
          </h3>
          <Link
            to="/consultations"
            className="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700"
          >
            <Plus className="w-3 h-3" />
            Nova Consulta
          </Link>
        </div>

        {patient.consultations && patient.consultations.length > 0 ? (
          <div className="space-y-2">
            {patient.consultations.map((consult) => (
              <Link
                key={consult.id}
                to={`/consultations/${consult.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-sage-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-sage-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {formatDate(consult.date)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {consult.duration
                      ? `${consult.duration} min`
                      : "Duração não registrada"}
                  </p>
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
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-8">
            Nenhuma consulta registrada
          </p>
        )}
      </div>
    </div>
  );
}
