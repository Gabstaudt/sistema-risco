import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { createManchesterRecord, editManchesterPriority, getPatientManchesterPriority } from './manchester'
import { users } from './data/users'
const clinician = users.find((user) => user.role === 'clinico')!
import { hydratePatient, patients } from './data/patients'

test('completion requires an identified nurse and priority', () => {
  assert.throws(() => createManchesterRecord('', 'Flow', 'Discriminator', 'nurse-1', true), /prioridade/)
  assert.throws(() => createManchesterRecord('urgente', 'Flow', 'Discriminator', '', true), /Manchester/)
  const completed = createManchesterRecord('urgente', ' Flow ', ' Discriminator ', 'nurse-1', true)!
  assert.equal(completed.flowchart, 'Flow')
  assert.equal(completed.discriminator, 'Discriminator')
  assert.equal(completed.classifiedBy, 'nurse-1')
  assert.ok(completed.classifiedAt)
  assert.equal(completed.targetMinutes, 60)
})

test('completion allows optional flowchart and discriminator independently or both blank', () => {
  for (const [flowchart, discriminator] of [[' ', ' '], ['Flow', ''], ['', 'Discriminator']]) {
    const completed = createManchesterRecord('urgente', flowchart, discriminator, 'nurse-1', true)!
    assert.equal(completed.flowchart, flowchart.trim())
    assert.equal(completed.discriminator, discriminator.trim())
    assert.equal(completed.classifiedBy, 'nurse-1')
    assert.ok(completed.classifiedAt)
  }
})

test('an incomplete draft is not recorded as a completed classification', () => {
  assert.equal(createManchesterRecord('', '', '', 'nurse-1', false), undefined)
  const draft = createManchesterRecord('emergente', '', '', 'nurse-1', false)!
  assert.equal(draft.classifiedAt, undefined)
  assert.equal(draft.classifiedBy, undefined)
})

test('saved nursing findings and Manchester survive hydration without recreating ASA', () => {
  const record = createManchesterRecord('urgente', 'Flow', 'Discriminator', 'nurse-1', true)!
  const patient = { ...patients[1], triageData: { manchester: record, vitalSigns: { heartRate: 88 }, notes: 'Saved nursing notes', asaClassification: 'III' as const } }
  const restored = hydratePatient(patient)
  assert.deepEqual(restored.triageData?.manchester, record)
  assert.equal(restored.triageData?.vitalSigns?.heartRate, 88)
  assert.equal(restored.triageData?.notes, 'Saved nursing notes')
  assert.equal(restored.triageData?.asaClassification, undefined)
  assert.deepEqual(restored.anesthesiaAssessment, patient.anesthesiaAssessment)
})

test('clinical priority edits preserve nursing attribution and findings in the same record', () => {
  const original = createManchesterRecord('urgente', 'Flow', 'Discriminator', 'user-2', true)!
  const patient = { ...patients[2], triageRiskClassification: 'urgente' as const, triageData: { manchester: original, notes: 'Nursing notes', completedBy: 'user-2', completedAt: original.classifiedAt } }
  const edited = editManchesterPriority(patient, 'muito_urgente', clinician)
  assert.equal(edited.triageRiskClassification, 'muito_urgente')
  assert.equal(edited.prioridade, 'urgente')
  assert.equal(edited.triageData?.notes, 'Nursing notes')
  assert.equal(edited.triageData?.completedBy, 'user-2')
  assert.equal(edited.triageData?.manchester?.classifiedBy, 'user-2')
  assert.equal(edited.triageData?.manchester?.classifiedAt, original.classifiedAt)
  assert.equal(edited.triageData?.manchester?.updatedBy, clinician.id)
  assert.equal(edited.triageData?.manchester?.targetMinutes, 10)
  assert.equal(edited.triageData?.manchester?.discriminator, 'Discriminator')
  assert.equal(getPatientManchesterPriority(hydratePatient({ ...patient, ...edited })), 'muito_urgente')
  assert.deepEqual(editManchesterPriority(patient, 'urgente', clinician), {})
})

test('clinician only edits existing triage classification and unauthorized profiles cannot change it', () => {
  const unclassified = { ...patients[0], triageRiskClassification: undefined, triageData: undefined }
  assert.throws(() => editManchesterPriority(unclassified, 'urgente', clinician), /primeiro pela triagem/)
  assert.deepEqual(editManchesterPriority(unclassified, '', clinician), {})
  assert.throws(() => editManchesterPriority(patients[2], 'muito_urgente', { ...clinician, permissions: [] }), /permissão/)
  assert.throws(() => editManchesterPriority(patients[2], 'muito_urgente', users[0]), /permissão/)
})

test('shared priority uses the saved Manchester value rather than generic or laboratory priorities', () => {
  const patient = { ...patients[2], triageRiskClassification: 'nao_urgente' as const, labRiskClassification: 'emergente' as const, triageData: { manchester: createManchesterRecord('urgente', '', '', 'user-2', true)! } }
  assert.equal(getPatientManchesterPriority(patient), 'urgente')
  assert.equal(getPatientManchesterPriority(patients[2]), patients[2].triageRiskClassification)
})
