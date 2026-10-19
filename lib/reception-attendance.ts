import type { AttendanceRoute,Patient,User } from './types'
import type { ArrivalTicket } from './tickets'
import { hasUserPermission } from './permissions'
export const CLOSED_ATTENDANCES=['concluido','liberado','contraindicado']
export interface IntakeDraft {complaint:string;notes:string;route:AttendanceRoute;doctorId:string}
export function intakeUpdates(draft:IntakeDraft,professionals:User[]):Partial<Patient>{
 if(!draft.complaint.trim())throw new Error('Informe o motivo do atendimento.')
 if(!['com_triagem','sem_triagem'].includes(draft.route))throw new Error('Selecione o encaminhamento.')
 const doctor=professionals.find(user=>user.id===draft.doctorId&&user.role==='clinico'&&user.active&&hasUserPermission(user,'clinical_evaluation'))
 if(draft.route==='sem_triagem'&&!doctor)throw new Error('Selecione o clínico responsável pelo atendimento sem triagem.')
 return {queixaPrincipal:draft.complaint.trim(),descricaoInicial:draft.notes.trim(),attendanceRoute:draft.route,receptionClassification:draft.route==='sem_triagem'?'branca':undefined,status:draft.route==='sem_triagem'?'aguardando_clinico':'aguardando_triagem',triageAssignedClinicianId:draft.route==='sem_triagem'?doctor!.id:undefined,triageAssignedClinicianName:draft.route==='sem_triagem'?doctor!.name:undefined}
}
export function updateReceptionAttendance(patient:Patient,draft:IntakeDraft,actor:User,professionals:User[],tickets:ArrivalTicket[]):Partial<Patient>{
 if(!hasUserPermission(actor,'manage_attendance'))throw new Error('Sem permissão para atualizar atendimentos.')
 if(CLOSED_ATTENDANCES.includes(patient.status)||patient.attendanceClosure)throw new Error('O atendimento já foi encerrado.')
 const route=patient.attendanceRoute||'com_triagem'
 const reroute=route!==draft.route||(draft.route==='sem_triagem'&&draft.doctorId!==patient.triageAssignedClinicianId)
 if(reroute&&(Boolean(patient.triageData?.completedAt)||Boolean(patient.clinicalEvaluation)||Boolean(patient.avaliacaoClinica)||!['aguardando_triagem','aguardando_clinico'].includes(patient.status)||tickets.some(ticket=>ticket.patientId===patient.id&&!['concluida','aguardando_triagem','aguardando_clinico'].includes(ticket.stage))))throw new Error('O encaminhamento só pode ser alterado antes da chamada/início do atendimento.')
 if(!draft.complaint.trim())throw new Error('Informe o motivo do atendimento.')
 return reroute?intakeUpdates(draft,professionals):{queixaPrincipal:draft.complaint.trim(),descricaoInicial:draft.notes.trim()}
}
export function closeReceptionAttendance(patient:Patient,actor:User,kind:'baixa'|'cancelamento',reason:string):Partial<Patient>{
 if(!hasUserPermission(actor,'manage_attendance'))throw new Error('Sem permissão para encerrar atendimentos.')
 if(!['baixa','cancelamento'].includes(kind))throw new Error('Selecione o tipo de encerramento.')
 if(CLOSED_ATTENDANCES.includes(patient.status)||patient.attendanceClosure)throw new Error('O atendimento já foi encerrado.')
 if(!reason.trim())throw new Error('Informe a justificativa do encerramento.')
 const at=new Date().toISOString()
 return {status:'concluido',dischargeAt:at,attendanceClosure:{kind,reason:reason.trim(),at,by:actor.id}}
}
