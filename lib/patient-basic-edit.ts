import type { Patient, User } from './types'
import { hasUserPermission } from './permissions'

export const PATIENT_BASIC_EDIT_FIELDS = [
  'nomeCompleto', 'dataNascimento', 'sexo', 'cpf', 'cartaoSus', 'telefone', 'endereco',
  'responsavel', 'contatoEmergencia', 'unidade', 'queixaPrincipal', 'descricaoInicial',
] as const

export type PatientBasicDraft = Record<typeof PATIENT_BASIC_EDIT_FIELDS[number], string>

export function getPatientBasicDraft(patient: Patient): PatientBasicDraft {
  return Object.fromEntries(PATIENT_BASIC_EDIT_FIELDS.map((field) => [field, patient[field] || ''])) as PatientBasicDraft
}

export function validatePatientBasicEdit(user: User | null, id: string, draft: PatientBasicDraft, patients: Patient[], today = new Date()): Partial<Patient> {
  if (!hasUserPermission(user, 'view_patient_basic') || !hasUserPermission(user, 'edit_patient_basic')) {
    throw new Error('Seu perfil não tem permissão para editar o cadastro.')
  }
  if (!patients.some((patient) => patient.id === id)) throw new Error('Paciente não encontrado.')
  if (Object.keys(draft).some((field) => !PATIENT_BASIC_EDIT_FIELDS.includes(field as typeof PATIENT_BASIC_EDIT_FIELDS[number]))) {
    throw new Error('A edição permite apenas dados de cadastro e da entrada atual.')
  }
  const name = draft.nomeCompleto.trim()
  const cpf = draft.cpf.replace(/\D/g, '')
  const phone = draft.telefone.replace(/\D/g, '')
  const emergencyPhone = draft.contatoEmergencia.replace(/\D/g, '')
  if (!name || !draft.dataNascimento || !draft.sexo || !cpf || !phone) throw new Error('Preencha nome, nascimento, sexo, CPF e telefone.')
  if (!['M', 'F', 'O'].includes(draft.sexo)) throw new Error('Selecione um sexo válido.')
  if (cpf.length !== 11) throw new Error('Informe um CPF com 11 dígitos.')
  if (patients.some((patient) => patient.id !== id && patient.cpf.replace(/\D/g, '') === cpf)) throw new Error('Já existe outro paciente com este CPF.')
  if (phone.length < 10 || phone.length > 11) throw new Error('Informe um telefone válido com DDD.')
  if (draft.contatoEmergencia.trim() && (emergencyPhone.length < 10 || emergencyPhone.length > 11)) throw new Error('Informe um contato de emergência válido com DDD.')
  const [year, month, day] = draft.dataNascimento.split('-').map(Number)
  const birth = new Date(year, month - 1, day)
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dataNascimento) || birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day || birth > localToday) {
    throw new Error('Informe uma data de nascimento válida, sem data futura.')
  }
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--
  const cleaned = Object.fromEntries(PATIENT_BASIC_EDIT_FIELDS.map((field) => [field, draft[field].trim()]))
  const formatPhone = (digits: string) => digits.length === 11
    ? digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return {
    ...cleaned,
    telefone: formatPhone(phone),
    contatoEmergencia: formatPhone(emergencyPhone),
    cpf: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    sexo: draft.sexo as Patient['sexo'],
    idade: age,
  }
}
