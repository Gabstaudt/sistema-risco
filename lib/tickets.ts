import type { Patient, User } from './types'
import { hasUserPermission } from './permissions'
export type TicketCategory = 'emergencia' | 'prioridade' | 'comum'
export type TicketStage = 'aguardando_recepcao' | 'chamada_recepcao' | 'aguardando_triagem' | 'chamada_triagem' | 'em_triagem' | 'concluida' | 'ausente_recepcao' | 'ausente_triagem'
export interface ArrivalTicket { id:string; number:string; day:string; sequence:number; category:TicketCategory; stage:TicketStage; issuedAt:string; calledAt?:string; calledBy?:string; receptionCalledBy?:string; triageCalledBy?:string; patientId?:string; forwardedAt?:string }
export const TICKET_CATEGORIES = { emergencia:{label:'Emergência',prefix:'E',rank:0,className:'border-red-300 bg-red-50 text-red-900'},prioridade:{label:'Prioridade',prefix:'P',rank:1,className:'border-amber-300 bg-amber-50 text-amber-900'},comum:{label:'Comum',prefix:'C',rank:2,className:'border-primary/20 bg-primary/5 text-primary'} } as const
export const ticketDay = (date:Date) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Belem',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export function issueArrivalTicket(tickets:ArrivalTicket[],category:TicketCategory,now=new Date()):ArrivalTicket {
 if(!Object.hasOwn(TICKET_CATEGORIES,category))throw new Error('Categoria de senha inválida.')
 const day=ticketDay(now);const sequence=Math.max(0,...tickets.filter(t=>(t.day===day || t.stage!=='concluida') && t.category===category).map(t=>t.sequence))+1
 return {id:crypto.randomUUID(),number:`${TICKET_CATEGORIES[category].prefix}${String(sequence).padStart(3,'0')}`,day,sequence,category,stage:'aguardando_recepcao',issuedAt:now.toISOString()}
}
export function sortTickets(tickets:ArrivalTicket[]) { return [...tickets].sort((a,b)=>TICKET_CATEGORIES[a.category].rank-TICKET_CATEGORIES[b.category].rank || Date.parse(a.issuedAt)-Date.parse(b.issuedAt) || a.sequence-b.sequence) }
export function callArrivalTicket(tickets:ArrivalTicket[],user:User,stage:'recepcao'|'triagem',id?:string):{tickets:ArrivalTicket[];ticket:ArrivalTicket} {
 if(user.role!==stage || !hasUserPermission(user,stage==='recepcao'?'manage_reception_queue':'call_triage_ticket'))throw new Error('Sem permissão para chamar esta fila.')
 const waiting=stage==='recepcao'?'aguardando_recepcao':'aguardando_triagem';const called=stage==='recepcao'?'chamada_recepcao':'chamada_triagem'
 const active=tickets.find(t=>(t.stage===called || (stage==='triagem' && t.stage==='em_triagem')) && t.calledBy===user.id)
 const target=id?tickets.find(t=>t.id===id):active || sortTickets(tickets.filter(t=>t.stage===waiting))[0]
 if(!target)throw new Error('Nenhuma senha aguardando chamada.')
 if(target.stage!==waiting && !(target.stage===called && target.calledBy===user.id))throw new Error('Esta senha não está disponível para chamada.')
 if(active && active.id!==target.id)throw new Error('Conclua a senha atual antes de chamar a próxima.')
 const ticket={...target,stage:called as TicketStage,calledAt:new Date().toISOString(),calledBy:user.id,...(stage==='recepcao'?{receptionCalledBy:user.id}:{triageCalledBy:user.id})}
 return {ticket,tickets:tickets.map(t=>t.id===ticket.id?ticket:t)}
}
export function forwardArrivalTicket(tickets:ArrivalTicket[],id:string,patientId:string,user:User) {
 if(user.role!=='recepcao' || !hasUserPermission(user,'manage_reception_queue'))throw new Error('Sem permissão para encaminhar a senha.')
 const ticket=tickets.find(t=>t.id===id)
 if(!ticket || ticket.stage!=='chamada_recepcao' || ticket.calledBy!==user.id || ticket.patientId)throw new Error('Chame esta senha na recepção antes de encaminhar.')
 if(tickets.some(t=>t.patientId===patientId && t.stage!=='concluida'))throw new Error('O paciente já tem uma senha em atendimento.')
 return tickets.map(t=>t.id===id?{...t,patientId,stage:'aguardando_triagem' as const,forwardedAt:new Date().toISOString(),calledBy:undefined,calledAt:undefined}:t)
}
export function seedArrivalTickets(patients:Patient[]) {
 const tickets:ArrivalTicket[]=[]
 for(const category of ['comum','prioridade','emergencia'] as const)tickets.push(issueArrivalTicket(tickets,category,new Date(Date.now()-15*60000)))
 for(const patient of patients.filter(p=>['aguardando_triagem','em_triagem'].includes(p.status))) {
  const ticket=issueArrivalTicket(tickets,'comum',new Date(patient.dataEntrada))
  tickets.push({...ticket,patientId:patient.id,stage:patient.status==='em_triagem'?'em_triagem':'aguardando_triagem',triageCalledBy:patient.status==='em_triagem'?'user-2':undefined,calledBy:patient.status==='em_triagem'?'user-2':undefined,forwardedAt:patient.dataEntrada})
 }
 return tickets
}

export function markTicketAttendance(tickets: ArrivalTicket[], id: string, user: User, restore = false): ArrivalTicket[] {
  const stage = user.role === 'recepcao' ? 'recepcao' : user.role === 'triagem' ? 'triagem' : undefined
  if (!stage || !hasUserPermission(user, stage === 'recepcao' ? 'manage_reception_queue' : 'call_triage_ticket')) throw new Error('Sem permissão para atualizar esta fila.')
  const ticket = tickets.find(item => item.id === id)
  const absent: TicketStage = stage === 'recepcao' ? 'ausente_recepcao' : 'ausente_triagem'
  const called: TicketStage = stage === 'recepcao' ? 'chamada_recepcao' : 'chamada_triagem'
  if (!ticket || (restore ? ticket.stage !== absent : ticket.stage !== called || ticket.calledBy !== user.id)) throw new Error('Esta senha não pode ser atualizada nesta etapa.')
  return tickets.map(item => item.id === id ? { ...item, stage: restore ? stage === 'recepcao' ? 'aguardando_recepcao' : 'aguardando_triagem' : absent, calledBy: undefined, calledAt: undefined } : item)
}
