import jsPDF from "jspdf";

interface PatientData {
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  mainComplaint?: string | null;
  clinicalHistory?: string | null;
  medications?: string | null;
  tags?: string[];
}

interface ConsultationEntry {
  date: Date | string;
  duration?: number | null;
  status: string;
  notes?: string | null;
  analysis?: {
    summary?: string;
    insights?: string[];
  } | null;
  tags?: string[];
  riskLevel?: string;
}

interface AnamnesisData {
  [key: string]: string | undefined;
}

const ANAMNESIS_LABELS: Record<string, string> = {
  queixaPrincipal: "Queixa Principal",
  inicioSintomas: "Inicio dos Sintomas",
  tratamentosAnteriores: "Tratamentos Anteriores",
  historicoFamiliar: "Historico Familiar",
  historicoSocial: "Historico Social",
  fatoresRisco: "Fatores de Risco",
  medicamentos: "Medicamentos em Uso",
  alergias: "Alergias",
  usoSubstancias: "Uso de Substancias",
  qualidadeSono: "Qualidade do Sono",
  objetivosTerapia: "Objetivos da Terapia",
  observacoes: "Observacoes",
};

export function exportPatientPDF(
  patient: PatientData,
  consultations: ConsultationEntry[],
  anamnesis: AnamnesisData | null
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (text: string, fontSize = 10, bold = false) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * (fontSize * 0.4) + 2;
  };

  const addSeparator = () => {
    y += 3;
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 6;
  };

  // Header
  doc.setFillColor(92, 124, 250);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PsicoIA Manager", 20, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Prontuario do Paciente", 20, 28);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    20,
    35
  );
  doc.setTextColor(0);
  y = 50;

  // Patient Info
  addLine("DADOS DO PACIENTE", 14, true);
  y += 2;
  addLine(`Nome: ${patient.name}`);
  if (patient.cpf) addLine(`CPF: ${patient.cpf}`);
  if (patient.email) addLine(`E-mail: ${patient.email}`);
  if (patient.phone) addLine(`Telefone: ${patient.phone}`);
  if (patient.birthDate) addLine(`Data de Nascimento: ${patient.birthDate}`);
  if (patient.tags && patient.tags.length > 0)
    addLine(`Tags: ${patient.tags.join(", ")}`);

  // Clinical Data
  if (patient.mainComplaint || patient.clinicalHistory || patient.medications) {
    addSeparator();
    addLine("DADOS CLINICOS", 14, true);
    y += 2;
    if (patient.mainComplaint)
      addLine(`Queixa Principal: ${patient.mainComplaint}`);
    if (patient.clinicalHistory)
      addLine(`Historico Clinico: ${patient.clinicalHistory}`);
    if (patient.medications)
      addLine(`Medicacoes: ${patient.medications}`);
  }

  // Anamnesis
  if (anamnesis) {
    addSeparator();
    addLine("ANAMNESE", 14, true);
    y += 2;
    for (const [key, value] of Object.entries(anamnesis)) {
      if (value) {
        addLine(`${ANAMNESIS_LABELS[key] || key}:`, 10, true);
        addLine(value);
        y += 2;
      }
    }
  }

  // Consultations
  if (consultations.length > 0) {
    addSeparator();
    addLine("HISTORICO DE CONSULTAS", 14, true);
    y += 2;

    consultations.forEach((c, i) => {
      const date = new Date(c.date).toLocaleDateString("pt-BR");
      addLine(`Consulta ${i + 1} - ${date}`, 11, true);
      if (c.duration) addLine(`Duracao: ${c.duration} minutos`);
      if (c.riskLevel && c.riskLevel !== "none")
        addLine(`Nivel de Risco: ${c.riskLevel}`);

      if (c.analysis?.summary) {
        addLine("Resumo:", 10, true);
        addLine(c.analysis.summary);
      }

      if (c.analysis?.insights && c.analysis.insights.length > 0) {
        addLine("Insights:", 10, true);
        c.analysis.insights.forEach((insight, j) => {
          addLine(`  ${j + 1}. ${insight}`);
        });
      }

      if (c.notes) {
        addLine("Anotacoes:", 10, true);
        addLine(c.notes);
      }

      if (c.tags && c.tags.length > 0) addLine(`Tags: ${c.tags.join(", ")}`);
      y += 4;
    });
  }

  // Footer
  addSeparator();
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    "Este documento e confidencial e protegido pela LGPD (Lei 13.709/2018).",
    20,
    y
  );
  y += 4;
  doc.text(
    "Dados criptografados com AES-256-GCM. Gerado pelo PsicoIA Manager.",
    20,
    y
  );

  const safeName = patient.name.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`prontuario_${safeName}.pdf`);
}
