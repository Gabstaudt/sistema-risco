import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { buildAssessmentUpdates, getAssessmentDraft, hasPendingAssessment, nextAssessmentStatus } from './assessment-requests'
import { users } from './data/users'
import { patients, hydratePatient } from './data/patients'
import { projectPatientForUser } from './permissions'
import type { Patient } from './types'
const clinician = users.find((item) => item.role === 'clinico')!
const surgeon = users.find((item) => item.role === 'cirurgiao')!
const patient = { ...patients[2], assessmentRequests: [], clinicalRequestsSurgicalRisk: false } as Patient

test('clinician requests three specialties and records surgical risk author', () => {
  const updates = buildAssessmentUpdates(patient, clinician, { requestRisk: true, targets: ['cirurgiao', 'anestesista', 'cardiologista'], assignees: { cardiologista: 'user-8' } }, true, users)
  const saved = hydratePatient({ ...patient, ...updates, status: 'aguardando_exames' })
  for (const specialty of ['cirurgiao', 'anestesista', 'cardiologista'] as const) assert.equal(hasPendingAssessment(saved, specialty), true)
  assert.equal(saved.surgicalRiskRequest?.requestedBy, clinician.id)
  assert.equal(saved.surgicalRiskRequest?.requesterRole, 'clinico')
  assert.equal(saved.clinicalAssignedCardiologistName, 'Dra. Helena Cardoso')
  assert.equal(saved.status, 'aguardando_exames')
  assert.equal(projectPatientForUser(saved, users[0])?.assessmentRequests, undefined)
})
test('surgeon may request risk without completing their own final classification', () => {
  const updates = buildAssessmentUpdates(patient, surgeon, { requestRisk: true, targets: ['cardiologista', 'anestesista'], assignees: {} }, true, users)
  assert.equal(updates.surgicalRiskRequest?.requesterRole, 'cirurgiao')
  assert.equal(updates.surgicalRiskAssessment, undefined)
  assert.equal(nextAssessmentStatus({ ...patient, ...updates }, patient.status), 'aguardando_cardiologista')
})
test('draft requests do not enter specialty queues or claim a completed risk request', () => {
  const updates = buildAssessmentUpdates(patient, clinician, { requestRisk: true, targets: ['cardiologista'], assignees: {} }, false, users)
  const saved = hydratePatient({ ...patient, ...updates, status: 'em_avaliacao_clinica' })
  assert.equal(hasPendingAssessment(saved, 'cardiologista'), false)
  assert.equal(saved.surgicalRiskRequest, undefined)
  assert.equal(saved.status, 'em_avaliacao_clinica')
  assert.deepEqual(getAssessmentDraft(saved).targets, ['cardiologista'])
})
test('saving existing requests retains original author and time, and completion removes queue eligibility', () => {
  const saved = { ...patient, ...buildAssessmentUpdates(patient, clinician, { requestRisk: true, targets: ['cardiologista', 'anestesista'], assignees: {} }, true, users) }
  const repeated = { ...saved, ...buildAssessmentUpdates(saved, surgeon, getAssessmentDraft(saved), true, users) }
  assert.deepEqual(repeated.assessmentRequests, saved.assessmentRequests)
  assert.deepEqual(repeated.surgicalRiskRequest, saved.surgicalRiskRequest)
  const completed = { ...repeated, cardiologyAssessment: { completedAt: new Date(Date.now() + 1000).toISOString() } }
  assert.equal(hasPendingAssessment(completed, 'cardiologista'), false)
  assert.equal(hasPendingAssessment(completed, 'anestesista'), true)
  assert.equal(nextAssessmentStatus(completed, 'aguardando_resultado'), 'aguardando_anestesista')
})
test('unauthorized roles, absent backend permission and invalid assignees are rejected', () => {
  const draft = { requestRisk: true, targets: ['cardiologista'] as const, assignees: {} }
  assert.throws(() => buildAssessmentUpdates(patient, users[0], { ...draft, targets: [...draft.targets] }, true, users), /permissão/)
  assert.throws(() => buildAssessmentUpdates(patient, { ...clinician, permissions: [] }, { ...draft, targets: [...draft.targets] }, true, users), /permissão/)
  assert.throws(() => buildAssessmentUpdates(patient, clinician, { ...draft, targets: [...draft.targets], assignees: { cardiologista: surgeon.id } }, true, users), /profissional ativo/)
  assert.throws(() => buildAssessmentUpdates(patient, clinician, { requestRisk: true, targets: [], assignees: {} }, true, users), /especialidade/)
})
