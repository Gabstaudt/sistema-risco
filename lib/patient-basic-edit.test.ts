import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { getPatientBasicDraft, validatePatientBasicEdit, type PatientBasicDraft } from './patient-basic-edit'
import { patients } from './data/patients'
import { users } from './data/users'

const user = users.find((user) => user.role === 'recepcao')!
const patient = patients[0]
const today = new Date(2026, 9, 6)
const draft: PatientBasicDraft = { ...getPatientBasicDraft(patient), dataNascimento: '1980-11-15', telefone: '(91) 99999-1234', contatoEmergencia: '' }

test('reception can update basic data and age without sending clinical fields or identifiers', () => {
  const original = JSON.stringify(patient)
  const result = validatePatientBasicEdit(user, patient.id, { ...draft, nomeCompleto: '  Nome corrigido  ' }, patients, today)
  assert.equal(result.nomeCompleto, 'Nome corrigido')
  assert.equal(result.idade, 45)
  assert.equal(result.telefone, '(91) 99999-1234')
  assert.equal(result.contatoEmergencia, '')
  for (const field of ['id', 'prontuario', 'dataEntrada', 'status', 'prioridade', 'triageData', 'clinicalEvaluation', 'visitHistory', 'sinaisVitais', 'riskLevel']) {
    assert.equal(field in result, false, field)
  }
  assert.equal(JSON.stringify(patient), original)
})

test('an explicit backend permission revocation blocks editing', () => {
  const readOnly = { ...user, permissions: ['view_patient_basic'] }
  assert.throws(() => validatePatientBasicEdit(readOnly, patient.id, draft, patients, today), /permissão/)
  assert.throws(() => validatePatientBasicEdit(null, patient.id, draft, patients, today), /permissão/)
})

test('protected fields are rejected instead of overwriting clinical records', () => {
  assert.throws(() => validatePatientBasicEdit(user, patient.id, { ...draft, status: 'liberado' } as PatientBasicDraft, patients, today), /apenas dados de cadastro/)
})

test('duplicate CPF, invalid and future birthdays are rejected', () => {
  const other = { ...patient, id: 'other', cpf: '987.654.321-00' }
  assert.throws(() => validatePatientBasicEdit(user, patient.id, { ...draft, cpf: '98765432100' }, [patient, other], today), /outro paciente/)
  for (const dataNascimento of ['2026-10-07', '2026-02-30', 'invalid']) {
    assert.throws(() => validatePatientBasicEdit(user, patient.id, { ...draft, dataNascimento }, patients, today), /nascimento/)
  }
})
