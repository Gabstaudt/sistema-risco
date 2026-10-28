import type {Patient} from './types'
import type {ArrivalTicket} from './tickets'
export function receptionBoardColumn(patient:Patient):'triagem'|'branca'{return patient.attendanceRoute==='sem_triagem'||patient.receptionClassification==='branca'?'branca':'triagem'}
export function receptionPendingTickets(tickets:ArrivalTicket[]){return tickets.filter(ticket=>!ticket.patientId&&['aguardando_recepcao','chamada_recepcao','ausente_recepcao'].includes(ticket.stage))}
