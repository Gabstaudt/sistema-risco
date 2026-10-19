import type { Patient, User } from './types'
import { hasUserPermission } from './permissions'
export type TicketCategory = 'emergencia' | 'prioridade' | 'comum'
export type TicketCallStage = 'recepcao' | 'triagem' | 'clinico'
export type TicketStage = 'aguardando_recepcao' | 'chamada_recepcao' | 'aguardando_triagem' | 'chamada_triagem' | 'em_triagem' | 'aguardando_clinico' | 'chamada_clinico' | 'em_clinico' | 'concluida' | 'ausente_recepcao' | 'ausente_triagem' | 'ausente_clinico'
export interface ArrivalTicket { id:string; number:string; day:string; sequence:number; category:TicketCategory; stage:TicketStage; issuedAt:string; calledAt?:string; calledBy?:string; receptionCalledBy?:string; triageCalledBy?:string; clinicalCalledBy?:string; clinicalAssignedTo?:string; clinicalQueuedAt?:string; destination?:string; patientId?:string; forwardedAt?:string }
export const TICKET_CATEGORIES = { emergencia:{label:'Emergência',prefix:'E',rank:0,className:'border-red-300 bg-red-50 text-red-900'},prioridade:{label:'Prioridade',prefix:'P',rank:1,className:'border-amber-300 bg-amber-50 text-amber-900'},comum:{label:'Comum',prefix:'C',rank:2,className:'border-primary/20 bg-primary/5 text-primary'} } as const
export const ticketDay = (date:Date) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Belem',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export function issueArrivalTicket(tickets:ArrivalTicket[],category:TicketCategory,now=new Date()):ArrivalTicket {
 if(!Object.hasOwn(TICKET_CATEGORIES,category))throw new Error('Categoria de senha inválida.')
 const day=ticketDay(now);const sequence=Math.max(0,...tickets.filter(t=>(t.day===day || t.stage!=='concluida') && t.category===category).map(t=>t.sequence))+1
 return {id:crypto.randomUUID(),number:`${TICKET_CATEGORIES[category].prefix}${String(sequence).padStart(3,'0')}`,day,sequence,category,stage:'aguardando_recepcao',issuedAt:now.toISOString()}
}
export function sortTickets(tickets:ArrivalTicket[],stage:TicketCallStage='recepcao') {
 return [...tickets].sort((a,b)=>(stage==='recepcao'?TICKET_CATEGORIES[a.category].rank-TICKET_CATEGORIES[b.category].rank:0) || Date.parse(a.issuedAt)-Date.parse(b.issuedAt) || a.sequence-b.sequence)
}
const permissionFor = (stage:TicketCallStage) => stage==='recepcao'?'manage_reception_queue':stage==='triagem'?'call_triage_ticket':'clinical_evaluation'
export function callArrivalTicket(tickets:ArrivalTicket[],user:User,stage:TicketCallStage,id?:string):{tickets:ArrivalTicket[];ticket:ArrivalTicket} {
 if(user.role!==stage || !hasUserPermission(user,permissionFor(stage)))throw new Error('Sem permissão para chamar esta fila.')
 const waiting=`aguardando_${stage}` as TicketStage;const called=`chamada_${stage}` as TicketStage
 const active=tickets.find(t=>(t.stage===called || t.stage===`em_${stage}`) && t.calledBy===user.id)
 const available=tickets.filter(t=>t.stage===waiting && (stage!=='clinico'||t.clinicalAssignedTo===user.id))
 const target=id?tickets.find(t=>t.id===id):active || sortTickets(available,stage)[0]
 if(!target)throw new Error('Nenhuma senha aguardando chamada.')
 if(stage==='clinico'&&target.clinicalAssignedTo!==user.id)throw new Error('Paciente não direcionado para este médico.')
 if(target.stage!==waiting && !(target.stage===called && target.calledBy===user.id))throw new Error('Esta senha não está disponível para chamada.')
 if(active && active.id!==target.id && active.stage===`em_${stage}`)throw new Error('Conclua o atendimento atual antes de chamar outra senha.')
 const ticket={...target,stage:called,calledAt:new Date().toISOString(),calledBy:user.id,destination:user.consultationRoom,...(stage==='recepcao'?{receptionCalledBy:user.id}:stage==='triagem'?{triageCalledBy:user.id}:{clinicalCalledBy:user.id})}
 return {ticket,tickets:tickets.map(t=>t.id===ticket.id?ticket:active&&t.id===active.id?{...t,stage:waiting,calledBy:undefined,calledAt:undefined,destination:undefined}:t)}
}
export function forwardArrivalTicket(tickets:ArrivalTicket[],id:string,patientId:string,user:User) {
 if(user.role!=='recepcao' || !hasUserPermission(user,'manage_reception_queue'))throw new Error('Sem permissão para encaminhar a senha.')
 const ticket=tickets.find(t=>t.id===id)
 if(!ticket || ticket.stage!=='chamada_recepcao' || ticket.calledBy!==user.id || ticket.patientId)throw new Error('Chame esta senha na recepção antes de encaminhar.')
 if(tickets.some(t=>t.patientId===patientId && t.stage!=='concluida'))throw new Error('O paciente já tem uma senha em atendimento.')
 return tickets.map(t=>t.id===id?{...t,patientId,stage:'aguardando_triagem' as const,forwardedAt:new Date().toISOString(),calledBy:undefined,calledAt:undefined}:t)
}
/** Migrate only missing clinical queue entries; preserve the arrival number and existing claims. */
export function ensureClinicalTickets(tickets:ArrivalTicket[],patients:Patient[]) {
 const next=[...tickets]
 for(const patient of patients.filter(p=>['aguardando_clinico','aguardando_avaliacao','exames_concluidos','em_avaliacao_clinica'].includes(p.status)&&p.triageAssignedClinicianId)) {
  const existing=next.find(t=>t.patientId===patient.id&&t.stage!=='concluida')
  if(existing){
   if(['aguardando_clinico','chamada_clinico','em_clinico','ausente_clinico'].includes(existing.stage) && existing.clinicalAssignedTo!==patient.triageAssignedClinicianId){const index=next.findIndex(t=>t.id===existing.id);next[index]={...existing,clinicalAssignedTo:patient.triageAssignedClinicianId,stage:'aguardando_clinico',calledBy:undefined,calledAt:undefined}}
   continue
  }
  const previous=[...next].reverse().find(t=>t.patientId===patient.id)
  const issued=previous||issueArrivalTicket(next,'comum',new Date(patient.dataEntrada))
  const ticket={...issued,id:previous?.id||issued.id,patientId:patient.id,stage:'aguardando_clinico' as const,clinicalAssignedTo:patient.triageAssignedClinicianId,clinicalQueuedAt:patient.status==='exames_concluidos'?patient.updatedAt||patient.ultimaAtualizacao:patient.triageData?.completedAt||patient.dataEntrada,calledBy:undefined,calledAt:undefined}
  const index=next.findIndex(t=>t.id===ticket.id);if(index>=0)next[index]=ticket;else next.push(ticket)
 }
 return next
}
export function seedArrivalTickets(patients:Patient[]) {
 const tickets:ArrivalTicket[]=[]
 for(const category of ['comum','prioridade','emergencia'] as const)tickets.push(issueArrivalTicket(tickets,category,new Date(Date.now()-15*60000)))
 for(const patient of patients.filter(p=>['aguardando_triagem','em_triagem'].includes(p.status))) {
  const ticket=issueArrivalTicket(tickets,'comum',new Date(patient.dataEntrada))
  tickets.push({...ticket,patientId:patient.id,stage:patient.status==='em_triagem'?'em_triagem':'aguardando_triagem',triageCalledBy:patient.status==='em_triagem'?'user-2':undefined,calledBy:patient.status==='em_triagem'?'user-2':undefined,forwardedAt:patient.dataEntrada})
 }
 return ensureClinicalTickets(tickets,patients)
}
export function markTicketAttendance(tickets:ArrivalTicket[],id:string,user:User,restore=false):ArrivalTicket[] {
 const stage:TicketCallStage|undefined=['recepcao','triagem','clinico'].includes(user.role)?user.role as TicketCallStage:undefined
 if(!stage||!hasUserPermission(user,permissionFor(stage)))throw new Error('Sem permissão para atualizar esta fila.')
 const ticket=tickets.find(t=>t.id===id);const absent=`ausente_${stage}` as TicketStage;const called=`chamada_${stage}` as TicketStage
 if(!ticket || (stage==='clinico'&&ticket.clinicalAssignedTo!==user.id) || (restore?ticket.stage!==absent:ticket.stage!==called||ticket.calledBy!==user.id))throw new Error('Esta senha não pode ser atualizada nesta etapa.')
 return tickets.map(t=>t.id===id?{...t,stage:restore?`aguardando_${stage}` as TicketStage:absent,calledBy:undefined,calledAt:undefined,destination:undefined}:t)
}
