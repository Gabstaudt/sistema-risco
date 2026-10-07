import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { canAccessRoute, getUserPermissions, hasUserPermission, projectPatientForUser } from './permissions'
import { patients } from './data/patients'
import { users } from './data/users'
import type { Patient, User, UserRole } from './types'

const session = (role: UserRole): User => users.find((user) => user.role === role)!
const receptionist = session('recepcao')

test('reception only sees registration and intake, including on direct navigation', () => {
  for (const route of ['/recepcao', '/recepcao/pacientes', '/recepcao/cadastro', '/paciente/patient-1']) {
    assert.equal(canAccessRoute(route, receptionist), true, route)
  }
  for (const route of ['/paciente/patient-1/historico', '/triagem', '/triagem/atendimento/patient-1', '/clinico/revisar/patient-1', '/laboratorio/resultado/exam-1', '/cardiologista/fila', '/anestesista/fila', '/cirurgiao/relatorio/patient-1', '/admin/auditoria']) {
    assert.equal(canAccessRoute(route, receptionist), false, route)
  }
  for (const permission of ['view_triage_data', 'view_clinical_data', 'view_exam_results', 'view_patient_history']) {
    assert.equal(hasUserPermission(receptionist, permission), false)
  }
})

test('backend grants replace defaults; an empty list does not restore role access', () => {
  const denied = { ...receptionist, permissions: [] }
  assert.deepEqual(getUserPermissions(denied), [])
  assert.equal(canAccessRoute('/recepcao', denied), false)
  assert.equal(canAccessRoute('/paciente/patient-1', denied), false)
  assert.equal(projectPatientForUser(patients[0], denied), undefined)
  const basicOnly = { ...session('cirurgiao'), permissions: ['view_patient_basic'] }
  assert.equal(canAccessRoute('/paciente/patient-1', basicOnly), true)
  assert.equal(canAccessRoute('/paciente/patient-1/historico', basicOnly), false)
  assert.equal(hasUserPermission(basicOnly, 'view_clinical_data'), false)
})

test('basic patient reads cannot leak nested or new clinical fields', () => {
  const source = {
    ...patients[0], status: 'alto_risco', prioridade: 'urgente',
    sinaisVitais: { heartRate: 140 }, triageData: { notes: 'SECRET_TRIAGE' },
    clinicalEvaluation: { notes: 'SECRET_CLINICAL' },
    cardiologyAssessment: { notes: 'SECRET_CARDIOLOGY' },
    surgicalRiskAssessment: { notes: 'SECRET_SURGERY' },
    examResults: { private: { value: 'SECRET_RESULT' } },
    visitHistory: [{ reason: 'SECRET_HISTORY' }],
    futureClinicalField: 'SECRET_FUTURE',
  } as unknown as Patient
  const visible = projectPatientForUser(source, receptionist)!
  assert.equal(visible.nomeCompleto, source.nomeCompleto)
  assert.equal(visible.cpf, source.cpf)
  assert.equal(visible.status, 'concluido')
  assert.equal(visible.prioridade, 'normal')
  assert.deepEqual(visible.examesSolicitados, [])
  assert.equal(JSON.stringify(visible).includes('SECRET_'), false)
  assert.equal(visible.sinaisVitais, undefined)
  assert.equal(visible.clinicalEvaluation, undefined)
  assert.equal(visible.visitHistory, undefined)
  assert.equal(source.triageData?.notes, 'SECRET_TRIAGE', 'projection must not overwrite persisted records')
})

test('granular grants do not implicitly expose medical evaluations or history', () => {
  const user = { ...receptionist, permissions: ['view_patient_basic', 'view_triage_data'] }
  const visible = projectPatientForUser({ ...patients[0], triageData: { notes: 'allowed' }, surgicalRiskAssessment: { notes: 'denied' } }, user)!
  assert.equal(visible.triageData?.notes, 'allowed')
  assert.equal(visible.surgicalRiskAssessment, undefined)
  assert.equal(visible.visitHistory, undefined)
})

test('other profiles retain their existing local patient views', () => {
  for (const role of ['triagem', 'clinico', 'laboratorio', 'cardiologista', 'anestesista', 'cirurgiao', 'admin'] as const) {
    const user = session(role)
    assert.equal(canAccessRoute(`/${role}`, user), true)
    assert.equal(canAccessRoute('/paciente/patient-1', user), true)
    assert.equal(canAccessRoute('/paciente/patient-1/historico', user), role !== 'triagem')
    const projected = projectPatientForUser(patients[0], user)!
    assert.deepEqual(projected.triageData, patients[0].triageData)
    assert.deepEqual(projected.visitHistory, patients[0].visitHistory)
  }
})

test('triage can view hospital encounters but cannot read system execution history', () => {
  const nurse = session('triagem')
  assert.equal(hasUserPermission(nurse, 'view_patient_history'), true)
  assert.equal(hasUserPermission(nurse, 'view_patient_audit'), false)
  assert.equal(canAccessRoute('/paciente/patient-1/historico', nurse), false)
  assert.ok(projectPatientForUser(patients[0], nurse)?.visitHistory)
  const encountersOnly = { ...nurse, permissions: ['view_patient_basic', 'view_patient_history'] }
  assert.equal(canAccessRoute('/paciente/patient-1/historico', encountersOnly), false)
  const explicitlyGranted = { ...nurse, permissions: ['view_patient_basic', 'view_patient_audit'] }
  assert.equal(canAccessRoute('/paciente/patient-1/historico', explicitlyGranted), true)
})

test('anonymous, inactive and unknown sessions fail closed', () => {
  for (const user of [null, { ...receptionist, active: false }, { ...receptionist, role: 'unknown' as UserRole }]) {
    assert.equal(canAccessRoute('/paciente/patient-1', user), false)
    assert.equal(projectPatientForUser(patients[0], user), undefined)
    assert.equal(hasUserPermission(user, 'view_clinical_data'), false)
  }
})
