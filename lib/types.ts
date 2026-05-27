// Tipos base do sistema de Avaliacao de Risco Cirurgico

export type UserRole = 'recepcao' | 'triagem' | 'clinico' | 'laboratorio' | 'cirurgiao' | 'admin'

export interface User {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  department?: string
  avatar?: string
  active: boolean
  createdAt: string
}

export type PatientStatus = 
  | 'aguardando_triagem'
  | 'em_triagem'
  | 'aguardando_avaliacao'
  | 'aguardando_clinico'
  | 'em_avaliacao_clinica'
  | 'aguardando_exames'
  | 'aguardando_resultado'
  | 'exames_solicitados'
  | 'aguardando_laboratorio'
  | 'exames_em_analise'
  | 'exames_concluidos'
  | 'aguardando_cirurgiao'
  | 'em_avaliacao_cirurgica'
  | 'concluido'
  | 'liberado'
  | 'alto_risco'
  | 'contraindicado'

export type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'

export type RiskLevel = 'baixo' | 'moderado' | 'alto' | 'contraindicado' | 'pendente' | 'critico'

export type ASAClassification = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'

export type ASAScore = 1 | 2 | 3 | 4 | 5 | 6

export type SurgeryUrgency = 'eletiva' | 'urgencia' | 'emergencia'

export type SurgerySize = 'pequeno' | 'medio' | 'grande'

export interface VitalSigns {
  bloodPressure?: string
  heartRate?: number
  temperature?: number
  oxygenSaturation?: number
  respiratoryRate?: number
  weight?: number
  height?: number
  pressaoSistolica?: number
  pressaoDiastolica?: number
  temperatura?: number
  frequenciaCardiaca?: number
  frequenciaRespiratoria?: number
  saturacao?: number
  peso?: number
  altura?: number
  imc?: number
  dorRelatada?: number
  registradoPor?: string
  registradoEm?: string
}

export interface Comorbidities {
  hypertension?: boolean
  heartDisease?: boolean
  respiratoryDisease?: boolean
  kidneyDisease?: boolean
  liverDisease?: boolean
  neurologicalDisease?: boolean
  obesity?: boolean
  smoking?: boolean
  alcoholism?: boolean
  other?: string
  hipertensao?: boolean
  diabetes?: boolean
  cardiopatia?: boolean
  avcPrevio?: boolean
  dpoc?: boolean
  doencaRenal?: boolean
  tabagismo?: boolean
  anticoagulantes?: boolean
  alergias?: string[]
  medicacoes?: string[]
  outras?: string[]
}

export interface ClinicalEvaluation {
  id?: string
  patientId?: string
  rcriScore?: {
    score: number
    riskPercentage: string
    criteria: string[]
  }
  vsgcriScore?: {
    score: number
    riskClass: string
    factors: string[]
  }
  requestedExams?: string[]
  notes?: string
  completedAt?: string
  completedBy?: string
  motivoAvaliacao?: string
  hipoteseDiagnostica?: string
  historicoClinico?: string
  comorbidades?: Comorbidities
  tipoCirurgia?: string
  porteCirurgico?: SurgerySize
  urgencia?: SurgeryUrgency
  observacoesMedicas?: string
  avaliadoPor?: string
  avaliadoEm?: string
}

export interface ExamType {
  id: string
  name: string
  category: string
  description?: string
  unit?: string
  referenceRange?: string
  valueReference?: string
  createdBy: string
  createdAt: string
}

export interface ExamResult {
  status?: 'normal' | 'alterado' | 'pendente'
  value?: string
  notes?: string
}

export type ExamStatus = 'solicitado' | 'coletado' | 'em_analise' | 'concluido' | 'cancelado'

export type LabUrgency =
  | 'emergente'
  | 'muito_urgente'
  | 'urgente'
  | 'pouco_urgente'
  | 'nao_urgente'

