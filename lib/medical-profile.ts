import type { Patient, User, UserRole } from './types'

export const MEDICAL_SPECIALTIES = ['clinico', 'cirurgiao', 'cardiologista', 'anestesista'] as const
export type MedicalSpecialty = typeof MEDICAL_SPECIALTIES[number]
export function isDoctor(user: User | null): user is User & { role: MedicalSpecialty } {
  return Boolean(user && (MEDICAL_SPECIALTIES as readonly string[]).includes(user.role))
}
export function professionalHierarchy(role: UserRole): { group: NonNullable<User['professionalGroup']>; specialty?: MedicalSpecialty } {
  return (MEDICAL_SPECIALTIES as readonly string[]).includes(role)
    ? { group: 'medico' as const, specialty: role as MedicalSpecialty }
    : { group: role as Exclude<UserRole, MedicalSpecialty>, specialty: undefined }
}
/** Assignment is independent of clinical read permissions and cannot be bypassed by view_all_data. */
export function isPatientAssignedToDoctor(patient: Patient, user: User | null) {
  if (!user) return false
  if (!isDoctor(user)) return true
  const request = patient.assessmentRequests?.find(item => item.specialty === user.role)
  if (request) return request.assignedProfessionalId === user.id
  const assigned = user.role === 'clinico' ? patient.triageAssignedClinicianId
    : user.role === 'cirurgiao' ? patient.clinicalAssignedSurgeonId
    : user.role === 'cardiologista' ? patient.clinicalAssignedCardiologistId
    : patient.cardiologyAssignedAnesthesiologistId
  return assigned === user.id
}

/** Adapter accepts the new backend hierarchy while preserving existing specialty routes. */
export type BackendProfile = Omit<User, 'role'> & { role: UserRole | 'medico' }
export function normalizeUserProfile(input: BackendProfile): User {
  const role = input.role === 'medico' ? input.medicalSpecialty : input.role
  if (!role || !['farmacia','recepcao', 'triagem', 'laboratorio','enfermaria', 'admin', ...MEDICAL_SPECIALTIES].includes(role)) throw new Error('Perfil profissional inválido.')
  const hierarchy = professionalHierarchy(role)
  return { ...input, role, professionalGroup: hierarchy.group, medicalSpecialty: hierarchy.specialty }
}
