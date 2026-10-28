import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {patients} from './data/patients'
import {defaultSectors} from './sectors'
import {intakeUpdates,routeReceptionTicket,nextPatientRecordNumber,updateReceptionAttendance} from './reception-attendance'
import {issueArrivalTicket,callArrivalTicket,forwardArrivalTicket} from './tickets'
import {receptionBoardColumn,receptionPendingTickets} from './reception-board'
import {isPatientAssignedToDoctor} from './medical-profile'
import {wardAdmission} from './ward'
const reception=users.find(user=>user.role==='recepcao')!
const doctor=users.find(user=>user.role==='clinico')!
const cardio=users.find(user=>user.role==='cardiologista')!
const nurse=users.find(user=>user.role==='enfermaria')!
const draft={complaint:'Queixa informada',notes:'Observações',route:'com_triagem' as const,doctorId:'',sectorId:'sector-triagem'}
test('reception forwards the exact arrival ticket to triage and triage calls that number without reissuing',()=>{
 const issued=issueArrivalTicket([],'prioridade');const called=callArrivalTicket([issued],reception,'recepcao').ticket
 const updates=intakeUpdates(draft,users);const forwarded=forwardArrivalTicket([called],called.id,'patient',reception)[0];const target=routeReceptionTicket(forwarded,updates)
 assert.equal(target.id,issued.id);assert.equal(target.number,issued.number);assert.equal(target.issuedAt,issued.issuedAt);assert.equal(target.stage,'aguardando_triagem');assert.equal(target.sectorId,'sector-triagem')
 const triaged=callArrivalTicket([target],users.find(user=>user.role==='triagem')!,'triagem').ticket;assert.equal(triaged.number,issued.number);assert.equal(triaged.id,issued.id)
})
test('custom active sectors require a professional from that sector and assign the actual medical queue',()=>{
 const sectors=[...defaultSectors(),{id:'sector-ambulatory',name:'Ambulatório municipal',role:'clinico' as const,active:true}];const assigned={...doctor,id:'doctor-ambulatory',sectorId:'sector-ambulatory'}
 const updates=intakeUpdates({...draft,route:'sem_triagem',sectorId:assigned.sectorId,doctorId:assigned.id},[...users,assigned],sectors)
 assert.equal(updates.status,'aguardando_clinico');assert.equal(updates.receptionClassification,'branca');assert.equal(updates.receptionSectorName,'Ambulatório municipal');assert.equal(updates.triageRiskClassification,undefined)
 assert.ok(isPatientAssignedToDoctor({...patients[0],...updates},assigned));assert.ok(!isPatientAssignedToDoctor({...patients[0],...updates},doctor))
 assert.throws(()=>intakeUpdates({...draft,route:'sem_triagem',sectorId:assigned.sectorId,doctorId:doctor.id},users,sectors),/clínico/)
 assert.throws(()=>intakeUpdates({...draft,route:'sem_triagem',sectorId:'sector-admin'},users),/assistencial/)
 assert.throws(()=>intakeUpdates({...draft,sectorId:'sector-ambulatory'},users,sectors),/fluxo/)
})
test('direct specialty routing retains the ticket, assigns only the chosen specialist and does not invent a surgical-risk request',()=>{
 const updates=intakeUpdates({...draft,route:'sem_triagem',sectorId:'sector-cardiologista',doctorId:cardio.id},users)
 assert.equal(updates.status,'aguardando_cardiologista');assert.equal(updates.clinicalAssignedCardiologistId,cardio.id);assert.equal(updates.surgicalRiskRequest,undefined);assert.equal(updates.assessmentRequests,undefined)
 const ticket=issueArrivalTicket([],'comum');const routed=routeReceptionTicket({...ticket,patientId:'patient'},updates);assert.equal(routed.stage,'aguardando_setor');assert.equal(routed.professionalAssignedTo,cardio.id);assert.equal(routed.id,ticket.id)
 assert.ok(isPatientAssignedToDoctor({...patients[0],assessmentRequests:undefined,...updates},cardio));assert.ok(!isPatientAssignedToDoctor({...patients[0],assessmentRequests:undefined,...updates},{...cardio,id:'another'}))
})
test('reception can queue for laboratory or ward without fabricating an exam or ward admission',()=>{
 const lab=intakeUpdates({...draft,route:'sem_triagem',sectorId:'sector-laboratorio'},users);assert.equal(lab.status,'aguardando_laboratorio');assert.equal(lab.examesSolicitados,undefined)
 const ward=intakeUpdates({...draft,route:'sem_triagem',sectorId:'sector-enfermaria'},users);assert.equal(ward.status,'aguardando_enfermaria');assert.equal(ward.wardStays,undefined)
 const patient={...patients[0],...ward,attendanceClosure:undefined,wardStays:[],medicalConsultations:[]};assert.doesNotThrow(()=>wardAdmission(patient,nurse,defaultSectors().find(sector=>sector.role==='enfermaria')!,'Recebido'))
 assert.throws(()=>wardAdmission({...patient,receptionSectorId:'another-ward'},nurse,defaultSectors().find(sector=>sector.role==='enfermaria')!,'Recebido'),/outro setor/)
})
test('record numbers use the Belem calendar year and do not collide with sparse or legacy numbering',()=>{
 const source=[{...patients[0],prontuario:'PRONT-2026-100'},{...patients[0],prontuario:'PRONT-2026-000009'}];assert.equal(nextPatientRecordNumber(source,new Date('2026-10-20T12:00:00Z')),'PRONT-2026-000101');assert.equal(nextPatientRecordNumber([],new Date('2027-01-01T01:00:00Z')),'PRONT-2026-000001')
})
test('board columns are disjoint and unforwarded reception tickets are not counted as white-classified patients',()=>{
 const normal={...patients[0],attendanceRoute:'com_triagem' as const,receptionClassification:undefined};const white={...normal,id:'white',attendanceRoute:'sem_triagem' as const,receptionClassification:'branca' as const};assert.equal(receptionBoardColumn(normal),'triagem');assert.equal(receptionBoardColumn(white),'branca')
 const arrival=issueArrivalTicket([],'comum');assert.equal(receptionPendingTickets([arrival,{...arrival,id:'forwarded',patientId:normal.id,stage:'aguardando_triagem'}]).length,1)
})
test('rerouting is rejected after a consultation or ward care has started',()=>{
 const patient={...patients[0],status:'aguardando_clinico' as const,attendanceClosure:undefined,attendanceRoute:'sem_triagem' as const,triageData:undefined,clinicalEvaluation:undefined,avaliacaoClinica:undefined,wardStays:[],medicalConsultations:[{id:'started',encounterEntryAt:patients[0].dataEntrada,patientId:patients[0].id,patientName:patients[0].nomeCompleto,prontuario:patients[0].prontuario,physicianId:doctor.id,physicianName:doctor.name,specialty:'clinico' as const,startedAt:new Date().toISOString(),anamnesis:'',outcome:'em_atendimento' as const}]};assert.throws(()=>updateReceptionAttendance(patient as import('./types').Patient,draft,reception,users,[]),/antes da chamada/)
})
