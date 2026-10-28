import type { Patient, SurgeryRecord, User } from './types'
import { hasUserPermission } from './permissions'
export type SurgeryDraft = Pick<SurgeryRecord, 'procedureType' | 'segment' | 'status' | 'performedAt' | 'notes' | 'postoperativeNotes' | 'postoperativeOutcome'>
export function saveSurgeryRecord(patient: Patient, user: User, draft: SurgeryDraft, id?: string): SurgeryRecord[] {
  if (user.role !== 'cirurgiao' || !hasUserPermission(user, 'record_surgery')) throw new Error('Sem permissão para registrar cirurgias.')
  if (!draft.procedureType.trim()) throw new Error('Informe o tipo de cirurgia.')
  if (!['planejada', 'realizada', 'cancelada'].includes(draft.status)) throw new Error('Situação inválida.')
  if (!['em_acompanhamento', 'alta', 'retorno', 'internacao'].includes(draft.postoperativeOutcome)) throw new Error('Desfecho inválido.')
  if (draft.status === 'realizada') {
    const date = draft.performedAt || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Informe uma data válida para a cirurgia realizada.')
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    if (date > today) throw new Error('Uma cirurgia realizada não pode ter data futura.')
  }
  if (draft.status !== 'realizada' && draft.postoperativeNotes.trim()) throw new Error('Registre o pós-operatório em uma cirurgia realizada.')
  const previous = id ? patient.surgeryRecords?.find((record) => record.id === id) : undefined
  if (id && !previous) throw new Error('Registro de cirurgia não encontrado.')
  const now = new Date().toISOString()
  const record: SurgeryRecord = { ...draft, procedureType: draft.procedureType.trim(), segment: draft.segment.trim(), performedAt: draft.status === 'realizada' ? draft.performedAt : undefined, id: previous?.id || crypto.randomUUID(), createdAt: previous?.createdAt || now, createdBy: previous?.createdBy || user.id, updatedAt: now, updatedBy: user.id }
  return [...(patient.surgeryRecords || []).filter((item) => item.id !== record.id), record]
}
export function summarizeSurgeries(patients: Patient[], from = '', to = '', type = '') {
  const rows = patients.flatMap((patient) => (patient.surgeryRecords || []).filter((record) => record.status === 'realizada' && record.performedAt && (!from || record.performedAt >= from) && (!to || record.performedAt <= to) && (!type || record.procedureType.trim().toLocaleLowerCase('pt-BR') === type.trim().toLocaleLowerCase('pt-BR'))).map((record) => ({ patientId: patient.id, patientName: patient.nomeCompleto, record })))
  const groups = new Map<string, { type: string; count: number }>()
  for (const {record} of rows) {
    const key = record.procedureType.trim().toLocaleLowerCase('pt-BR')
    const group = groups.get(key) || { type: record.procedureType.trim(), count: 0 }; group.count++; groups.set(key, group)
  }
  return { rows: rows.sort((a,b) => b.record.performedAt!.localeCompare(a.record.performedAt!)), byType: [...groups.values()].sort((a,b) => b.count-a.count), total: rows.length }
}
