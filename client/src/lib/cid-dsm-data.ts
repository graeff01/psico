// CID-10 Chapter V (F) - Mental and Behavioural Disorders
// Most commonly used codes in clinical psychology

export interface DiagnosticCode {
  code: string;
  description: string;
  category: string;
}

export const CID10_CODES: DiagnosticCode[] = [
  // F10-F19: Transtornos mentais devidos ao uso de substancias
  { code: "F10.0", description: "Transtornos mentais devidos ao uso de alcool - intoxicacao aguda", category: "Substancias" },
  { code: "F10.1", description: "Transtornos mentais devidos ao uso de alcool - uso nocivo", category: "Substancias" },
  { code: "F10.2", description: "Transtornos mentais devidos ao uso de alcool - sindrome de dependencia", category: "Substancias" },
  { code: "F19.1", description: "Transtornos mentais devidos ao uso de multiplas drogas - uso nocivo", category: "Substancias" },
  { code: "F19.2", description: "Transtornos mentais devidos ao uso de multiplas drogas - dependencia", category: "Substancias" },

  // F20-F29: Esquizofrenia e transtornos delirantesz
  { code: "F20.0", description: "Esquizofrenia paranoide", category: "Esquizofrenia" },
  { code: "F25.0", description: "Transtorno esquizoafetivo tipo maniaco", category: "Esquizofrenia" },
  { code: "F25.1", description: "Transtorno esquizoafetivo tipo depressivo", category: "Esquizofrenia" },

  // F30-F39: Transtornos do humor
  { code: "F31.0", description: "Transtorno afetivo bipolar - episodio atual hipomaniaco", category: "Humor" },
  { code: "F31.1", description: "Transtorno afetivo bipolar - episodio atual maniaco sem psicose", category: "Humor" },
  { code: "F31.3", description: "Transtorno afetivo bipolar - episodio atual depressivo leve/moderado", category: "Humor" },
  { code: "F31.4", description: "Transtorno afetivo bipolar - episodio atual depressivo grave sem psicose", category: "Humor" },
  { code: "F32.0", description: "Episodio depressivo leve", category: "Humor" },
  { code: "F32.1", description: "Episodio depressivo moderado", category: "Humor" },
  { code: "F32.2", description: "Episodio depressivo grave sem sintomas psicoticos", category: "Humor" },
  { code: "F32.3", description: "Episodio depressivo grave com sintomas psicoticos", category: "Humor" },
  { code: "F33.0", description: "Transtorno depressivo recorrente - episodio atual leve", category: "Humor" },
  { code: "F33.1", description: "Transtorno depressivo recorrente - episodio atual moderado", category: "Humor" },
  { code: "F33.2", description: "Transtorno depressivo recorrente - episodio atual grave", category: "Humor" },
  { code: "F34.1", description: "Distimia", category: "Humor" },

  // F40-F48: Transtornos neuroticos, relacionados ao estresse e somatoformes
  { code: "F40.0", description: "Agorafobia", category: "Ansiedade" },
  { code: "F40.1", description: "Fobias sociais", category: "Ansiedade" },
  { code: "F40.2", description: "Fobias especificas", category: "Ansiedade" },
  { code: "F41.0", description: "Transtorno de panico", category: "Ansiedade" },
  { code: "F41.1", description: "Ansiedade generalizada", category: "Ansiedade" },
  { code: "F41.2", description: "Transtorno misto ansioso e depressivo", category: "Ansiedade" },
  { code: "F42.0", description: "Transtorno obsessivo-compulsivo - predominio de pensamentos", category: "TOC" },
  { code: "F42.1", description: "Transtorno obsessivo-compulsivo - predominio de atos compulsivos", category: "TOC" },
  { code: "F42.2", description: "Transtorno obsessivo-compulsivo - misto", category: "TOC" },
  { code: "F43.0", description: "Reacao aguda ao estresse", category: "Estresse" },
  { code: "F43.1", description: "Transtorno de estresse pos-traumatico (TEPT)", category: "Estresse" },
  { code: "F43.2", description: "Transtornos de adaptacao", category: "Estresse" },
  { code: "F44.0", description: "Amnesia dissociativa", category: "Dissociativos" },
  { code: "F45.0", description: "Transtorno de somatizacao", category: "Somatoformes" },

  // F50-F59: Sindromes comportamentais associadas a perturbacoes fisiologicas
  { code: "F50.0", description: "Anorexia nervosa", category: "Alimentares" },
  { code: "F50.2", description: "Bulimia nervosa", category: "Alimentares" },
  { code: "F51.0", description: "Insonia nao-organica", category: "Sono" },
  { code: "F51.1", description: "Hipersonia nao-organica", category: "Sono" },

  // F60-F69: Transtornos de personalidade
  { code: "F60.0", description: "Personalidade paranoide", category: "Personalidade" },
  { code: "F60.1", description: "Personalidade esquizoide", category: "Personalidade" },
  { code: "F60.2", description: "Personalidade dissocial (antissocial)", category: "Personalidade" },
  { code: "F60.3", description: "Personalidade emocionalmente instavel (borderline)", category: "Personalidade" },
  { code: "F60.4", description: "Personalidade histrionica", category: "Personalidade" },
  { code: "F60.5", description: "Personalidade anancastica (obsessiva)", category: "Personalidade" },
  { code: "F60.6", description: "Personalidade ansiosa (evitativa)", category: "Personalidade" },
  { code: "F60.7", description: "Personalidade dependente", category: "Personalidade" },
  { code: "F60.8", description: "Personalidade narcisista", category: "Personalidade" },

  // F70-F79: Retardo mental
  { code: "F70", description: "Retardo mental leve", category: "Desenvolvimento" },
  { code: "F71", description: "Retardo mental moderado", category: "Desenvolvimento" },

  // F80-F89: Transtornos do desenvolvimento psicologico
  { code: "F84.0", description: "Autismo infantil", category: "Desenvolvimento" },
  { code: "F84.5", description: "Sindrome de Asperger", category: "Desenvolvimento" },

  // F90-F98: Transtornos comportamentais e emocionais com inicio na infancia
  { code: "F90.0", description: "Transtorno de deficit de atencao e hiperatividade (TDAH)", category: "Infancia" },
  { code: "F91.0", description: "Transtorno de conduta restrito ao contexto familiar", category: "Infancia" },
  { code: "F93.0", description: "Transtorno de ansiedade de separacao na infancia", category: "Infancia" },
  { code: "F95.2", description: "Transtorno de Tourette", category: "Infancia" },

  // Z codes - Fatores que influenciam o estado de saude
  { code: "Z63.0", description: "Problemas de relacionamento com conjuge/parceiro", category: "Fatores Z" },
  { code: "Z63.4", description: "Desaparecimento/morte de membro da familia", category: "Fatores Z" },
  { code: "Z63.5", description: "Rompimento familiar por separacao/divorcio", category: "Fatores Z" },
  { code: "Z73.0", description: "Esgotamento (burnout)", category: "Fatores Z" },
  { code: "Z91.5", description: "Historia pessoal de lesao autoprovocada", category: "Fatores Z" },
];

