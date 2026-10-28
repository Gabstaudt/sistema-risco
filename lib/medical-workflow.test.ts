import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { users } from './data/users'
import { patients } from './data/patients'
import { isPatientAssignedToDoctor, normalizeUserProfile } from './medical-profile'
import { issueMedicalDocument } from './medical-documents'
import { projectPatientForUser, hasUserPermission } from './permissions'
import { issueArrivalTicket, callArrivalTicket, ensureClinicalTickets, sortTickets } from './tickets'
import { applyExamOperation } from './lab-operations'
import type { ExamRequest, User } from './types'
const doctor = users.find(user=>user.role==='clinico')!
const nurse = users.find(user=>user.role==='triagem')!
const lab = users.find(user=>user.role==='laboratorio')!
const assigned = {...patients[2],triageAssignedClinicianId:doctor.id}
const file = (id:string,type='image/png') => ({id,type,name:`${id}.png`,size:100,uploadedAt:new Date().toISOString(),uploadedBy:lab.id})
test('triage calls FIFO regardless of ticket category, with an explicit exception and original number',()=>{
 const early={...issueArrivalTicket([],'comum',new Date('2026-01-01T08:00:00Z')),stage:'aguardando_triagem' as const}
 const later={...issueArrivalTicket([early],'emergencia',new Date('2026-01-01T09:00:00Z')),stage:'aguardando_triagem' as const}
 assert.equal(sortTickets([later,early],'triagem')[0].id,early.id)
 assert.equal(callArrivalTicket([later,early],nurse,'triagem').ticket.id,early.id)
 assert.equal(callArrivalTicket([later,early],nurse,'triagem',later.id).ticket.number,later.number)
})
test('clinical calls are limited to the assigned physician, and reassignment releases an old claim',()=>{
 const queue=ensureClinicalTickets([],[{...assigned,status:'aguardando_clinico'}])
 const called=callArrivalTicket(queue,doctor,'clinico')
 assert.equal(called.ticket.patientId,assigned.id)
 assert.throws(()=>callArrivalTicket(queue,{...doctor,id:'other-doctor'},'clinico',queue[0].id),/direcionado/)
 const reassigned=ensureClinicalTickets(called.tickets,[{...assigned,status:'aguardando_clinico',triageAssignedClinicianId:'other-doctor'}])
 assert.equal(reassigned[0].clinicalAssignedTo,'other-doctor');assert.equal(reassigned[0].calledBy,undefined)
 const active={...called.ticket,stage:'em_clinico' as const};const other={...active,id:'other',stage:'aguardando_clinico' as const}
 assert.throws(()=>callArrivalTicket([active,other],doctor,'clinico',other.id),/Conclua/)
})
test('patient scopes deny other doctors even with view_all_data, and explicit specialist assignment takes precedence',()=>{
 assert.ok(projectPatientForUser(assigned,doctor))
 assert.equal(projectPatientForUser(assigned,{...doctor,id:'other-doctor'}),undefined)
 assert.equal(projectPatientForUser(assigned,{...doctor,id:'other-doctor',permissions:['view_all_data','view_patient_basic']}),undefined)
 const cardio=users.find(user=>user.role==='cardiologista')!
 const redirected={...assigned,clinicalAssignedCardiologistId:cardio.id,assessmentRequests:[{specialty:'cardiologista' as const,status:'pending' as const,assignedProfessionalId:'other-cardio'}]}
 assert.equal(isPatientAssignedToDoctor(redirected,cardio),false)
 assert.equal(isPatientAssignedToDoctor({...redirected,assessmentRequests:[{specialty:'cardiologista',status:'pending'}]},cardio),false)
})
test('hierarchical medical sessions retain specialty permissions and explicit backend denials',()=>{
 const session=normalizeUserProfile({...doctor,role:'medico',medicalSpecialty:'clinico'})
 assert.equal(session.role,'clinico');assert.equal(session.professionalGroup,'medico')
 assert.equal(hasUserPermission(session,'issue_prescription'),true)
 assert.equal(hasUserPermission({...session,permissions:[]},'issue_prescription'),false)
 assert.throws(()=>normalizeUserProfile({...doctor,role:'medico',medicalSpecialty:undefined}),/inválido/)
})
test('all four specialties issue authored prescriptions and certificates only for their own patients',()=>{
 for(const role of ['clinico','cirurgiao','cardiologista','anestesista'] as const){
  const author=users.find(user=>user.role===role)!
  const patient={...assigned,triageAssignedClinicianId:author.id,clinicalAssignedSurgeonId:author.id,clinicalAssignedCardiologistId:author.id,cardiologyAssignedAnesthesiologistId:author.id}
  const draft={kind:'receita' as const,content:'Prescrição informada pelo médico',professionalRegistration:'CRM TESTE / PA'}
  const issued=issueMedicalDocument(patient,draft,author)
  assert.equal(issued.physicianId,author.id);assert.equal(issued.content,draft.content)
  assert.throws(()=>issueMedicalDocument(patient,draft,{...author,id:'other'}),/permissão/)
  assert.throws(()=>issueMedicalDocument(patient,{...draft,professionalRegistration:''},author),/registro/)
  const certificate=issueMedicalDocument(patient,{...draft,kind:'atestado',startDate:'2026-10-01',endDate:'2026-10-02'},author)
  assert.equal(certificate.kind,'atestado')
  assert.throws(()=>issueMedicalDocument(patient,{...draft,kind:'atestado',startDate:'2026-02-31',endDate:'2026-03-05'},author),/período/)
  assert.throws(()=>issueMedicalDocument(patient,{...draft,kind:'atestado',startDate:'2026-10-02',endDate:'2026-10-01'},author),/período/)
 }
 assert.throws(()=>issueMedicalDocument(assigned,{kind:'receita',content:'Texto',professionalRegistration:'CRM'},nurse),/permissão/)
})
test('collected exams remain without a result; image exams accept multiple images, single-file exams reject a second file',()=>{
 const exam:ExamRequest={id:'x',patientId:assigned.id,examTypeId:'type',examTypeName:'Test',status:'solicitado',solicitadoPor:doctor.id,solicitadoEm:'2024-01-01T08:00:00Z'}
 const collected=applyExamOperation(exam,'coletado',{coletadoEm:'2024-01-01T09:00:00Z'},lab)
 assert.equal(collected.status,'coletado');assert.equal(collected.resultado,undefined)
 const performed=applyExamOperation(collected,'em_analise',{performedAt:'2024-01-01T10:00:00Z'},lab)
 assert.throws(()=>applyExamOperation(performed,'em_analise',{attachments:[file('a'),file('b')]},lab),/apenas um/)
 const image=applyExamOperation({...performed,resultMode:'multiple_images'},'em_analise',{attachments:[file('a'),file('b')]},lab)
 assert.equal(image.attachments?.length,2)
 assert.throws(()=>applyExamOperation(image,'em_analise',{attachments:[file('pdf','application/pdf')]},lab),/JPG ou PNG/)
 assert.equal(applyExamOperation(image,'concluido',{},lab).status,'concluido')
})
