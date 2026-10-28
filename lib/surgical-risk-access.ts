import type { Patient, User } from './types'
import { hasUserPermission } from './permissions'

/** Risk belongs to cardiology; surgical planning remains a separate assessment. */
export function assertSurgicalRiskUpdate(current: Patient, updates: Partial<Patient>, user: User | null) {
  const changes = (key: keyof Patient) => Object.hasOwn(updates, key) && JSON.stringify(updates[key]) !== JSON.stringify(current[key])
  if ((changes('cardiologyAssessment') || changes('riskLevel')) &&
      (user?.role !== 'cardiologista' || !hasUserPermission(user, 'classify_cardiac_risk'))) {
    throw new Error('Somente o cardiologista pode registrar ou alterar o risco cirúrgico.')
  }
  if ((updates.surgicalRiskAssessment && updates.surgicalRiskAssessment.finalRiskLevel !== current.surgicalRiskAssessment?.finalRiskLevel) ||
      (updates.avaliacaoCirurgica && updates.avaliacaoCirurgica.riscoFinal !== current.avaliacaoCirurgica?.riscoFinal)) {
    throw new Error('Registre o risco cirúrgico na avaliação da cardiologia.')
  }
}
