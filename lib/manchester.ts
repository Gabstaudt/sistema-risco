import type { LabUrgency, ManchesterClassification, Patient, User } from './types'
import { hasUserPermission } from './permissions'

// Priority/time references: docs/manchester.md. This is a recording model, not a classification engine.
export const MANCHESTER_PRIORITIES: Record<LabUrgency, { label: string; targetMinutes: number; timeLabel: string; className: string }> = {
  emergente: { label: 'Vermelho - Emergente', targetMinutes: 0, timeLabel: 'Atendimento imediato', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja - Muito urgente', targetMinutes: 10, timeLabel: 'Tempo-alvo: 10 minutos', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo - Urgente', targetMinutes: 60, timeLabel: 'Tempo-alvo: 60 minutos', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde - Pouco urgente', targetMinutes: 120, timeLabel: 'Tempo-alvo: 120 minutos', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul - Não urgente', targetMinutes: 240, timeLabel: 'Tempo-alvo: 240 minutos', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

export function createManchesterRecord(priority: LabUrgency | '', flowchart: string, discriminator: string, nurseId: string, complete: boolean): ManchesterClassification | undefined {
  if (complete && (!priority || !nurseId)) {
    throw new Error('Informe a prioridade de Manchester e o enfermeiro responsável para concluir a triagem.')
  }
  if (!priority) return undefined
  return {
    protocol: 'Manchester', priority, flowchart: flowchart.trim(), discriminator: discriminator.trim(),
    targetMinutes: MANCHESTER_PRIORITIES[priority].targetMinutes,
    classifiedAt: complete ? new Date().toISOString() : undefined,
    classifiedBy: complete ? nurseId : undefined,
  }
}

export function getPatientManchesterPriority(patient?: Patient): LabUrgency | undefined {
  return patient?.triageData?.manchester?.priority || patient?.triageRiskClassification
}

/** Updates the same triage classification while preserving its nursing author and findings. */
export function editManchesterPriority(patient: Patient, priority: LabUrgency | '', user: User): Partial<Patient> {
  const current = getPatientManchesterPriority(patient)
  if (priority === current || (!current && !priority)) return {}
  if (user.role !== 'clinico' || !hasUserPermission(user, 'clinical_evaluation')) throw new Error('Sem permissão para editar a classificação.')
  if (!current) throw new Error('A classificação precisa ser registrada primeiro pela triagem.')
  if (!priority || !Object.hasOwn(MANCHESTER_PRIORITIES, priority)) throw new Error('Selecione uma prioridade válida de Manchester.')
  const previous = patient.triageData?.manchester
  return {
    triageRiskClassification: priority,
    prioridade: priority === 'emergente' || priority === 'muito_urgente' ? 'urgente' : priority === 'urgente' ? 'alta' : 'normal',
    triageData: {
      ...patient.triageData,
      manchester: {
        ...previous,
        protocol: 'Manchester', priority,
        flowchart: previous?.flowchart || '', discriminator: previous?.discriminator || '',
        targetMinutes: MANCHESTER_PRIORITIES[priority].targetMinutes,
        classifiedAt: previous?.classifiedAt || patient.triageData?.completedAt,
        classifiedBy: previous?.classifiedBy || patient.triageData?.completedBy,
        updatedAt: new Date().toISOString(), updatedBy: user.id,
      },
    },
  }
}
