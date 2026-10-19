import { REGISTRATION_TEXT_FIELDS, REGISTRATION_BOOLEAN_FIELDS } from './patient-registration'
import { isDoctor, isPatientAssignedToDoctor } from './medical-profile'
import { ROLE_PERMISSIONS, type Patient, type User, type UserRole } from './types'

export const PATIENT_VIEW_PERMISSIONS = [
  'view_patient_basic', 'view_triage_data', 'view_clinical_data',
  'view_exam_results', 'view_patient_history', 'view_patient_audit',
] as const

/** An explicit backend list (including []) replaces all local defaults. */
export function getUserPermissions(user: User | null): readonly string[] {
  if (!user || !user.active || !Object.hasOwn(ROLE_PERMISSIONS, user.role)) return []
  if (user.permissions !== undefined) return Array.isArray(user.permissions) ? user.permissions : []
  const defaults = ROLE_PERMISSIONS[user.role] || []
  const patientViews = user.role === 'recepcao' ? ['view_patient_basic']
    : user.role === 'triagem' ? PATIENT_VIEW_PERMISSIONS.filter((permission) => permission !== 'view_patient_audit')
    : PATIENT_VIEW_PERMISSIONS
  return [...defaults, ...patientViews]
}

export function hasUserPermission(user: User | null, permission: string): boolean {
  const permissions = getUserPermissions(user)
  return permissions.includes(permission) ||
    (PATIENT_VIEW_PERMISSIONS.includes(permission as typeof PATIENT_VIEW_PERMISSIONS[number]) && permissions.includes('view_all_data'))
}

const sectionRoles: Record<string, UserRole> = {
  recepcao: 'recepcao', triagem: 'triagem', clinico: 'clinico', laboratorio: 'laboratorio',
  cardiologista: 'cardiologista', anestesista: 'anestesista', cirurgiao: 'cirurgiao', admin: 'admin',
}

/** Shared by the route guard, navigation and home shortcuts. */
export function canAccessRoute(pathname: string, user: User | null): boolean {
  if (!user) return false
  const segments = pathname.split('/').filter(Boolean)
  const [section, page] = segments
  if (section === 'paciente') {
    if (!hasUserPermission(user, 'view_patient_basic')) return false
    return segments.length === 2 ||
      (segments.length === 3 && segments[2] === 'documentos' && isDoctor(user) && (hasUserPermission(user, 'issue_prescription') || hasUserPermission(user, 'issue_certificate'))) ||
      (segments.length === 3 && segments[2] === 'exames' && hasUserPermission(user, 'view_exam_results')) ||
      (segments.length === 3 && segments[2] === 'medicacoes' && (hasUserPermission(user, 'view_clinical_data') || hasUserPermission(user, 'administer_medication'))) ||
      (segments.length === 3 && segments[2] === 'imprimir' && ['print_patient_record', 'print_patient_history', 'print_medication_sheet', 'print_exams', 'issue_prescription', 'issue_certificate'].some(permission => hasUserPermission(user, permission))) ||
      (segments.length === 3 && segments[2] === 'historico' && hasUserPermission(user, 'view_patient_audit'))
  }
  const role = sectionRoles[section]
  if (!role || !hasUserPermission(user, `view_dashboard_${role}`)) return false
  if (!page) return true
  if (page === 'cadastro') return hasUserPermission(user, 'create_patient')
  if (page === 'pacientes') return hasUserPermission(user, 'view_patients_list') && hasUserPermission(user, 'view_patient_basic')
  if (section === 'recepcao' && page === 'entrada') return hasUserPermission(user, 'manage_reception_queue') && hasUserPermission(user, 'view_patient_basic')
  if (section === 'recepcao' && ['novo','atendimentos','atendimento','ficha-em-branco'].includes(page)) return hasUserPermission(user, page==='ficha-em-branco'?'print_blank_attendance':'manage_attendance')
  if (section === 'recepcao') return page === 'fila' && hasUserPermission(user, 'manage_reception_queue')
  if (section === 'admin') {
    const adminPermissions: Record<string, string> = {
      usuarios: 'manage_users', exames: 'create_exam_type', auditoria: 'view_audit', cirurgias: 'view_surgery_audit', configuracoes: 'manage_profiles', relatorios: 'view_reports',
    }
    if (page === 'configuracoes' && !hasUserPermission(user, 'system_settings')) return false
    return !!adminPermissions[page] && hasUserPermission(user, adminPermissions[page])
  }
  if (section === 'cirurgiao' && page === 'acompanhamento') return hasUserPermission(user, 'record_surgery') && hasUserPermission(user, 'view_clinical_data')
  if (section === 'triagem') return hasUserPermission(user, 'view_triage_data')
  if (section === 'laboratorio') return hasUserPermission(user, 'view_exam_results')
  if (page === 'resultados' || page === 'exames') return hasUserPermission(user, 'view_exam_results')
  return hasUserPermission(user, 'view_clinical_data')
}

