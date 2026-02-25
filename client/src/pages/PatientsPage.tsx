import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { formatDate, formatCPF } from "../lib/utils";
import { CLINICAL_TAGS } from "../lib/types";
import {
  Plus,
  Search,
  User,
  Tag,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, isLoading, refetch } = trpc.patients.list.useQuery({
    search: search || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    page: 1,
    limit: 50,
  });

  const createPatient = trpc.patients.create.useMutation({
    onSuccess: () => {
      toast.success("Paciente cadastrado com sucesso!");
      setShowForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    birthDate: "",
    mainComplaint: "",
    tags: [] as string[],
    consentLGPD: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPatient.mutate(form);
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pacientes</h1>
          <p className="text-text-secondary text-sm">
            {data?.total ?? 0} pacientes cadastrados
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancelar" : "Novo Paciente"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border-light p-6 animate-slide-up">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Cadastrar novo paciente
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Data de nascimento
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Queixa principal
              </label>
              <textarea
                value={form.mainComplaint}
                onChange={(e) =>
                  setForm({ ...form, mainComplaint: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Tags clínicas
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CLINICAL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
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

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentLGPD}
                onChange={(e) =>
                  setForm({ ...form, consentLGPD: e.target.checked })
                }
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-xs text-text-secondary">
                Paciente concedeu consentimento LGPD para coleta e processamento
                de dados
              </span>
            </label>

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
                disabled={createPatient.isPending}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {createPatient.isPending ? "Salvando..." : "Salvar Paciente"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Filter tags */}
      <div className="flex flex-wrap gap-1.5">
        {CLINICAL_TAGS.slice(0, 10).map((tag) => (
          <button
            key={tag}
            onClick={() =>
              setSelectedTags((prev) =>
                prev.includes(tag)
                  ? prev.filter((t) => t !== tag)
                  : [...prev, tag]
              )
            }
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedTags.includes(tag)
                ? "bg-primary-100 text-primary-700"
                : "bg-white text-text-muted border border-border-light hover:text-text-secondary"
            }`}
          >
            <Tag className="w-3 h-3 inline mr-1" />
            {tag}
          </button>
        ))}
      </div>

      {/* Patient List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : data?.patients && data.patients.length > 0 ? (
        <div className="space-y-2">
          {data.patients.map((patient) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-border-light p-4 hover:shadow-sm hover:border-primary-200 transition-all group"
            >
              <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {patient.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {patient.cpf && (
                    <span className="text-xs text-text-muted">
                      CPF: {formatCPF(patient.cpf)}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">
                    Desde {formatDate(patient.createdAt)}
                  </span>
                </div>
                {(patient.tags as string[])?.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {(patient.tags as string[]).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sage-50 text-sage-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {(patient.tags as string[]).length > 3 && (
                      <span className="text-[10px] text-text-muted">
                        +{(patient.tags as string[]).length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    patient.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {patient.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-600" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <User className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            Nenhum paciente encontrado
          </p>
          <p className="text-text-muted text-sm mt-1">
            Cadastre seu primeiro paciente para começar
          </p>
        </div>
      )}
    </div>
  );
}
