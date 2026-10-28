import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { hydratePatient, patients } from './data/patients'

test('hospital encounters stay unique when rehydrated and the current snapshot is refreshed', () => {
  const original = patients[0]
  const once = hydratePatient(original)
  const twice = hydratePatient({ ...once, status: 'aguardando_clinico', triageData: { vitalSigns: { heartRate: 88 }, notes: 'Saved triage', completedBy: 'user-2' } })
  assert.equal(twice.visitHistory?.length, original.visitHistory?.length)
  assert.equal(new Set(twice.visitHistory?.map((visit) => visit.id)).size, twice.visitHistory?.length)
  const current = twice.visitHistory?.find((visit) => visit.id === `${twice.id}-visit-current`)!
  assert.equal(current.outcome, 'aguardando_clinico')
  assert.equal(current.triage?.notes, 'Saved triage')
  assert.match(current.triage?.vitalSignsSummary || '', /88/)
  assert.deepEqual(twice.visitHistory?.filter((visit) => visit.dischargeAt), original.visitHistory?.filter((visit) => visit.dischargeAt))
})

test('finalized mock has a discharge, completed triage, clinical assessment and no active queue status', () => {
  const patient = hydratePatient(patients.find((item) => item.id === 'patient-14')!)
  assert.equal(patient.status, 'concluido')
  assert.ok(patient.triageData?.completedAt)
  assert.ok(patient.clinicalEvaluation?.completedAt)
  const current = patient.visitHistory?.find((visit) => visit.id === `${patient.id}-visit-current`)!
  assert.ok(Date.parse(current.dischargeAt!) > Date.parse(current.entryAt))
  assert.match(current.outcome!, /Alta/)
  assert.equal(current.clinical?.physicianName, 'user-3')
})