export interface ExamRequest {
  id: string
  patientId: string
  examTypeId: string
  examTypeName: string
  status: ExamStatus
  justificativa?: string
  resultado?: string
  valorReferencia?: string
  observacoesLab?: string
  labAnalysis?: string
  labUrgency?: LabUrgency
  anexoUrl?: string
  solicitadoPor: string
  solicitadoEm: string
  coletadoPor?: string
  coletadoEm?: string
  analisadoPor?: string
  analisadoEm?: string
  concluidoPor?: string
  concluidoEm?: string
}

export interface RiskScores {
  asa?: ASAScore
  asaJustificativa?: string
  rcri?: number
  rcriFactors?: string[]
  vsgCri?: number
  vsgCriFactors?: string[]
  calculadoPor?: string
  calculadoEm?: string
}

export interface SurgicalEvaluation {
  id?: string
  patientId?: string
  tipoCirurgia?: string
  especialidade?: string
  porteCirurgico?: SurgerySize
  urgencia?: SurgeryUrgency
  anestesiaPrevista?: string
  scores?: RiskScores
  riscoFinal?: RiskLevel
  conduta?: string
  observacoesCirurgiao?: string
  assinatura?: string
  avaliadoPor?: string
  avaliadoEm?: string
}

export interface Patient {
  id: string
  prontuario: string
  name?: string
  age?: number
  scheduledSurgery?: string
  scheduledDate?: string
  requestingPhysician?: string
  healthInsurance?: string
  riskLevel?: RiskLevel
  
  // Dados basicos (Recepcao)
  nomeCompleto: string
  dataNascimento: string
  idade: number
  sexo: 'M' | 'F' | 'O'
  cpf: string
  bloodType?: string
  allergies?: string[]
  cartaoSus?: string
  telefone: string
  endereco: string
  responsavel?: string
  contatoEmergencia?: string
  unidade: string
  dataEntrada: string
  
  // Status do fluxo
  status: PatientStatus
  prioridade: Priority
  
  // Triagem
  queixaPrincipal?: string
  descricaoInicial?: string
  triageAssignedClinicianId?: string
  triageAssignedClinicianName?: string
  triageRiskClassification?: LabUrgency
  clinicalRequestsSurgicalRisk?: boolean
  clinicalAssignedSurgeonId?: string
  clinicalAssignedSurgeonName?: string
  sinaisVitais?: VitalSigns
  observacoesTriagem?: string
  triageData?: {
    vitalSigns?: VitalSigns
    comorbidities?: Comorbidities
    asaClassification?: ASAClassification
    notes?: string
    completedAt?: string
    completedBy?: string
  }
  
  // Avaliacao clinica
  avaliacaoClinica?: ClinicalEvaluation
  clinicalEvaluation?: ClinicalEvaluation
  
  // Exames
  examesSolicitados: string[]
  examResults?: Record<string, ExamResult>
  labRiskClassification?: LabUrgency
  labRiskNotes?: string
  labNurseObservation?: string
  
  // Avaliacao cirurgica
  avaliacaoCirurgica?: SurgicalEvaluation
  surgicalRiskAssessment?: {
    finalRiskLevel?: RiskLevel
    recommendation?: 'aprovar' | 'adiar' | 'contraindicar'
    notes?: string
    completedAt?: string
    completedBy?: string
  }
  
  // Auditoria
  cadastradoPor: string
  cadastradoEm: string
  ultimaAtualizacao: string
  ultimoAtualizadoPor: string
  updatedAt?: string
}

export type AuditAction = 
  | 'cadastro_paciente'
  | 'edicao_dados_basicos'
  | 'encaminhamento_triagem'
  | 'registro_sinais_vitais'
  | 'alteracao_sinais_vitais'
  | 'registro_queixa'
  | 'encaminhamento_clinico'
  | 'avaliacao_clinica'
  | 'cadastro_exame'
  | 'solicitacao_exame'
  | 'coleta_exame'
  | 'analise_exame'
  | 'resultado_exame'
  | 'encaminhamento_laboratorio'
  | 'encaminhamento_cirurgiao'
  | 'calculo_score'
  | 'classificacao_risco'
  | 'liberacao_cirurgia'
  | 'contraindicacao_cirurgia'
  | 'geracao_relatorio'
  | 'triagem_concluida'
  | 'triagem_atualizada'
  | 'avaliacao_clinica_concluida'
  | 'avaliacao_clinica_atualizada'
  | 'avaliacao_cirurgica_concluida'
  | 'avaliacao_cirurgica_atualizada'
  | 'paciente_cadastrado'
  | 'exames_registrados'
  | 'exames_atualizados'
  | 'login'
  | 'logout'

