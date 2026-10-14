import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {issueArrivalTicket,sortTickets,callArrivalTicket,forwardArrivalTicket,markTicketAttendance} from './tickets'
import {users} from './data/users'
const reception=users.find(user=>user.role==='recepcao')!
const triage=users.find(user=>user.role==='triagem')!
test('ticket numbers are unique within a category and active numbers survive a day change',()=>{
 const first=issueArrivalTicket([],'comum',new Date('2026-10-14T10:00:00Z'))
 const next=issueArrivalTicket([first],'comum',new Date('2026-10-14T10:01:00Z'));assert.equal(next.number,'C002')
 assert.equal(issueArrivalTicket([first],'prioridade').number,'P001')
 assert.equal(issueArrivalTicket([first],'comum',new Date('2026-10-15T10:00:00Z')).number,'C002')
 assert.equal(issueArrivalTicket([{...first,stage:'concluida'}],'comum',new Date('2026-10-15T10:00:00Z')).number,'C001')
})
test('emergency then priority then common, FIFO within each category',()=>{
 const common=issueArrivalTicket([],'comum',new Date('2026-10-14T10:00:00Z'))
 const priority=issueArrivalTicket([common],'prioridade',new Date('2026-10-14T10:02:00Z'))
 const emergency=issueArrivalTicket([common,priority],'emergencia',new Date('2026-10-14T10:03:00Z'))
 const secondPriority=issueArrivalTicket([common,priority,emergency],'prioridade',new Date('2026-10-14T10:04:00Z'))
 assert.deepEqual(sortTickets([secondPriority,common,emergency,priority]).map(t=>t.id),[emergency.id,priority.id,secondPriority.id,common.id])
})
test('reception and triage call the same linked ticket, without inventing a Manchester classification',()=>{
 const first=issueArrivalTicket([],'emergencia')
 assert.throws(()=>forwardArrivalTicket([first],first.id,'patient-14',reception),/Chame/)
 const called=callArrivalTicket([first],reception,'recepcao')
 const forwarded=forwardArrivalTicket(called.tickets,first.id,'patient-14',reception)
 const nursing=callArrivalTicket(forwarded,triage,'triagem')
 assert.equal(nursing.ticket.id,first.id);assert.equal(nursing.ticket.number,first.number);assert.equal(nursing.ticket.patientId,'patient-14');assert.equal(nursing.ticket.receptionCalledBy,reception.id);assert.equal(nursing.ticket.triageCalledBy,triage.id)
 assert.equal('manchester' in nursing.ticket,false)
 assert.throws(()=>forwardArrivalTicket(forwarded,first.id,'other-patient',reception),/Chame/)
})
test('a claimed ticket cannot be stolen, double-called or linked to two patients',()=>{
 const first=issueArrivalTicket([],'comum');const second=issueArrivalTicket([first],'comum')
 const called=callArrivalTicket([first,second],reception,'recepcao')
 assert.throws(()=>callArrivalTicket(called.tickets,reception,'recepcao',second.id),/Conclua/)
 assert.throws(()=>callArrivalTicket(called.tickets,{...reception,id:'other-user'},'recepcao',first.id),/disponível/)
 assert.equal(callArrivalTicket(called.tickets,reception,'recepcao',first.id).ticket.number,first.number)
})
test('backend permission denials and cross-role calls fail closed',()=>{
 const first=issueArrivalTicket([],'comum')
 assert.throws(()=>callArrivalTicket([first],triage,'recepcao'),/permissão/)
 assert.throws(()=>callArrivalTicket([first],{...reception,permissions:[]},'recepcao'),/permissão/)
 assert.throws(()=>forwardArrivalTicket([first],first.id,'patient-14',triage),/permissão/)
})

test('a no-show frees the current operator and can return with the same number',()=>{
 const first=issueArrivalTicket([],'comum');const called=callArrivalTicket([first],reception,'recepcao')
 const absent=markTicketAttendance(called.tickets,first.id,reception)
 assert.equal(absent[0].stage,'ausente_recepcao');assert.equal(absent[0].calledBy,undefined)
 const returned=markTicketAttendance(absent,first.id,reception,true)
 assert.equal(returned[0].stage,'aguardando_recepcao');assert.equal(returned[0].number,first.number)
 assert.throws(()=>markTicketAttendance(absent,first.id,triage,true),/nesta etapa/)
})