// DSM-5 most commonly used diagnostic categories (mapped to similar codes)
export const DSM5_CODES: DiagnosticCode[] = [
  // Depressive Disorders
  { code: "296.21", description: "Transtorno depressivo maior - episodio unico, leve", category: "Depressivos" },
  { code: "296.22", description: "Transtorno depressivo maior - episodio unico, moderado", category: "Depressivos" },
  { code: "296.23", description: "Transtorno depressivo maior - episodio unico, grave", category: "Depressivos" },
  { code: "296.31", description: "Transtorno depressivo maior - recorrente, leve", category: "Depressivos" },
  { code: "296.32", description: "Transtorno depressivo maior - recorrente, moderado", category: "Depressivos" },
  { code: "296.33", description: "Transtorno depressivo maior - recorrente, grave", category: "Depressivos" },
  { code: "300.4", description: "Transtorno depressivo persistente (distimia)", category: "Depressivos" },

  // Anxiety Disorders
  { code: "300.02", description: "Transtorno de ansiedade generalizada", category: "Ansiedade" },
  { code: "300.01", description: "Transtorno de panico", category: "Ansiedade" },
  { code: "300.22", description: "Agorafobia", category: "Ansiedade" },
  { code: "300.23", description: "Transtorno de ansiedade social (fobia social)", category: "Ansiedade" },
  { code: "300.29", description: "Fobia especifica", category: "Ansiedade" },
  { code: "309.21", description: "Transtorno de ansiedade de separacao", category: "Ansiedade" },

  // OCD and Related
  { code: "300.3", description: "Transtorno obsessivo-compulsivo", category: "TOC" },

  // Trauma and Stressor-Related
  { code: "309.81", description: "Transtorno de estresse pos-traumatico (TEPT)", category: "Trauma" },
  { code: "308.3", description: "Transtorno de estresse agudo", category: "Trauma" },
  { code: "309.0", description: "Transtorno de adaptacao com humor deprimido", category: "Trauma" },
  { code: "309.24", description: "Transtorno de adaptacao com ansiedade", category: "Trauma" },
  { code: "309.28", description: "Transtorno de adaptacao misto ansiedade e depressao", category: "Trauma" },

  // Bipolar
  { code: "296.40", description: "Transtorno bipolar I - episodio maniaco atual", category: "Bipolar" },
  { code: "296.50", description: "Transtorno bipolar I - episodio depressivo atual", category: "Bipolar" },
  { code: "296.89", description: "Transtorno bipolar II", category: "Bipolar" },

  // Personality Disorders
  { code: "301.83", description: "Transtorno de personalidade borderline", category: "Personalidade" },
  { code: "301.7", description: "Transtorno de personalidade antissocial", category: "Personalidade" },
  { code: "301.81", description: "Transtorno de personalidade narcisista", category: "Personalidade" },
  { code: "301.82", description: "Transtorno de personalidade evitativa", category: "Personalidade" },
  { code: "301.6", description: "Transtorno de personalidade dependente", category: "Personalidade" },
  { code: "301.4", description: "Transtorno de personalidade obsessivo-compulsiva", category: "Personalidade" },

  // ADHD
  { code: "314.01", description: "TDAH - apresentacao combinada", category: "Neurodesenvolvimento" },
  { code: "314.00", description: "TDAH - apresentacao predominantemente desatenta", category: "Neurodesenvolvimento" },

  // Autism Spectrum
  { code: "299.00", description: "Transtorno do espectro autista", category: "Neurodesenvolvimento" },

  // Eating Disorders
  { code: "307.1", description: "Anorexia nervosa", category: "Alimentares" },
  { code: "307.51", description: "Bulimia nervosa", category: "Alimentares" },
  { code: "307.51", description: "Transtorno de compulsao alimentar", category: "Alimentares" },

  // Sleep-Wake Disorders
  { code: "780.52", description: "Transtorno de insonia", category: "Sono" },

  // Substance-Related
  { code: "303.90", description: "Transtorno por uso de alcool", category: "Substancias" },
  { code: "304.30", description: "Transtorno por uso de cannabis", category: "Substancias" },
  { code: "304.00", description: "Transtorno por uso de opioide", category: "Substancias" },
];

export const DIAGNOSTIC_CATEGORIES = [
  "Ansiedade",
  "Humor",
  "Depressivos",
  "TOC",
  "Estresse",
  "Trauma",
  "Bipolar",
  "Personalidade",
  "Alimentares",
  "Sono",
  "Substancias",
  "Neurodesenvolvimento",
  "Infancia",
  "Desenvolvimento",
  "Esquizofrenia",
  "Dissociativos",
  "Somatoformes",
  "Fatores Z",
] as const;

export const DIAGNOSIS_STATUS = {
  active: { label: "Ativo", color: "red" },
  in_remission: { label: "Em remissao", color: "amber" },
  resolved: { label: "Resolvido", color: "emerald" },
} as const;

export const GOAL_STATUS = {
  pending: { label: "Pendente", color: "gray" },
  in_progress: { label: "Em andamento", color: "blue" },
  achieved: { label: "Alcancada", color: "emerald" },
  discontinued: { label: "Descontinuada", color: "red" },
} as const;

export const GOAL_PRIORITY = {
  low: { label: "Baixa", color: "gray" },
  medium: { label: "Media", color: "amber" },
  high: { label: "Alta", color: "red" },
} as const;
