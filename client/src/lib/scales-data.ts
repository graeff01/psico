// PHQ-9 (Patient Health Questionnaire-9)
// Kroenke, Spitzer & Williams, 2001

export const PHQ9 = {
  name: "PHQ-9",
  fullName: "Patient Health Questionnaire-9",
  description: "Avaliacao de sintomas depressivos nas ultimas 2 semanas",
  maxScore: 27,
  options: [
    { value: 0, label: "Nenhuma vez" },
    { value: 1, label: "Varios dias" },
    { value: 2, label: "Mais da metade dos dias" },
    { value: 3, label: "Quase todos os dias" },
  ],
  questions: [
    "Pouco interesse ou pouco prazer em fazer as coisas",
    "Se sentir para baixo, deprimido(a) ou sem esperanca",
    "Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume",
    "Se sentir cansado(a) ou com pouca energia",
    "Falta de apetite ou comendo demais",
    "Se sentir mal consigo mesmo(a) — ou achar que voce e um fracasso ou que decepcionou sua familia ou voce mesmo(a)",
    "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisao",
    "Lentidao para se movimentar ou falar, a ponto das outras pessoas perceberem. Ou o contrario — Loss of concentration ou agitacao mais do que o habitual",
    "Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a)",
  ],
  getSeverity(score: number): { level: string; label: string; color: string } {
    if (score <= 4) return { level: "minimal", label: "Minimo", color: "emerald" };
    if (score <= 9) return { level: "mild", label: "Leve", color: "yellow" };
    if (score <= 14) return { level: "moderate", label: "Moderado", color: "amber" };
    if (score <= 19) return { level: "moderately_severe", label: "Moderadamente Grave", color: "orange" };
    return { level: "severe", label: "Grave", color: "red" };
  },
} as const;

// GAD-7 (Generalized Anxiety Disorder-7)
// Spitzer, Kroenke, Williams & Lowe, 2006

export const GAD7 = {
  name: "GAD-7",
  fullName: "Generalized Anxiety Disorder-7",
  description: "Avaliacao de sintomas de ansiedade nas ultimas 2 semanas",
  maxScore: 21,
  options: [
    { value: 0, label: "Nenhuma vez" },
    { value: 1, label: "Varios dias" },
    { value: 2, label: "Mais da metade dos dias" },
    { value: 3, label: "Quase todos os dias" },
  ],
  questions: [
    "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
    "Nao ser capaz de impedir ou de controlar as preocupacoes",
    "Preocupar-se muito com diversas coisas",
    "Dificuldade para relaxar",
    "Ficar tao agitado(a) que se torna dificil permanecer sentado(a)",
    "Ficar facilmente aborrecido(a) ou irritado(a)",
    "Sentir medo como se algo horrivel fosse acontecer",
  ],
  getSeverity(score: number): { level: string; label: string; color: string } {
    if (score <= 4) return { level: "minimal", label: "Minimo", color: "emerald" };
    if (score <= 9) return { level: "mild", label: "Leve", color: "yellow" };
    if (score <= 14) return { level: "moderate", label: "Moderado", color: "amber" };
    return { level: "severe", label: "Grave", color: "red" };
  },
} as const;

// BDI-II (Beck Depression Inventory-II)
// Beck, Steer & Brown, 1996
// Note: Simplified version with key items (full BDI has specific options per question)

