import { hasUserPermission } from './permissions'
import type { AssessmentSpecialty, Patient, PatientStatus, User } from './types'

export const ASSESSMENT_LABELS: Record<AssessmentSpecialty, string> = {
  cardiologista: 'Cardiologia', anestesista: 'Anestesia', cirurgiao: 'Cirurgia',
}
export interface AssessmentDraft {
  requestRisk: boolean
  targets: AssessmentSpecialty[]
  assignees: Partial<Record<AssessmentSpecialty, string>>
}
export function hasPendingAssessment(patient: Patient, specialty: AssessmentSpecialty): boolean {
  const request = patient.assessmentRequests?.find((item) => item.specialty === specialty)
  if (!request || request.status !== 'pending' || !request.requestedAt) return false
  const completedAt = specialty === 'cardiologista' ? patient.cardiologyAssessment?.completedAt
    : specialty === 'anestesista' ? patient.anesthesiaAssessment?.completedAt : patient.surgicalRiskAssessment?.completedAt
  return !completedAt || Date.parse(completedAt) < Date.parse(request.requestedAt)
}
export function getAssessmentDraft(patient?: Patient): AssessmentDraft {
  const active = patient?.assessmentRequests?.filter((item) => item.status === 'draft' || hasPendingAssessment(patient, item.specialty)) || []
  return {
    requestRisk: Boolean(patient?.surgicalRiskRequest || patient?.clinicalRequestsSurgicalRisk),
    targets: !patient?.assessmentRequests && patient?.clinicalRequestsSurgicalRisk ? ['cardiologista'] : active.map((item) => item.specialty),
    assignees: !patient?.assessmentRequests ? { cardiologista: patient?.clinicalAssignedCardiologistId, anestesista: patient?.cardiologyAssignedAnesthesiologistId, cirurgiao: patient?.clinicalAssignedSurgeonId } : Object.fromEntries(active.map((item) => [item.specialty, item.assignedProfessionalId || ''])),
  }
}
export function buildAssessmentUpdates(patient: Patient, user: User, draft: AssessmentDraft, complete: boolean, professionals: User[]): Partial<Patient> {
  if (!['clinico', 'cirurgiao'].includes(user.role) || !hasUserPermission(user, 'request_specialist_assessment')) throw new Error('Sem permissão para solicitar avaliações.')
  if (draft.requestRisk && !hasUserPermission(user, 'request_surgical_risk')) throw new Error('Sem permissão para solicitar risco cirúrgico.')
  if (complete && draft.requestRisk && draft.targets.length === 0) throw new Error('Selecione ao menos uma especialidade para avaliar o risco cirúrgico.')
  const now = new Date().toISOString()
  const requests = draft.targets.map((specialty) => {
    if (!(specialty in ASSESSMENT_LABELS) || (user.role === 'cirurgiao' && specialty === 'cirurgiao')) throw new Error('Especialidade inválida para esta solicitação.')
    const assignedId = draft.assignees[specialty]
    const assigned = professionals.find((item) => item.id === assignedId && item.active && item.role === specialty)
    if (assignedId && !assigned) throw new Error('Selecione um profissional ativo da especialidade.')
    const previous = patient.assessmentRequests?.find((item) => item.specialty === specialty)
    const pending = hasPendingAssessment(patient, specialty)
    return { specialty, status: (complete || pending ? 'pending' : 'draft') as 'pending' | 'draft', requestedAt: pending ? previous?.requestedAt : complete ? now : undefined, requestedBy: pending ? previous?.requestedBy : complete ? user.id : undefined, assignedProfessionalId: assigned?.id, assignedProfessionalName: assigned?.name }
  })
  const retained = (patient.assessmentRequests || []).filter((item) => !draft.targets.includes(item.specialty) && item.status === 'pending')
  const all = [...retained, ...requests]
  const cardiologist = all.find((item) => item.specialty === 'cardiologista')
  const anesthetist = all.find((item) => item.specialty === 'anestesista')
  const surgeon = all.find((item) => item.specialty === 'cirurgiao')
  return {
    assessmentRequests: all,
    surgicalRiskRequest: complete && draft.requestRisk && draft.targets.some((specialty) => !hasPendingAssessment(patient, specialty)) ? { requestedBy: user.id, requestedAt: now, requesterRole: user.role as 'clinico' | 'cirurgiao' } : patient.surgicalRiskRequest,
    clinicalRequestsSurgicalRisk: draft.requestRisk,
    clinicalAssignedCardiologistId: cardiologist?.assignedProfessionalId,
    clinicalAssignedCardiologistName: cardiologist?.assignedProfessionalName,
    cardiologyAssignedAnesthesiologistId: anesthetist?.assignedProfessionalId,
    cardiologyAssignedAnesthesiologistName: anesthetist?.assignedProfessionalName,
    clinicalAssignedSurgeonId: surgeon?.assignedProfessionalId,
    clinicalAssignedSurgeonName: surgeon?.assignedProfessionalName,
  }
}
export function nextAssessmentStatus(patient: Patient, fallback: PatientStatus): PatientStatus {
  if (hasPendingAssessment(patient, 'cardiologista')) return 'aguardando_cardiologista'
  if (hasPendingAssessment(patient, 'anestesista')) return 'aguardando_anestesista'
  if (hasPendingAssessment(patient, 'cirurgiao')) return 'aguardando_cirurgiao'
  return fallback
}
