import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { createManchesterRecord } from './manchester'
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