/** Explicit allowlists prevent new clinical fields from leaking into reception views. */
export function projectPatientForUser(patient: Patient, user: User | null): Patient | undefined {
  if (!hasUserPermission(user, 'view_patient_basic') || !isPatientAssignedToDoctor(patient, user)) return undefined
  const basicFields = [
    'id', 'prontuario', 'ticketId', 'ticketNumber', 'nomeCompleto', 'name', 'dataNascimento', 'idade', 'age', 'sexo', 'cpf',
    'cartaoSus', 'telefone', 'endereco', 'responsavel', 'contatoEmergencia', 'unidade', 'dataEntrada', 'dischargeAt',
    'healthInsurance', 'bloodType', 'allergies', 'queixaPrincipal', 'descricaoInicial',
    'cadastradoPor', 'cadastradoEm', 'ultimaAtualizacao', 'ultimoAtualizadoPor', 'updatedAt',
  ] as const
  const fields: (keyof Patient)[] = [...basicFields,...REGISTRATION_TEXT_FIELDS,...REGISTRATION_BOOLEAN_FIELDS,'attendanceRoute','attendanceClosure','receptionClassification','triageAssignedClinicianId','triageAssignedClinicianName']
  const triage = hasUserPermission(user, 'view_triage_data')
  const clinical = hasUserPermission(user, 'view_clinical_data')
  const exams = hasUserPermission(user, 'view_exam_results')
  if (triage) fields.push('sinaisVitais', 'observacoesTriagem', 'triageData', 'triageAssignedClinicianId', 'triageAssignedClinicianName', 'triageRiskClassification')
  if (clinical) fields.push('careTimings', 'surgeryRecords', 'assessmentRequests', 'surgicalRiskRequest', 'scheduledSurgery', 'scheduledDate', 'requestingPhysician', 'riskLevel', 'avaliacaoClinica', 'clinicalEvaluation', 'avaliacaoCirurgica', 'surgicalRiskAssessment', 'cardiologyAssessment', 'anesthesiaAssessment', 'clinicalRequestsSurgicalRisk', 'clinicalAssignedCardiologistId', 'clinicalAssignedCardiologistName', 'cardiologyAssignedAnesthesiologistId', 'cardiologyAssignedAnesthesiologistName', 'clinicalAssignedSurgeonId', 'clinicalAssignedSurgeonName')
  if (exams) fields.push('examResults', 'labRiskClassification', 'labRiskNotes', 'labNurseObservation')
  // A visit contains clinical snapshots: history alone does not grant access to them.
  if (hasUserPermission(user, 'view_patient_history') && triage && clinical && exams) fields.push('visitHistory')
  const visible = Object.fromEntries(fields.filter((field) => field in patient).map((field) => [field, patient[field]]))
  return {
    ...visible,
    status: !clinical && ['alto_risco', 'contraindicado', 'liberado'].includes(patient.status) ? 'concluido' : patient.status,
    prioridade: triage ? patient.prioridade : 'normal',
    examesSolicitados: exams ? patient.examesSolicitados : [],
  } as Patient
}
