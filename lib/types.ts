import type {WardStay} from './ward'
import type {ConsultationRecord} from './medical-care'
import type {TriageIntake} from './triage-intake'
import type { CareTiming } from './admin-analytics'
// Tipos base do sistema de Avaliacao de Risco Cirurgico

export type UserRole = 'farmacia' | 'recepcao' | 'triagem' | 'clinico' | 'laboratorio' | 'cardiologista' | 'anestesista' | 'cirurgiao' | 'enfermaria' | 'admin'

export interface User {
  previewMode?:boolean
  isHealthProfessional?:boolean
  cboCode?:string
  occupationName?:string
  unitName?:string
  professionalCns?:string
  workplaceAvailability?:'disponivel'|'em_atendimento'|'indisponivel'
  sectorId?:string
  profileId?: string
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  /** Sala atual de atendimento, informada pelo cadastro/serviço de profissionais. */
  professionalGroup?: 'medico' | 'farmacia' | 'recepcao' | 'triagem' | 'laboratorio' | 'enfermaria' | 'admin'
  medicalSpecialty?: 'clinico' | 'cirurgiao' | 'cardiologista' | 'anestesista'
  professionalRegistration?: string
  consultationRoom?: string
  /** Effective permissions supplied by the backend; [] means no access. */
  permissions?: string[]
  department?: string
  avatar?: string
  active: boolean
  createdAt: string
}

export type PatientStatus =
  | 'aguardando_enfermaria'
  | 'em_enfermaria'
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
  | 'aguardando_cardiologista'
  | 'em_avaliacao_cardiologica'
  | 'aguardando_anestesista'
  | 'em_avaliacao_anestesica'
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
  hgt?:number
  glasgow?:number
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
  lesionType?: string
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

export type ExamResultMode = 'single_file' | 'multiple_images' | 'individual'
export interface ExamAttachmentFile { id: string; name: string; type: string; size: number; uploadedAt: string; uploadedBy: string }

export interface ExamAgeRange {
  id: string
  name: string
  minYears: number
  maxYears?: number
  reference: string
}

