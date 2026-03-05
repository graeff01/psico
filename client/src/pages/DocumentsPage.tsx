import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  FileText,
  Copy,
  Download,
  ChevronRight,
  User,
  ClipboardList,
  FileCheck,
  Heart,
  Scale,
  Loader2,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  icon: typeof FileText;
  description: string;
  generate: (patient: any) => string;
}

const TEMPLATES: Template[] = [
  {
    id: "declaracao_comparecimento",
    name: "Declaracao de Comparecimento",
    icon: FileCheck,
    description: "Declara que o paciente compareceu a sessao",
    generate: (p) =>
      `DECLARACAO DE COMPARECIMENTO

Declaro, para os devidos fins, que ${p.name} compareceu a sessao de atendimento psicologico realizada nesta data, no horario de _____ as _____, permanecendo por _____ minutos.

Local e data: _________________, ${new Date().toLocaleDateString("pt-BR")}

_________________________________
Psicologo(a) - CRP: __________`,
  },
  {
    id: "encaminhamento",
    name: "Encaminhamento",
    icon: ClipboardList,
    description: "Encaminhar paciente para outro profissional",
    generate: (p) =>
      `ENCAMINHAMENTO

Ao(A) Dr(a). _________________________________

Encaminho o(a) paciente ${p.name} para avaliacao e acompanhamento em ${
        "________________"
      }.

Motivo do encaminhamento:
________________________________________________________
________________________________________________________

Breve historico:
________________________________________________________
________________________________________________________

Diagnostico ou hipotese diagnostica (CID):
________________________________________________________

Desde ja agradeco a atencao dispensada.

Atenciosamente,

_________________________________
Psicologo(a) - CRP: __________
Data: ${new Date().toLocaleDateString("pt-BR")}`,
  },
  {
    id: "atestado",
    name: "Atestado Psicologico",
    icon: Heart,
    description: "Atestado de acompanhamento psicologico",
    generate: (p) =>
      `ATESTADO PSICOLOGICO

Atesto, para os devidos fins, que ${p.name} encontra-se em acompanhamento psicologico desde ___/___/_____, com frequencia _____________.

${
  p.mainComplaint
    ? `Observacoes clinicas relevantes:\n${p.mainComplaint}\n`
    : ""
}
Este atestado nao contem diagnostico e esta de acordo com a Resolucao CFP no 06/2019.

_________________________________
Psicologo(a) - CRP: __________
Data: ${new Date().toLocaleDateString("pt-BR")}`,
  },
  {
    id: "contrato_terapeutico",
    name: "Contrato Terapeutico",
    icon: Scale,
    description: "Contrato de prestacao de servicos psicologicos",
    generate: (p) =>
      `CONTRATO DE PRESTACAO DE SERVICOS PSICOLOGICOS

CONTRATANTE: ${p.name}
${p.cpf ? `CPF: ${p.cpf}` : "CPF: _______________"}
${p.email ? `E-mail: ${p.email}` : ""}
${p.phone ? `Telefone: ${p.phone}` : ""}

CONTRATADO(A): _________________________________
CRP: __________

CLAUSULA 1 - DO OBJETO
O presente contrato tem por objeto a prestacao de servicos de atendimento psicologico clinico.

CLAUSULA 2 - DAS SESSOES
As sessoes terao duracao de _____ minutos, com frequencia _____________.
Horario: ________________
Valor por sessao: R$ ___________
Forma de pagamento: ________________

CLAUSULA 3 - DO SIGILO
O(A) profissional compromete-se a manter sigilo sobre todas as informacoes obtidas durante o atendimento, conforme o Codigo de Etica Profissional do Psicologo e a LGPD.

CLAUSULA 4 - DOS CANCELAMENTOS
Cancelamentos devem ser comunicados com minimo de _____ horas de antecedencia. Faltas sem aviso previo serao cobradas integralmente.

CLAUSULA 5 - DA RESCISAO
O presente contrato pode ser rescindido por qualquer das partes, a qualquer momento, sem onus.

CLAUSULA 6 - DO CONSENTIMENTO (LGPD)
O(A) contratante autoriza o armazenamento e processamento de seus dados pessoais e clinicos para fins exclusivos do acompanhamento terapeutico, em conformidade com a Lei Geral de Protecao de Dados (Lei no 13.709/2018).

Local e data: _________________, ${new Date().toLocaleDateString("pt-BR")}

_________________________________     _________________________________
Contratante                            Contratado(a)`,
  },
  {
    id: "evolucao",
    name: "Registro de Evolucao",
    icon: FileText,
    description: "Registro de evolucao da sessao",
    generate: (p) =>
      `REGISTRO DE EVOLUCAO

Paciente: ${p.name}
Data: ${new Date().toLocaleDateString("pt-BR")}
Sessao no: _____

QUEIXA ATUAL:
________________________________________________________

OBSERVACOES DA SESSAO:
________________________________________________________
________________________________________________________

INTERVENCOES UTILIZADAS:
________________________________________________________

EVOLUCAO/PROGRESSO:
________________________________________________________

PLANO PARA PROXIMA SESSAO:
________________________________________________________

_________________________________
Psicologo(a) - CRP: __________`,
  },
];

