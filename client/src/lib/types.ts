// Tipos compartilhados entre client e server

export interface Patient {
  id: number;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  address: string | null;
  clinicalHistory: string | null;
  mainComplaint: string | null;
  medications: string | null;
  emergencyContact: string | null;
  tags: string[];
  status: string;
  consentLGPD: boolean;
  consentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultation {
  id: number;
  patientId: number;
  patientName?: string;
  date: Date;
  duration: number | null;
  notes: string | null;
  status: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioRecording {
  id: number;
  fileName: string | null;
  mimeType: string | null;
  duration: number | null;
  fileSize: number | null;
  status: string;
  createdAt: Date;
}

export interface Transcription {
  id: number;
  text: string;
  language: string | null;
  confidence: number | null;
  wordCount: number | null;
  processingTime: number | null;
  createdAt: Date;
}

export interface AIAnalysis {
  id: number;
  type: string;
  content: string;
  tags: string[];
  model: string | null;
  tokensUsed: number | null;
  createdAt: Date;
}

export interface ChatMessage {
  id: number;
  role: string;
  content: string;
  sessionId: string;
  patientId: number | null;
  createdAt: Date;
}

export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  details: string | null;
  ipAddress: string | null;
  result: string;
  createdAt: Date;
}

export const CLINICAL_TAGS = [
  "Ansiedade",
  "Depressão",
  "Trauma",
  "TEPT",
  "TOC",
  "TDAH",
  "Bipolaridade",
  "Fobia",
  "Pânico",
  "Estresse",
  "Luto",
  "Relacionamento",
  "Autoestima",
  "Dependência",
  "Alimentar",
  "Sono",
  "Raiva",
  "Compulsão",
  "Burnout",
  "Adaptação",
] as const;

export const CONSULTATION_STATUS = {
  scheduled: "Agendada",
  in_progress: "Em Andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
} as const;

export const PATIENT_STATUS = {
  active: "Ativo",
  inactive: "Inativo",
} as const;

export interface Payment {
  id: number;
  consultationId: number | null;
  patientId: number;
  patientName?: string;
  amount: number;
  status: string;
  method: string | null;
  notes: string | null;
  receiptNumber: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PAYMENT_STATUS = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
} as const;

export const PAYMENT_METHODS = {
  pix: "PIX",
  cash: "Dinheiro",
  credit_card: "Cartao Credito",
  debit_card: "Cartao Debito",
  transfer: "Transferencia",
  other: "Outro",
} as const;

export const RISK_LEVELS = {
  none: { label: "Sem risco", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  low: { label: "Baixo", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  medium: { label: "Moderado", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  high: { label: "Alto", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  critical: { label: "Critico", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
} as const;