export const BDI = {
  name: "BDI-II",
  fullName: "Inventario de Depressao de Beck II",
  description: "Avaliacao da intensidade de sintomas depressivos nas ultimas 2 semanas",
  maxScore: 63,
  options: [
    { value: 0, label: "0" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
  ],
  questions: [
    "Tristeza — Eu nao me sinto triste (0) / Eu me sinto triste grande parte do tempo (1) / Estou triste o tempo todo (2) / Estou tao triste que nao consigo suportar (3)",
    "Pessimismo — Nao estou desanimado(a) (0) / Me sinto mais desanimado(a) que de costume (1) / Nao espero que as coisas melhorem (2) / Sinto que meu futuro e sem esperanca (3)",
    "Fracasso passado — Nao me sinto um fracasso (0) / Tenho fracassado mais do que deveria (1) / Vejo muitos fracassos (2) / Sinto que sou um completo fracasso (3)",
    "Perda de prazer — Tenho tanto prazer como antes (0) / Nao sinto tanto prazer como antes (1) / Tenho pouco prazer (2) / Nao sinto nenhum prazer (3)",
    "Sentimentos de culpa — Nao me sinto culpado(a) (0) / Me sinto culpado(a) por muitas coisas (1) / Me sinto bastante culpado(a) (2) / Me sinto culpado(a) o tempo todo (3)",
    "Sentimentos de punicao — Nao sinto que esteja sendo punido(a) (0) / Sinto que posso ser punido(a) (1) / Espero ser punido(a) (2) / Sinto que estou sendo punido(a) (3)",
    "Autoestima — Sinto o mesmo que antes sobre mim (0) / Perdi a confianca em mim (1) / Estou decepcionado(a) comigo (2) / Nao gosto de mim (3)",
    "Autocritica — Nao me critico mais do que de costume (0) / Sou mais critico(a) comigo (1) / Me critico por todas as falhas (2) / Me culpo por tudo de ruim (3)",
    "Pensamentos suicidas — Nao penso em me matar (0) / Penso em me matar mas nao faria (1) / Gostaria de me matar (2) / Me mataria se tivesse oportunidade (3)",
    "Choro — Nao choro mais do que chorava (0) / Choro mais do que antes (1) / Choro por qualquer coisa (2) / Tenho vontade mas nao consigo chorar (3)",
    "Agitacao — Nao estou mais agitado(a) que antes (0) / Me sinto mais agitado(a) (1) / Estou tao agitado(a) que e dificil ficar parado (2) / Estou tao agitado(a) que preciso me mover (3)",
    "Perda de interesse — Nao perdi o interesse por pessoas ou atividades (0) / Estou menos interessado(a) (1) / Perdi a maioria do interesse (2) / E dificil me interessar por qualquer coisa (3)",
    "Indecisao — Tomo decisoes como antes (0) / Tenho mais dificuldade para decidir (1) / Tenho muita dificuldade para decidir (2) / Tenho problemas para qualquer decisao (3)",
    "Desvalorizacao — Nao me sinto sem valor (0) / Nao me considero tao valioso(a) (1) / Me sinto sem valor comparado(a) aos outros (2) / Me sinto completamente sem valor (3)",
    "Falta de energia — Tenho tanta energia como antes (0) / Tenho menos energia (1) / Nao tenho energia suficiente (2) / Nao tenho energia para nada (3)",
    "Alteracoes no sono — Nao percebi mudancas (0) / Durmo um pouco mais/menos (1) / Durmo muito mais/menos (2) / Durmo a maior parte do dia / acordo muito cedo (3)",
    "Irritabilidade — Nao estou mais irritavel (0) / Estou mais irritavel (1) / Estou muito mais irritavel (2) / Estou irritavel o tempo todo (3)",
    "Alteracoes de apetite — Nao percebi mudancas (0) / Meu apetite mudou um pouco (1) / Meu apetite mudou muito (2) / Nao tenho apetite / como o tempo todo (3)",
    "Dificuldade de concentracao — Consigo me concentrar como antes (0) / Nao consigo me concentrar tao bem (1) / E dificil manter concentracao (2) / Nao consigo me concentrar em nada (3)",
    "Cansaco ou fadiga — Nao estou mais cansado(a) (0) / Fico cansado(a) mais facilmente (1) / Estou cansado(a) demais para muitas coisas (2) / Estou cansado(a) demais para tudo (3)",
    "Perda de interesse por sexo — Nao notei mudancas (0) / Estou menos interessado(a) (1) / Estou muito menos interessado(a) (2) / Perdi completamente o interesse (3)",
  ],
  getSeverity(score: number): { level: string; label: string; color: string } {
    if (score <= 13) return { level: "minimal", label: "Minimo", color: "emerald" };
    if (score <= 19) return { level: "mild", label: "Leve", color: "yellow" };
    if (score <= 28) return { level: "moderate", label: "Moderado", color: "amber" };
    return { level: "severe", label: "Grave", color: "red" };
  },
} as const;

export const SCALES = { phq9: PHQ9, gad7: GAD7, bdi: BDI } as const;
export type ScaleType = keyof typeof SCALES;

export const PATIENT_MOODS = [
  { value: "calm", label: "Calmo(a)" },
  { value: "anxious", label: "Ansioso(a)" },
  { value: "sad", label: "Triste" },
  { value: "angry", label: "Com raiva" },
  { value: "euphoric", label: "Euforico(a)" },
  { value: "apathetic", label: "Apatico(a)" },
  { value: "agitated", label: "Agitado(a)" },
  { value: "fearful", label: "Com medo" },
  { value: "other", label: "Outro" },
] as const;

export const COMMON_INTERVENTIONS = [
  "Escuta ativa",
  "Reestruturacao cognitiva",
  "Tecnica de relaxamento",
  "Dessensibilizacao sistematica",
  "Role-playing",
  "Psicoeducacao",
  "Mindfulness",
  "Registro de pensamentos",
  "Exposicao gradual",
  "Tecnica de respiracao",
  "Analise funcional",
  "Contrato terapeutico",
  "Validacao emocional",
  "Tecnica de resolucao de problemas",
  "Treinamento de habilidades sociais",
  "EMDR",
  "Hipnose clinica",
  "Arteterapia",
  "Ludoterapia",
  "Interpretacao",
  "Confrontacao",
  "Associacao livre",
] as const;