export function DocumentsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );
  const [generatedDoc, setGeneratedDoc] = useState("");

  const { data: patients } = trpc.patients.list.useQuery({ limit: 100 });

  const selectedPatient = patients?.patients.find(
    (p) => p.id === selectedPatientId
  );

  const handleGenerate = (template: Template) => {
    if (!selectedPatient) return;
    setSelectedTemplate(template);
    setGeneratedDoc(template.generate(selectedPatient));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDoc);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Documentos</h1>
        <p className="text-text-secondary text-sm">
          Templates de documentos clinicos
        </p>
      </div>

      {/* Patient Selection */}
      <div className="bg-white rounded-xl border border-border-light p-5">
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Selecione o paciente para gerar documentos
        </label>
        <select
          value={selectedPatientId ?? ""}
          onChange={(e) => {
            setSelectedPatientId(Number(e.target.value) || null);
            setGeneratedDoc("");
            setSelectedTemplate(null);
          }}
          className="w-full max-w-md px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Selecionar paciente...</option>
          {patients?.patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleGenerate(template)}
            disabled={!selectedPatientId}
            className={`text-left p-5 rounded-xl border transition-all group ${
              selectedTemplate?.id === template.id
                ? "border-primary-300 bg-primary-50/50 ring-2 ring-primary-500/20"
                : "border-border-light bg-white hover:border-primary-200 hover:shadow-sm"
            } ${!selectedPatientId ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedTemplate?.id === template.id
                    ? "bg-primary-100"
                    : "bg-surface group-hover:bg-primary-50"
                }`}
              >
                <template.icon
                  className={`w-5 h-5 ${
                    selectedTemplate?.id === template.id
                      ? "text-primary-600"
                      : "text-text-muted group-hover:text-primary-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {template.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {template.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted mt-1 group-hover:text-primary-600" />
            </div>
          </button>
        ))}
      </div>

      {/* Generated Document */}
      {generatedDoc && (
        <div className="bg-white rounded-xl border border-border-light p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600" />
              {selectedTemplate?.name}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg border border-border-light text-xs font-medium text-text-secondary hover:bg-surface-hover flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            </div>
          </div>
          <textarea
            value={generatedDoc}
            onChange={(e) => setGeneratedDoc(e.target.value)}
            className="w-full h-96 px-4 py-3 rounded-lg border border-border-light bg-surface text-sm text-text-primary font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y"
          />
          <p className="text-[10px] text-text-muted mt-2">
            Edite o documento conforme necessario antes de imprimir ou copiar.
          </p>
        </div>
      )}
    </div>
  );
}
