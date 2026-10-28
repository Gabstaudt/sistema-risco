import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSurgicalRiskUpdate } from './surgical-risk-access'
import { canAccessRoute } from './permissions'
import { patients } from './data/patients'
import { users } from './data/users'

const patient = patients[0]
const cardio = users.find(user => user.role === 'cardiologista')!
const surgeon = users.find(user => user.role === 'cirurgiao')!

test('cardiology owns the calculator and risk assessment, including with custom permissions', () => {
  assert.equal(canAccessRoute('/cardiologista/calculadora', cardio), true)
  assert.equal(canAccessRoute('/cirurgiao/calculadora', surgeon), false)
  assert.equal(canAccessRoute('/cardiologista/calculadora', {...surgeon, permissions: ['view_dashboard_cardiologista', 'classify_cardiac_risk']}), false)
  assert.equal(canAccessRoute('/cardiologista/calculadora', {...cardio, permissions: []}), false)
  assert.doesNotThrow(() => assertSurgicalRiskUpdate(patient, {riskLevel: 'alto'}, cardio))
  assert.throws(() => assertSurgicalRiskUpdate(patient, {riskLevel: 'alto'}, {...cardio, permissions: []}))
})

test('surgeon can record surgical opinion and request risk without overwriting cardiology', () => {
  const current = {...patient, riskLevel: 'baixo' as const, surgicalRiskAssessment: {finalRiskLevel: 'baixo' as const}}
  assert.throws(() => assertSurgicalRiskUpdate(current, {riskLevel: 'alto'}, surgeon))
  assert.throws(() => assertSurgicalRiskUpdate(current, {cardiologyAssessment: {finalRiskLevel: 'alto'}}, surgeon))
  assert.throws(() => assertSurgicalRiskUpdate(current, {surgicalRiskAssessment: {finalRiskLevel: 'alto'}}, surgeon))
  assert.doesNotThrow(() => assertSurgicalRiskUpdate(current, {surgicalRiskAssessment: {...current.surgicalRiskAssessment, notes: 'Conduta cirúrgica', recommendation: 'aprovar'}, surgicalRiskRequest: {requestedBy: surgeon.id, requestedAt: new Date().toISOString(), requesterRole: 'cirurgiao'}}, surgeon))
})
