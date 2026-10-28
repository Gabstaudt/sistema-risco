import {wardAdmission} from './ward'
import type {Patient,User,PatientStatus} from './types'
import {isDoctor,isPatientAssignedToDoctor} from './medical-profile'
import {hasUserPermission} from './permissions'
import {userSectorId,type HospitalSector} from './sectors'
export interface ConsultationRecord {cboCode?:string;occupationName?:string;unitName?:string;sectorId?:string;sectorName?:string;professionalCns?:string;id:string;patientId:string;patientName:string;prontuario:string;encounterEntryAt:string;physicianId:string;physicianName:string;specialty:User['role'];startedAt:string;endedAt?:string;anamnesis:string;outcome:'em_atendimento'|'finalizada'|'encaminhada'|'cancelada';destination?:string}
export interface TransferDraft {sectorId:string;professionalId:string;reason:string}
export const DOCTOR_WORK_PERMISSIONS=['manage_own_workplace','medical_consultation','transfer_patient','issue_admission_documents','view_medical_reports','print_triage_sheet']
export function assertMedicalCare(patient:Patient,user:User,permission='medical_consultation'){
 if(!isDoctor(user)||!hasUserPermission(user,permission)||!isPatientAssignedToDoctor(patient,user))throw new Error('Paciente não direcionado para este médico ou acesso não autorizado.')
 if(patient.attendanceClosure||['concluido','liberado','contraindicado'].includes(patient.status))throw new Error('Este atendimento foi encerrado.')
}
export function consultation(patient:Patient,user:User,action:'start'|'save'|'finish',anamnesis?:string,now=new Date()):ConsultationRecord[]{
 assertMedicalCare(patient,user)
 const records=patient.medicalConsultations||[]
 const current=records.find(record=>record.encounterEntryAt===patient.dataEntrada&&record.physicianId===user.id&&!record.endedAt)
 if(!current&&action!=='start')throw new Error('Inicie a consulta antes de registrar a anamnese.')
 if(current&&action==='start')return records
 if(action==='finish'&&!anamnesis?.trim()&&!current?.anamnesis.trim())throw new Error('Registre a anamnese antes de finalizar a consulta.')
 const record:ConsultationRecord=current?{...current,anamnesis:anamnesis??current.anamnesis,...(action==='finish'?{endedAt:now.toISOString(),outcome:'finalizada' as const}:{})}:{id:crypto.randomUUID(),patientId:patient.id,patientName:patient.nomeCompleto,prontuario:patient.prontuario,encounterEntryAt:patient.dataEntrada,physicianId:user.id,physicianName:user.name,cboCode:user.cboCode||'',occupationName:user.occupationName||'',unitName:user.unitName||'',sectorId:user.sectorId||'',sectorName:user.department||'',professionalCns:user.professionalCns||'',specialty:user.role,startedAt:now.toISOString(),anamnesis:'',outcome:'em_atendimento'}
 return [...records.filter(item=>item.id!==record.id),record]
}
export function medicalTransfer(patient:Patient,user:User,draft:TransferDraft,users:User[],sectors:HospitalSector[]):Partial<Patient>{
 assertMedicalCare(patient,user,'transfer_patient')
 if(!draft.reason.trim())throw new Error('Informe o motivo do encaminhamento.')
 const sector=sectors.find(sector=>sector.id===draft.sectorId&&sector.active)
 if(!sector||!['clinico','cardiologista','anestesista','cirurgiao','laboratorio','triagem','enfermaria'].includes(sector.role))throw new Error('Selecione um setor ativo de atendimento.')
 if(sector.role==='enfermaria'){const updates=wardAdmission(patient,user,sector,draft.reason);const at=new Date().toISOString();return {...updates,medicalConsultations:patient.medicalConsultations?.map(record=>record.physicianId===user.id&&!record.endedAt?{...record,endedAt:at,outcome:'encaminhada' as const,destination:sector.name}:record),medicalTransfers:[...(patient.medicalTransfers||[]),{at,from:user.id,sectorId:sector.id,sectorName:sector.name,reason:draft.reason.trim(),clinicalSnapshot:{clinicalEvaluation:patient.clinicalEvaluation,cardiologyAssessment:patient.cardiologyAssessment,anesthesiaAssessment:patient.anesthesiaAssessment,surgicalRiskAssessment:patient.surgicalRiskAssessment}}]}}
 const permission=({clinico:'clinical_evaluation',cardiologista:'classify_cardiac_risk',anestesista:'classify_asa',cirurgiao:'classify_risk',laboratorio:'update_exam_status',triagem:'register_vital_signs'} as Record<string,string>)[sector.role]
 const target=users.find(target=>target.id===draft.professionalId&&target.id!==user.id&&target.active&&target.workplaceAvailability!=='indisponivel'&&target.role===sector.role&&userSectorId(target)===sector.id&&hasUserPermission(target,permission))
 if(!['laboratorio','triagem','enfermaria'].includes(sector.role)&&!target)throw new Error('Selecione outro médico ativo do setor.')
 const now=new Date().toISOString()
 const specialty=['cardiologista','anestesista','cirurgiao'].includes(sector.role)?sector.role as 'cardiologista'|'anestesista'|'cirurgiao':undefined
 const statuses:Partial<Record<User['role'],PatientStatus>>={clinico:'aguardando_clinico',cardiologista:'aguardando_cardiologista',anestesista:'aguardando_anestesista',cirurgiao:'aguardando_cirurgiao',laboratorio:'aguardando_laboratorio',triagem:'aguardando_triagem'}
 return {status:statuses[sector.role],triageAssignedClinicianId:sector.role==='clinico'?target?.id:undefined,triageAssignedClinicianName:sector.role==='clinico'?target?.name:undefined,clinicalAssignedCardiologistId:specialty==='cardiologista'?target?.id:undefined,clinicalAssignedCardiologistName:specialty==='cardiologista'?target?.name:undefined,clinicalAssignedSurgeonId:specialty==='cirurgiao'?target?.id:undefined,clinicalAssignedSurgeonName:specialty==='cirurgiao'?target?.name:undefined,cardiologyAssignedAnesthesiologistId:specialty==='anestesista'?target?.id:undefined,cardiologyAssignedAnesthesiologistName:specialty==='anestesista'?target?.name:undefined,assessmentRequests:specialty?[{specialty,status:'pending',requestedAt:now,requestedBy:user.id,assignedProfessionalId:target!.id,assignedProfessionalName:target!.name}]:[],medicalConsultations:(patient.medicalConsultations||[]).map(record=>record.physicianId===user.id&&record.encounterEntryAt===patient.dataEntrada&&!record.endedAt?{...record,endedAt:now,outcome:'encaminhada',destination:sector.name+(target?' · '+target.name:'')}:record),medicalTransfers:[...(patient.medicalTransfers||[]),{at:now,from:user.id,to:target?.id,sectorId:sector.id,sectorName:sector.name,reason:draft.reason.trim(),clinicalSnapshot:{clinicalEvaluation:patient.clinicalEvaluation,cardiologyAssessment:patient.cardiologyAssessment,anesthesiaAssessment:patient.anesthesiaAssessment,surgicalRiskAssessment:patient.surgicalRiskAssessment}}],...(sector.role==='clinico'?{clinicalEvaluation:undefined,avaliacaoClinica:undefined}:{}),...(specialty==='cardiologista'?{cardiologyAssessment:undefined}:{}),...(specialty==='anestesista'?{anesthesiaAssessment:undefined}:{}),...(specialty==='cirurgiao'?{surgicalRiskAssessment:undefined,avaliacaoCirurgica:undefined}:{})}
}