export interface ExamType {
  ageRanges?: ExamAgeRange[]
  active?: boolean
  resultMode?: ExamResultMode
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
  performedCboCode?:string
  performedOccupation?:string
  performedSector?:string
  performedUnit?:string
  performedProfessionalCns?:string
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
  attachment?: ExamAttachmentFile
  attachments?: ExamAttachmentFile[]
  examCategory?: string
  resultMode?: ExamResultMode
  performedAt?: string
  performedBy?: string
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

export interface CardiologyAssessment {
  specialistReferral?: string
  riskScores?: Partial<Record<'rcri' | 'vsgcri' | 'emapo' | 'acp', { result: string; interpretation: string }>>
  surgeryType?: string
  urgency?: SurgeryUrgency
  releaseProfile?: 'eletiva' | 'emergencia'
  damageControlMeasures?: string
  postoperativeSupport?: 'sem_uti' | 'com_uti'
  finalRiskLevel?: RiskLevel
  recommendation?: 'aprovar' | 'adiar' | 'contraindicar'
  notes?: string
  completedAt?: string
  completedBy?: string
}

export interface SurgeryRecord {
  id: string
  procedureType: string
  segment: string
  status: 'planejada' | 'realizada' | 'cancelada'
  performedAt?: string
  notes: string
  postoperativeNotes: string
  postoperativeOutcome: 'em_acompanhamento' | 'alta' | 'retorno' | 'internacao'
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface AnesthesiaAssessment {
  anestheticHistory?: string
  airwayAssessment?: string
  asaClassification?: ASAClassification
  additionalRequests?: string
  requestsAdditionalEvaluation?: boolean
  anesthesiaType?: string
  fitForAnesthesia?: boolean
  recommendation?: 'aprovar' | 'reavaliar' | 'contraindicar'
  notes?: string
  completedAt?: string
  completedBy?: string
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

export interface AdministeredMedication {
  name: string
  dose?: string
  route?: string
  administeredAt?: string
  prescribedBy?: string
  notes?: string
}

export interface PatientEncounter {
  attendanceRoute?: AttendanceRoute
  attendanceClosure?: AttendanceClosure
  clinicalSnapshot?: Pick<Patient, 'clinicalEvaluation' | 'cardiologyAssessment' | 'anesthesiaAssessment' | 'surgicalRiskAssessment' | 'triageData' | 'examResults' | 'avaliacaoClinica' | 'avaliacaoCirurgica'>
  id: string
  entryAt: string
  dischargeAt?: string
  unit: string
  reason: string
  receptionNotes?: string
  triage?: {
    performedBy?: string
    assignedClinicianName?: string
    riskClassification?: LabUrgency
    asaClassification?: ASAClassification
    vitalSignsSummary?: string
    notes?: string
  }
  clinical?: {
    physicianName?: string
    hypothesis?: string
    conduct?: string
    notes?: string
  }
  surgery?: {
    surgeonName?: string
    decision?: string
    notes?: string
  }
  medicationsAdministered?: AdministeredMedication[]
  examsSummary?: string[]
  outcome?: string
}

export interface ManchesterClassification {
  protocol: 'Manchester'
  priority: LabUrgency
  flowchart: string
  discriminator: string
  targetMinutes: number
  classifiedAt?: string
  classifiedBy?: string
  updatedAt?: string
  updatedBy?: string
}

export type AssessmentSpecialty = 'cardiologista' | 'anestesista' | 'cirurgiao'
export interface SpecialtyAssessmentRequest {
  specialty: AssessmentSpecialty
  status: 'draft' | 'pending' | 'completed'
  requestedAt?: string
  requestedBy?: string
  assignedProfessionalId?: string
  assignedProfessionalName?: string
}

export interface MedicationOrder {
  id: string
  patientId: string
  medication: string
  dose: string
  route: string
  instructions: string
  status: 'solicitada' | 'administrada' | 'cancelada'
  cancelledReason?: string
  requestedAt: string
  requestedBy: string
  administeredAt?: string
  administeredBy?: string
}

export type AttendanceRoute = 'com_triagem' | 'sem_triagem'
export interface AttendanceClosure {kind:'baixa'|'cancelamento';reason:string;at:string;by:string}
export interface Patient {
  receptionSectorId?:string
  receptionSectorName?:string
  receptionProfessionalId?:string
  receptionProfessionalName?:string
  wardStays?:WardStay[]
  medicalConsultations?:ConsultationRecord[]
  medicalTransfers?:{at:string;from:string;to?:string;sectorId:string;sectorName:string;reason:string;clinicalSnapshot:Partial<Pick<Patient,'clinicalEvaluation'|'cardiologyAssessment'|'anesthesiaAssessment'|'surgicalRiskAssessment'>>}[]
  attendanceRoute?: AttendanceRoute
  attendanceClosure?: AttendanceClosure
  receptionClassification?: 'branca'
  nomeSocial?: string
  genero?: string
  racaCor?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  ufResidencia?: string
  municipioResidencia?: string
  ufNascimento?: string
  municipioNascimento?: string
  situacaoRua?: boolean
  telefone2?: string
  whatsapp?: string
  email?: string
  escolaridade?: string
  nomeMae?: string
  maeDesconhecida?: boolean
  nomePai?: string
  paiDesconhecido?: boolean
  telefoneResponsavel?: string
  informacoesComplementares?: string
  nacionalidade?: 'brasileira'|'naturalizado'|'estrangeiro'|string
  paisNascimento?: string
  dataNaturalizacao?: string
  portariaNaturalizacao?: string
  dataEntradaBrasil?: string
  pisPasep?: string
  possuiPlanoPrivado?: boolean
  nomePlanoPrivado?: string
  ocupacao?: string
  photoId?: string
  careTimings?: CareTiming[]
  ticketId?: string
  ticketNumber?: string
  surgeryRecords?: SurgeryRecord[]
  assessmentRequests?: SpecialtyAssessmentRequest[]
  surgicalRiskRequest?: { requestedBy: string; requestedAt: string; requesterRole: 'clinico' | 'cirurgiao' }
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
  dischargeAt?: string
  
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
  clinicalAssignedCardiologistId?: string
  clinicalAssignedCardiologistName?: string
  cardiologyAssignedAnesthesiologistId?: string
  cardiologyAssignedAnesthesiologistName?: string
  clinicalAssignedSurgeonId?: string
  clinicalAssignedSurgeonName?: string
  sinaisVitais?: VitalSigns
  observacoesTriagem?: string
  triageData?: {
    intake?:TriageIntake
    manchester?: ManchesterClassification
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
  visitHistory?: PatientEncounter[]
  cardiologyAssessment?: CardiologyAssessment
  anesthesiaAssessment?: AnesthesiaAssessment
  
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

export interface MedicalDocument {
  id: string
  patientId: string
  kind: 'receita' | 'atestado' | 'autorizacao' | 'requisicao_exames' | 'folha_internacao' | 'evolucao_clinica' | 'notificacao_internacao' | 'notificacao_infeccao'
  content: string
  issuedAt: string
  physicianId: string
  physicianName: string
  physicianRole: UserRole
  professionalRegistration: string
  startDate?: string
  endDate?: string
}

export type AuditAction =
  | 'enfermaria_entrada'
  | 'enfermaria_sinais_vitais'
  | 'enfermaria_observacao'
  | 'enfermaria_reavaliacao'
  | 'enfermaria_alta'
  | 'consulta_medica_atualizada'
  | 'consulta_medica_finalizada'
  | 'paciente_encaminhado_medico'
  | 'local_medico_atualizado'
  | 'setor_gerenciado'
  | 'atendimento_atualizado'
  | 'atendimento_encerrado'
  | 'usuario_gerenciado'
  | 'perfil_gerenciado'
  | 'inicio_atendimento'
  | 'documento_medico_emitido'
  | 'senha_ausente'
  | 'senha_retornada'
  | 'medicacao_solicitada'
  | 'medicacao_administrada'
  | 'senha_chamada'
  | 'senha_encaminhada'
  | 'cirurgia_registrada'
  | 'cirurgia_atualizada'
  | 'solicitacao_avaliacao_especializada'
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
  | 'encaminhamento_cardiologia'
  | 'encaminhamento_anestesia'
  | 'encaminhamento_cirurgiao'
  | 'calculo_score'
  | 'classificacao_risco'
  | 'liberacao_cirurgia'
  | 'contraindicacao_cirurgia'
  | 'avaliacao_cardiologica_concluida'
  | 'avaliacao_cardiologica_atualizada'
  | 'avaliacao_anestesica_concluida'
  | 'avaliacao_anestesica_atualizada'
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
  farmacia:['view_dashboard_farmacia','manage_pharmacy','view_patient_basic','view_patients_list'],
  enfermaria:['view_dashboard_enfermaria','view_patients_list','search_patient','view_ward_care','ward_admit','ward_record_vitals','ward_observations','ward_reassess','ward_discharge','administer_medication','print_medication_sheet','print_patient_record'],
  recepcao: [
    'manage_attendance',
    'print_blank_attendance',
    'manage_reception_queue',
    'view_dashboard_recepcao',
    'view_patients_list',
    'create_patient',
    'edit_patient_basic',
    'search_patient',
    'forward_to_triage',
  ],
  triagem: [
    'cancel_triage_attendance',
    'forward_triage_sector',
    'print_triage_sheet',
    'print_medication_sheet',
    'print_patient_history',
    'print_patient_record',
    'call_triage_ticket',
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
    'manage_own_workplace','medical_consultation','transfer_patient','issue_admission_documents','view_medical_reports','print_triage_sheet',
    'issue_prescription',
    'issue_certificate',
    'print_patient_record',
    'print_patient_history',
    'print_medication_sheet',
    'print_exams',
    'prescribe_medication',
    'request_surgical_risk',
    'request_specialist_assessment',
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
    'forward_to_cardiologist',
    'forward_to_surgeon',
    'return_to_triage',
  ],
  laboratorio: [
    'print_patient_record',
    'print_patient_history',
    'view_patients_list',
    'print_medication_sheet',
    'print_exams',
    'administer_medication',
    'view_dashboard_laboratorio',
    'view_pending_exams',
    'view_patient_minimal',
    'register_exam_result',
    'update_exam_status',
  ],
  cardiologista: [
    'manage_own_workplace','medical_consultation','transfer_patient','issue_admission_documents','view_medical_reports','print_triage_sheet',
    'prescribe_medication',
    'issue_prescription',
    'issue_certificate',
    'print_patient_record',
    'print_patient_history',
    'print_medication_sheet',
    'print_exams',
    'request_exams',
    'view_dashboard_cardiologista',
    'view_patients_list',
    'view_all_data',
    'view_clinical_data',
    'view_exam_results',
    'classify_cardiac_risk',
    'calculate_scores',
    'approve_for_surgery',
    'contraindicate_surgery',
    'forward_to_surgeon',
    'generate_report',
  ],
  anestesista: [
    'manage_own_workplace','medical_consultation','transfer_patient','issue_admission_documents','view_medical_reports','print_triage_sheet',
    'issue_prescription',
    'issue_certificate',
    'print_patient_record',
    'print_patient_history',
    'print_medication_sheet',
    'print_exams',
    'request_exams',
    'view_dashboard_anestesista',
    'view_patients_list',
    'view_all_data',
    'view_clinical_data',
    'view_exam_results',
    'classify_asa',
    'request_additional_evaluation',
    'approve_for_anesthesia',
    'contraindicate_anesthesia',
    'forward_to_surgeon',
  ],
  cirurgiao: [
    'manage_own_workplace','medical_consultation','transfer_patient','issue_admission_documents','view_medical_reports','print_triage_sheet',
    'create_exam_type',
    'issue_prescription',
    'issue_certificate',
    'print_patient_record',
    'print_patient_history',
    'print_medication_sheet',
    'print_exams',
    'prescribe_medication',
    'record_surgery',
    'request_surgical_risk',
    'request_specialist_assessment',
    'view_dashboard_cirurgiao',
    'view_patients_list',
    'view_all_data',
    'view_clinical_data',
    'register_vital_signs',
    'request_exams',
    'view_exam_results',
    'classify_risk',
    'approve_surgery',
    'contraindicate_surgery',
    'generate_report',
    'view_audit',
    'return_to_clinical',
    'return_to_lab',
  ],
  admin: [
    'manage_pharmacy',
    'manage_attendance',
    'print_blank_attendance',
    'manage_profiles',
    'print_patient_history',
    'print_patient_record',
    'print_medication_sheet',
    'print_exams',
    'view_surgery_audit',
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
  farmacia:'Farmácia',
  enfermaria:'Enfermaria',
  recepcao: 'Recepcao',
  triagem: 'Triagem',
  clinico: 'Medico Clinico',
  laboratorio: 'Laboratorio',
  cardiologista: 'Cardiologista',
  anestesista: 'Anestesista',
  cirurgiao: 'Cirurgiao',
  admin: 'Administrador',
}

export const STATUS_LABELS: Record<PatientStatus, string> = {
  aguardando_enfermaria:'Aguardando entrada na enfermaria',
  em_enfermaria:'Em acompanhamento na enfermaria',
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
  aguardando_cardiologista: 'Aguardando Cardiologista',
  em_avaliacao_cardiologica: 'Em Avaliacao Cardiologica',
  aguardando_anestesista: 'Aguardando Anestesista',
  em_avaliacao_anestesica: 'Em Avaliacao Anestesica',
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
