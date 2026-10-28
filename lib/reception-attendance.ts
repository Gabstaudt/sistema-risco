import {defaultSectors,userSectorId,type HospitalSector} from './sectors'
import {ticketDay,type ArrivalTicket} from './tickets'
import type { AttendanceRoute,Patient,User,PatientStatus } from './types'
import { hasUserPermission } from './permissions'
export const CLOSED_ATTENDANCES=['concluido','liberado','contraindicado']
export interface IntakeDraft {complaint:string;notes:string;route:AttendanceRoute;doctorId:string;sectorId?:string}
export const RECEPTION_CARE_ROLES=['triagem','clinico','cardiologista','anestesista','cirurgiao','laboratorio','enfermaria']
export function intakeSector(draft:IntakeDraft,sectors:HospitalSector[]=defaultSectors()):HospitalSector {
 const sector=draft.sectorId?sectors.find(sector=>sector.id===draft.sectorId):sectors.find(sector=>sector.active&&sector.role===(draft.route==='com_triagem'?'triagem':'clinico'))
 if(!sector?.active||!RECEPTION_CARE_ROLES.includes(sector.role))throw new Error('Selecione um setor assistencial ativo.')
 if((draft.route==='com_triagem')!==(sector.role==='triagem'))throw new Error('Confira o setor e o fluxo com ou sem triagem.')
 return sector
}
export function intakeProfessionals(sector:HospitalSector,professionals:User[]) {
 const permission:Record<string,string>={clinico:'clinical_evaluation',cardiologista:'classify_cardiac_risk',anestesista:'classify_asa',cirurgiao:'classify_risk',triagem:'register_vital_signs',laboratorio:'update_exam_status',enfermaria:'view_ward_care'}
 return professionals.filter(user=>user.active&&user.role===sector.role&&userSectorId(user)===sector.id&&hasUserPermission(user,permission[sector.role]))
}
export function intakeUpdates(draft:IntakeDraft,professionals:User[],sectors:HospitalSector[]=defaultSectors()):Partial<Patient>{
 if(!draft.complaint.trim())throw new Error('Informe o motivo do atendimento.')
 if(!['com_triagem','sem_triagem'].includes(draft.route))throw new Error('Selecione o encaminhamento.')
 const sector=intakeSector(draft,sectors)
 const doctor=intakeProfessionals(sector,professionals).find(user=>user.id===draft.doctorId)
 const medical=['clinico','cardiologista','anestesista','cirurgiao'].includes(sector.role)
 if(draft.route==='sem_triagem'&&medical&&!doctor)throw new Error(sector.role==='clinico'?'Selecione o clínico responsável pelo atendimento sem triagem.':'Selecione um médico ativo do setor de destino.')
 if(draft.doctorId&&draft.route==='sem_triagem'&&!doctor)throw new Error('Profissional inválido para o setor de destino.')
 const statuses:Partial<Record<User['role'],PatientStatus>>={triagem:'aguardando_triagem',clinico:'aguardando_clinico',cardiologista:'aguardando_cardiologista',anestesista:'aguardando_anestesista',cirurgiao:'aguardando_cirurgiao',laboratorio:'aguardando_laboratorio',enfermaria:'aguardando_enfermaria'}
 return {queixaPrincipal:draft.complaint.trim(),descricaoInicial:draft.notes.trim(),attendanceRoute:draft.route,receptionClassification:draft.route==='sem_triagem'?'branca':undefined,status:statuses[sector.role],receptionSectorId:sector.id,receptionSectorName:sector.name,receptionProfessionalId:draft.route==='sem_triagem'?doctor?.id:undefined,receptionProfessionalName:draft.route==='sem_triagem'?doctor?.name:undefined,triageAssignedClinicianId:sector.role==='clinico'?doctor?.id:undefined,triageAssignedClinicianName:sector.role==='clinico'?doctor?.name:undefined,clinicalAssignedCardiologistId:sector.role==='cardiologista'?doctor?.id:undefined,clinicalAssignedCardiologistName:sector.role==='cardiologista'?doctor?.name:undefined,cardiologyAssignedAnesthesiologistId:sector.role==='anestesista'?doctor?.id:undefined,cardiologyAssignedAnesthesiologistName:sector.role==='anestesista'?doctor?.name:undefined,clinicalAssignedSurgeonId:sector.role==='cirurgiao'?doctor?.id:undefined,clinicalAssignedSurgeonName:sector.role==='cirurgiao'?doctor?.name:undefined}
}
export function routeReceptionTicket(ticket:ArrivalTicket,updates:Partial<Patient>):ArrivalTicket {
 const stage=updates.attendanceRoute==='com_triagem'?'aguardando_triagem':updates.status==='aguardando_clinico'?'aguardando_clinico':'aguardando_setor'
 return {...ticket,stage,sectorId:updates.receptionSectorId,sectorName:updates.receptionSectorName,professionalAssignedTo:updates.receptionProfessionalId,clinicalAssignedTo:stage==='aguardando_clinico'?updates.triageAssignedClinicianId:undefined,clinicalQueuedAt:stage==='aguardando_clinico'?new Date().toISOString():undefined,forwardedAt:ticket.forwardedAt||new Date().toISOString(),calledBy:undefined,calledAt:undefined,destination:updates.receptionSectorName}
}
export function nextPatientRecordNumber(patients:Patient[],now=new Date()):string {
 const prefix=`PRONT-${ticketDay(now).slice(0,4)}-`
 const maximum=Math.max(0,...patients.map(patient=>patient.prontuario?.startsWith(prefix)&&/^\d+$/.test(patient.prontuario.slice(prefix.length))?Number(patient.prontuario.slice(prefix.length)):0))
 return prefix+String(maximum+1).padStart(6,'0')
}
export function updateReceptionAttendance(patient:Patient,draft:IntakeDraft,actor:User,professionals:User[],tickets:ArrivalTicket[],sectors:HospitalSector[]=defaultSectors()):Partial<Patient>{
 if(!hasUserPermission(actor,'manage_attendance'))throw new Error('Sem permissão para atualizar atendimentos.')
 if(CLOSED_ATTENDANCES.includes(patient.status)||patient.attendanceClosure)throw new Error('O atendimento já foi encerrado.')
 const route=patient.attendanceRoute||'com_triagem'
 const reroute=route!==draft.route||(draft.route==='sem_triagem'&&draft.doctorId!==(patient.receptionProfessionalId||patient.triageAssignedClinicianId||''))||Boolean(draft.sectorId&&draft.sectorId!==(patient.receptionSectorId||`sector-${route==='com_triagem'?'triagem':'clinico'}`))
 const waiting=['aguardando_triagem','aguardando_clinico','aguardando_cardiologista','aguardando_anestesista','aguardando_cirurgiao','aguardando_laboratorio','aguardando_enfermaria']
 if(reroute&&(Boolean(patient.triageData?.completedAt)||Boolean(patient.clinicalEvaluation)||Boolean(patient.avaliacaoClinica)||Boolean(patient.medicalConsultations?.some(record=>record.encounterEntryAt===patient.dataEntrada))||Boolean(patient.wardStays?.some(stay=>stay.encounterEntryAt===patient.dataEntrada))||!waiting.includes(patient.status)||tickets.some(ticket=>ticket.patientId===patient.id&&!['concluida','aguardando_triagem','aguardando_clinico','aguardando_setor'].includes(ticket.stage))))throw new Error('O encaminhamento só pode ser alterado antes da chamada/início do atendimento.')
 if(!draft.complaint.trim())throw new Error('Informe o motivo do atendimento.')
 return reroute?intakeUpdates(draft,professionals,sectors):{queixaPrincipal:draft.complaint.trim(),descricaoInicial:draft.notes.trim()}
}
export function closeReceptionAttendance(patient:Patient,actor:User,kind:'baixa'|'cancelamento',reason:string):Partial<Patient>{
 if(!hasUserPermission(actor,'manage_attendance')&&!(actor.role==='triagem'&&hasUserPermission(actor,'cancel_triage_attendance')&&['aguardando_triagem'].includes(patient.status)))throw new Error('Sem permissão para encerrar este atendimento na triagem.')
 if(!['baixa','cancelamento'].includes(kind))throw new Error('Selecione o tipo de encerramento.')
 if(CLOSED_ATTENDANCES.includes(patient.status)||patient.attendanceClosure)throw new Error('O atendimento já foi encerrado.')
 if(!reason.trim())throw new Error('Informe a justificativa do encerramento.')
 const at=new Date().toISOString()
 return {status:'concluido',dischargeAt:at,attendanceClosure:{kind,reason:reason.trim(),at,by:actor.id}}
}
