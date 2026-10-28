import {documentPermission,DOCUMENT_TITLES} from './admission-documents'
import type { MedicalDocument, Patient, User } from './types'
import { hasUserPermission } from './permissions'
import { isDoctor, isPatientAssignedToDoctor } from './medical-profile'
export type MedicalDocumentDraft = Pick<MedicalDocument, 'kind' | 'content' | 'professionalRegistration' | 'startDate' | 'endDate'>
const validDay = (value?: string): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value)
export function issueMedicalDocument(patient: Patient, draft: MedicalDocumentDraft, user: User): MedicalDocument {
 if (!isDoctor(user) || !isPatientAssignedToDoctor(patient, user) || !hasUserPermission(user, documentPermission(draft.kind)||'unknown_document_permission')) throw new Error('Sem permissão para emitir este documento.')
 if (!Object.hasOwn(DOCUMENT_TITLES,draft.kind)) throw new Error('Tipo de documento inválido.')
 if (!draft.content.trim() || !draft.professionalRegistration.trim()) throw new Error('Preencha o conteúdo e o registro profissional.')
 if (draft.kind === 'atestado') {
  if (!validDay(draft.startDate) || !validDay(draft.endDate) || draft.endDate < draft.startDate) throw new Error('Informe um período válido para o atestado.')
 }
 return { ...draft, content: draft.content.trim(), professionalRegistration: draft.professionalRegistration.trim(), id: crypto.randomUUID(), patientId: patient.id, issuedAt: new Date().toISOString(), physicianId: user.id, physicianName: user.name, physicianRole: user.role }
}
