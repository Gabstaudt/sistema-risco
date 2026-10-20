import type { ExamAgeRange, ExamRequest, ExamType, LabUrgency, Patient, User } from './types'
import {hasUserPermission} from './permissions'
import {getPatientManchesterPriority} from './manchester'

export function canConfigureLaboratory(user: User | null): boolean {
  return !!user && hasUserPermission(user, 'system_settings') && hasUserPermission(user, 'create_exam_type')
}

export function validateExamConfiguration(exam: Pick<ExamType,'ageRanges'|'active'>, previous: ExamType | undefined, user: User | null) {
  const ranges = exam.ageRanges || []
  const availabilityChanged = previous
    ? (exam.active !== false) !== (previous.active !== false)
    : exam.active === false
  const rangesChanged = JSON.stringify(ranges) !== JSON.stringify(previous?.ageRanges || [])
  if (!canConfigureLaboratory(user) && (availabilityChanged || rangesChanged)) {
    throw new Error('Somente a administração pode configurar disponibilidade e faixas etárias.')
  }
  const ids = new Set<string>()
  for (const range of ranges) {
    if (!range.id || ids.has(range.id) || !range.name.trim()) throw new Error('Informe um nome para cada faixa etária.')
    ids.add(range.id)
    if (!Number.isInteger(range.minYears) || range.minYears < 0 || (range.maxYears !== undefined && (!Number.isInteger(range.maxYears) || range.maxYears < range.minYears))) throw new Error('Informe idades válidas em anos completos.')
  }
  const ordered = [...ranges].sort((a,b)=>a.minYears-b.minYears)
  if (ordered.some((range,index)=>index>0 && range.minYears <= (ordered[index-1].maxYears ?? Infinity))) throw new Error('As faixas etárias do exame não podem se sobrepor.')
}

export function examReferenceForAge(exam: ExamType, age?: number): string | undefined {
  const range = exam.ageRanges?.find(range=>age!==undefined && age>=range.minYears && (range.maxYears===undefined || age<=range.maxYears))
  return range?.reference.trim() || exam.valueReference || exam.referenceRange
}
const priorityOrder: Record<LabUrgency,number> = {emergente:0,muito_urgente:1,urgente:2,pouco_urgente:3,nao_urgente:4}
export function laboratoryPriority(exam: ExamRequest, patient?: Patient) {
  return exam.labUrgency || getPatientManchesterPriority(patient)
}
export function compareLaboratoryQueue(a: ExamRequest,b: ExamRequest,patients: Patient[], byArrivalOnly=false): number {
  const priority = (exam:ExamRequest)=>priorityOrder[laboratoryPriority(exam,patients.find(patient=>patient.id===exam.patientId))!] ?? 5
  const time = (exam:ExamRequest)=>Date.parse(exam.solicitadoEm) || 0
  return (!byArrivalOnly && priority(a)-priority(b)) || time(a)-time(b) || a.id.localeCompare(b.id)
}

export function patientAgeAtRequest(patient?: Patient, now=new Date()): number | undefined {
  if (!patient?.dataNascimento) return undefined
  const birth = patient.dataNascimento.slice(0,10).split('-').map(Number)
  const today = now.toLocaleDateString('en-CA',{timeZone:'America/Belem'}).split('-').map(Number)
  if (birth.length!==3 || birth.some(value=>!Number.isFinite(value))) return undefined
  const age=today[0]-birth[0]-(today[1]<birth[1] || today[1]===birth[1] && today[2]<birth[2] ? 1 : 0)
  return age>=0 ? age : undefined
}
