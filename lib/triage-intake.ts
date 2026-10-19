import {defaultSectors,userSectorId,type HospitalSector} from './sectors'
import type {Patient,User,PatientStatus} from './types'
import {hasUserPermission} from './permissions'
export const TRIAGE_SECTORS={clinico:'Clínica',laboratorio:'Laboratório',cardiologista:'Cardiologia',anestesista:'Anestesia',cirurgiao:'Cirurgia'} as const
export const PATIENT_STATES=['Consciente','Orientado','Ansioso','Agitado','Não atende ao chamar','Torporoso','Comatoso','Calmo','Desorientado']
export const TRIAGE_SYMPTOMS=['Ritmo sinusal','Palpitações','Taquicardia','Bradicardia','Palidez','Cianose','Taquipneia','Dispneia em repouso','Dispneia noturna','Sudorese','Bradipneia','Hipóxia','Icterícia']
export interface TriageIntake {
 anamnesis:string;origin:string;ecg:''|'sim'|'nao';preexistingDiseases:string;intolerances:string
 medicationsInUse:''|'sim'|'nao';medications:string;pain:''|'leve'|'moderada'|'grave'
 careType:string;patientStates:string[];symptoms:string[];otherDetails:string
 sectorId?:string;sectorName?:string
 destination:keyof typeof TRIAGE_SECTORS;professionalId:string
}
export function triageIntake(patient?:Patient):TriageIntake {
 return {anamnesis:'',origin:'',ecg:'',preexistingDiseases:'',intolerances:(patient?.allergies||[]).join(', '),medicationsInUse:'',medications:'',pain:'',careType:'',patientStates:[],symptoms:[],otherDetails:'',sectorId:'sector-clinico',destination:'clinico',professionalId:patient?.triageAssignedClinicianId||'',...patient?.triageData?.intake}
}
export function validateTriageIntake(draft:TriageIntake,complete:boolean,users:User[],actor:User,sectors:HospitalSector[]=defaultSectors()):Partial<Patient>{
 if(actor.role!=='triagem'||!hasUserPermission(actor,'register_vital_signs'))throw new Error('Sem permissão para registrar triagem.')
 if(draft.anamnesis.length>400)throw new Error('A anamnese deve ter no máximo 400 caracteres.')
 if(draft.preexistingDiseases.length>100)throw new Error('Doenças preexistentes: máximo de 100 caracteres.')
 if(!Object.hasOwn(TRIAGE_SECTORS,draft.destination))throw new Error('Selecione um setor válido.')
 if(draft.origin&&!['Residência','Trabalho','Via pública','Unidade de saúde'].includes(draft.origin))throw new Error('Procedência inválida.')
 if(draft.patientStates.some(value=>!PATIENT_STATES.includes(value))||draft.symptoms.some(value=>!TRIAGE_SYMPTOMS.includes(value)))throw new Error('Estado ou sintoma inválido.')
 if(!['','sim','nao'].includes(draft.ecg)||!['','sim','nao'].includes(draft.medicationsInUse)||!['','leve','moderada','grave'].includes(draft.pain)||draft.careType&&!['Pré-consulta','Urgência','Não urgência','Emergência'].includes(draft.careType))throw new Error('Revise os dados da triagem.')
 if(draft.medicationsInUse==='sim'&&!draft.medications.trim())throw new Error('Informe os medicamentos em uso.')
 if(complete&&!hasUserPermission(actor,'forward_triage_sector'))throw new Error('Sem permissão para encaminhar a outro setor.')
 const sector=sectors.find(sector=>sector.id===(draft.sectorId||'sector-'+draft.destination)&&sector.active&&sector.role===draft.destination)
 if(complete&&!sector)throw new Error('Selecione um setor ativo.')
 const professional=users.find(user=>user.id===draft.professionalId&&user.active&&user.role===draft.destination&&(!sector||userSectorId(user)===sector.id)&&hasUserPermission(user,({clinico:'clinical_evaluation',cardiologista:'classify_cardiac_risk',anestesista:'classify_asa',cirurgiao:'classify_risk',laboratorio:'update_exam_status'} as const)[draft.destination]))
 if(complete&&draft.destination!=='laboratorio'&&!professional)throw new Error('Selecione um profissional ativo do setor.')
 const statuses:Record<keyof typeof TRIAGE_SECTORS,PatientStatus>={clinico:'aguardando_clinico',laboratorio:'aguardando_laboratorio',cardiologista:'aguardando_cardiologista',anestesista:'aguardando_anestesista',cirurgiao:'aguardando_cirurgiao'}
 if(!complete)return {}
 const specialty=['cardiologista','anestesista','cirurgiao'].includes(draft.destination)?draft.destination as 'cardiologista'|'anestesista'|'cirurgiao':undefined
 return {status:statuses[draft.destination],triageAssignedClinicianId:draft.destination==='clinico'?professional?.id:undefined,triageAssignedClinicianName:draft.destination==='clinico'?professional?.name:undefined,...(specialty?{assessmentRequests:[{specialty,status:'pending',requestedAt:new Date().toISOString(),requestedBy:actor.id,assignedProfessionalId:professional!.id,assignedProfessionalName:professional!.name}]}:{})}
}
