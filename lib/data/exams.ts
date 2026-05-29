import { ASAClassification, ExamType } from '../types'

export const examTypes: ExamType[] = [
  {
    id: 'exam-1',
    name: 'Hemograma Completo',
    category: 'Laboratorial',
    description: 'Analise completa das celulas sanguineas',
    valueReference: 'Hb: 12-16 g/dL | Ht: 36-48% | Leucocitos: 4.000-11.000/mm3',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-2',
    name: 'Glicemia de Jejum',
    category: 'Laboratorial',
    description: 'Dosagem de glicose no sangue em jejum',
    valueReference: 'Normal: 70-99 mg/dL | Pre-diabetes: 100-125 mg/dL | Diabetes: >= 126 mg/dL',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-3',
    name: 'Creatinina',
    category: 'Laboratorial',
    description: 'Avaliacao da funcao renal',
    valueReference: 'Homens: 0.7-1.3 mg/dL | Mulheres: 0.6-1.1 mg/dL',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-4',
    name: 'Coagulograma',
    category: 'Laboratorial',
    description: 'Avaliacao do sistema de coagulacao',
    valueReference: 'TP: 11-13.5s | INR: 0.8-1.2 | TTPa: 25-35s',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-5',
    name: 'Eletrocardiograma (ECG)',
    category: 'Cardiologico',
    description: 'Registro da atividade eletrica do coracao',
    valueReference: 'Ritmo sinusal, FC 60-100 bpm, sem alteracoes isquemicas',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-6',
    name: 'Raio-X de Torax',
    category: 'Imagem',
    description: 'Radiografia da regiao toracica',
    valueReference: 'Campos pulmonares livres, indice cardiotorácico normal',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-7',
    name: 'Ecocardiograma',
    category: 'Cardiologico',
    description: 'Ultrassonografia do coracao',
    valueReference: 'FE >= 55% | DDVE normal | Sem alteracoes valvares',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-8',
    name: 'Teste Ergometrico',
    category: 'Cardiologico',
    description: 'Teste de esforco em esteira',
    valueReference: 'Negativo para isquemia | Boa capacidade funcional',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-9',
    name: 'Avaliacao Cardiologica',
    category: 'Especialidade',
    description: 'Parecer do especialista em cardiologia',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-10',
    name: 'Avaliacao Pulmonar',
    category: 'Especialidade',
    description: 'Parecer do especialista em pneumologia',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-11',
    name: 'Ureia',
    category: 'Laboratorial',
    description: 'Avaliacao da funcao renal',
    valueReference: '15-40 mg/dL',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'exam-12',
    name: 'Sodio e Potassio',
    category: 'Laboratorial',
    description: 'Dosagem de eletrolitos',
    valueReference: 'Na: 136-145 mEq/L | K: 3.5-5.0 mEq/L',
    createdBy: 'user-3',
    createdAt: '2024-01-15T08:00:00Z',
  },
]

export const EXAM_TYPES = examTypes

export const ASA_CLASSIFICATIONS: Array<{
  code: ASAClassification
  description: string
  examples: string
}> = [
  { code: 'I', description: 'Paciente saudavel', examples: 'Sem doenca sistemica, sem limitacoes funcionais.' },
  { code: 'II', description: 'Doenca sistemica leve', examples: 'Hipertensao controlada, diabetes sem complicacoes.' },
  { code: 'III', description: 'Doenca sistemica grave', examples: 'DPOC, diabetes com complicacoes, obesidade importante.' },
  { code: 'IV', description: 'Doenca sistemica grave com ameaca constante a vida', examples: 'ICC descompensada, insuficiencia renal avancada.' },
  { code: 'V', description: 'Paciente moribundo', examples: 'Sem expectativa de sobrevivencia sem a cirurgia.' },
  { code: 'VI', description: 'Doador de orgaos em morte encefalica', examples: 'Paciente mantido para captacao de orgaos.' },
]

export function calculateASA(conditions: Record<string, boolean | string | number | undefined>): ASAClassification {
  const majorConditions = [
    'heartDisease',
    'kidneyDisease',
    'liverDisease',
    'neurologicalDisease',
  ]
  const moderateConditions = [
    'diabetes',
    'hypertension',
    'respiratoryDisease',
    'obesity',
    'smoking',
    'alcoholism',
  ]

  const majorCount = majorConditions.filter((key) => Boolean(conditions[key])).length
  const moderateCount = moderateConditions.filter((key) => Boolean(conditions[key])).length

  if (majorCount >= 2) return 'IV'
  if (majorCount >= 1 || moderateCount >= 3) return 'III'
  if (moderateCount >= 1 || Boolean(conditions.other)) return 'II'
  return 'I'
}

export const RCRI_CRITERIA = [
  {
    id: 'high_risk_surgery',
    name: 'Cirurgia de alto risco',
    description: 'Procedimento intraperitoneal, intratoracico ou suprainguinal vascular.',
  },
  {
    id: 'ischemic_heart_disease',
    name: 'Doenca isquemica cardiaca',
    description: 'Historia de IAM, angina ou teste positivo para isquemia.',
  },
  {
    id: 'heart_failure',
    name: 'Insuficiencia cardiaca',
    description: 'Historia de congestao pulmonar, edema ou dispneia paroxistica noturna.',
  },
  {
    id: 'cerebrovascular_disease',
    name: 'Doenca cerebrovascular',
    description: 'Historia de AVC ou AIT.',
  },
  {
    id: 'insulin_therapy',
    name: 'Uso de insulina',
    description: 'Diabetes em uso de insulinoterapia.',
  },
  {
    id: 'creatinine_gt_2',
    name: 'Creatinina > 2,0 mg/dL',
    description: 'Insuficiencia renal com creatinina elevada.',
  },
] as const

export function calculateRCRI(criteria: string[]) {
  const score = criteria.length
  const riskPercentage =
    score === 0 ? '3,9%' :
    score === 1 ? '6,0%' :
    score === 2 ? '10,1%' : '15%+'

  return { score, riskPercentage }
}

export const VSGCRI_FACTORS = [
  { id: 'age_75', name: 'Idade >= 75 anos', description: 'Faixa etaria de maior risco.', points: 2 },
  { id: 'coronary_disease', name: 'Doenca coronariana', description: 'Historia de DAC conhecida.', points: 2 },
  { id: 'heart_failure', name: 'Insuficiencia cardiaca', description: 'Disfuncao cardiaca clinicamente relevante.', points: 2 },
  { id: 'copd', name: 'DPOC', description: 'Doenca pulmonar obstrutiva cronica.', points: 1 },
  { id: 'creatinine_18', name: 'Creatinina > 1,8 mg/dL', description: 'Comprometimento renal moderado a grave.', points: 2 },
  { id: 'smoker', name: 'Tabagismo ativo', description: 'Uso atual de tabaco.', points: 1 },
] as const

export function calculateVSGCRI(factors: string[]) {
  const score = factors.reduce((total, factorId) => {
    const factor = VSGCRI_FACTORS.find((item) => item.id === factorId)
    return total + (factor?.points || 0)
  }, 0)

  const riskClass =
    score <= 2 ? 'Classe I' :
    score <= 4 ? 'Classe II' :
    score <= 6 ? 'Classe III' : 'Classe IV'

  return { score, riskClass }
}
