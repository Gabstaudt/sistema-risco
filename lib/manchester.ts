import type { LabUrgency, ManchesterClassification } from './types'

// Priority/time references: docs/manchester.md. This is a recording model, not a classification engine.
export const MANCHESTER_PRIORITIES: Record<LabUrgency, { label: string; targetMinutes: number; timeLabel: string; className: string }> = {
  emergente: { label: 'Vermelho - Emergente', targetMinutes: 0, timeLabel: 'Atendimento imediato', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja - Muito urgente', targetMinutes: 10, timeLabel: 'Tempo-alvo: 10 minutos', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo - Urgente', targetMinutes: 60, timeLabel: 'Tempo-alvo: 60 minutos', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde - Pouco urgente', targetMinutes: 120, timeLabel: 'Tempo-alvo: 120 minutos', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul - Não urgente', targetMinutes: 240, timeLabel: 'Tempo-alvo: 240 minutos', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

export function createManchesterRecord(priority: LabUrgency | '', flowchart: string, discriminator: string, nurseId: string, complete: boolean): ManchesterClassification | undefined {
  if (complete && (!priority || !flowchart.trim() || !discriminator.trim() || !nurseId)) {
    throw new Error('Informe o fluxograma, o discriminador e a prioridade de Manchester para concluir a triagem.')
  }
  if (!priority) return undefined
  return {
    protocol: 'Manchester', priority, flowchart: flowchart.trim(), discriminator: discriminator.trim(),
    targetMinutes: MANCHESTER_PRIORITIES[priority].targetMinutes,
    classifiedAt: complete ? new Date().toISOString() : undefined,
    classifiedBy: complete ? nurseId : undefined,
  }
}
