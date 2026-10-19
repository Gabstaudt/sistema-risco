import type { Patient, User } from './types'
import { hasUserPermission } from './permissions'
import { cleanRegistration,registrationDraft,REGISTRATION_TEXT_FIELDS,REGISTRATION_BOOLEAN_FIELDS,type RegistrationDraft } from './patient-registration'
export const PATIENT_BASIC_EDIT_FIELDS=[...REGISTRATION_TEXT_FIELDS,...REGISTRATION_BOOLEAN_FIELDS] as const
export type PatientBasicDraft=RegistrationDraft
export const getPatientBasicDraft=registrationDraft
export function validatePatientBasicEdit(user:User|null,id:string,draft:PatientBasicDraft,patients:Patient[],today=new Date()):Partial<Patient>{
 if(!hasUserPermission(user,'view_patient_basic')||!hasUserPermission(user,'edit_patient_basic'))throw new Error('Seu perfil não tem permissão para editar o cadastro.')
 if(!patients.some(patient=>patient.id===id))throw new Error('Paciente não encontrado.')
 return cleanRegistration(draft,patients,id,today)
}