export interface AuditLog {
  id: string
  patientId?: string
  userId: string
  userName: string
  userRole: UserRole
  action: AuditAction
  description: string
  details?: string
  previousValue?: string
  newValue?: string
  timestamp: string
}

// Permissoes por perfil
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  recepcao: [
    'view_dashboard_recepcao',
    'view_patients_list',
    'create_patient',
    'edit_patient_basic',
    'search_patient',
    'forward_to_triage',
  ],
  triagem: [
    'view_dashboard_triagem',
    'view_patients_list',
    'create_patient',
    'edit_patient_basic',
    'search_patient',
    'forward_to_triage',
    'register_vital_signs',
    'edit_vital_signs',
    'register_complaint',
    'forward_to_clinical',
  ],
  clinico: [
    'view_dashboard_clinico',
    'view_patients_list',
    'view_clinical_data',
    'search_patient',
    'register_vital_signs',
    'clinical_evaluation',
    'create_exam_type',
    'request_exams',
    'view_exam_results',
    'forward_to_lab',
    'forward_to_surgeon',
    'return_to_triage',
  ],
  laboratorio: [
    'view_dashboard_laboratorio',
    'view_pending_exams',
    'view_patient_minimal',
    'register_exam_result',
    'update_exam_status',
  ],
  cirurgiao: [
    'view_dashboard_cirurgiao',
    'view_patients_list',
    'view_all_data',
    'view_clinical_data',
    'register_vital_signs',
    'request_exams',
    'view_exam_results',
    'calculate_scores',
    'classify_risk',
    'approve_surgery',
    'contraindicate_surgery',
    'generate_report',
    'view_audit',
    'return_to_clinical',
    'return_to_lab',
  ],
  admin: [
    'view_dashboard_admin',
    'view_all_data',
    'view_patients_list',
    'create_patient',
    'edit_patient_basic',
    'create_exam_type',
    'manage_users',
    'manage_sectors',
    'view_audit',
    'view_reports',
    'system_settings',
  ],
}

export const ROLE_LABELS: Record<UserRole, string> = {
  recepcao: 'Recepcao',
  triagem: 'Triagem',
  clinico: 'Medico Clinico',
  laboratorio: 'Laboratorio',
  cirurgiao: 'Cirurgiao',
  admin: 'Administrador',
}

export const STATUS_LABELS: Record<PatientStatus, string> = {
  aguardando_triagem: 'Aguardando Triagem',
  em_triagem: 'Em Triagem',
  aguardando_avaliacao: 'Aguardando Avaliacao',
  aguardando_clinico: 'Aguardando Clinico',
  em_avaliacao_clinica: 'Em Avaliacao Clinica',
  aguardando_exames: 'Aguardando Exames',
  aguardando_resultado: 'Aguardando Resultado',
  exames_solicitados: 'Exames Solicitados',
  aguardando_laboratorio: 'Aguardando Laboratorio',
  exames_em_analise: 'Exames em Analise',
  exames_concluidos: 'Exames Concluidos',
  aguardando_cirurgiao: 'Aguardando Cirurgiao',
  em_avaliacao_cirurgica: 'Em Avaliacao Cirurgica',
  concluido: 'Concluido',
  liberado: 'Liberado para Cirurgia',
  alto_risco: 'Alto Risco',
  contraindicado: 'Contraindicado',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  baixo: 'Baixo Risco',
  moderado: 'Risco Moderado',
  alto: 'Alto Risco',
  critico: 'Risco Critico',
  contraindicado: 'Contraindicado',
  pendente: 'Pendente',
}
