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
