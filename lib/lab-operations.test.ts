import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {applyExamOperation,examActivityTime,prescribeMedication,administerMedication} from './lab-operations'
import {users} from './data/users'
import type {ExamRequest} from './types'
const lab=users.find(user=>user.role==='laboratorio')!;const doctor=users.find(user=>user.role==='clinico')!
const exam:ExamRequest={id:'exam-request-test',patientId:'patient-1',examTypeId:'exam-1',examTypeName:'Exame',status:'solicitado',solicitadoPor:doctor.id,solicitadoEm:'2024-01-01T08:00:00Z'}
test('collection, execution and publication retain distinct times and responsible staff',()=>{
 const collected=applyExamOperation(exam,'coletado',{coletadoEm:'2024-01-01T09:00:00Z'},lab)
 const performed=applyExamOperation(collected,'em_analise',{performedAt:'2024-01-01T10:00:00Z'},lab)
 const done=applyExamOperation(performed,'concluido',{resultado:'Registrado',concluidoEm:'2024-01-01T11:00:00Z'},lab)
 assert.equal(done.coletadoEm,collected.coletadoEm);assert.equal(done.performedAt,performed.performedAt);assert.equal(done.performedBy,lab.id);assert.equal(done.concluidoPor,lab.id)
 assert.equal(examActivityTime(done),Date.parse(done.concluidoEm!))
})
test('an uploaded result is enough for publication; missing result, impossible chronology and denied permissions are rejected',()=>{
 const performed=applyExamOperation(exam,'em_analise',{performedAt:'2024-01-01T10:00:00Z'},lab)
 const attachment={id:'file-1',name:'resultado.pdf',type:'application/pdf',size:123,uploadedAt:'2024-01-01T11:00:00Z',uploadedBy:lab.id}
 assert.equal(applyExamOperation(performed,'concluido',{attachment,concluidoEm:'2024-01-01T11:00:00Z'},lab).status,'concluido')
 assert.throws(()=>applyExamOperation(exam,'concluido',{},lab),/resultado/)
 assert.throws(()=>applyExamOperation(exam,'coletado',{coletadoEm:'2023-12-31T10:00:00Z'},lab),/ordem/)
 assert.throws(()=>applyExamOperation(exam,'coletado',{},doctor),/permissão/)
 assert.throws(()=>applyExamOperation(exam,'coletado',{}, {...lab,permissions:[]}),/permissão/)
})
test('sorting uses the latest actual event, including uploaded results',()=>{
 const attached={...exam,attachment:{id:'1',name:'result.pdf',type:'application/pdf',size:3,uploadedAt:'2024-02-01T00:00:00Z',uploadedBy:lab.id}}
 assert.ok(examActivityTime(attached)>examActivityTime(exam))
 assert.equal([exam,attached].sort((a,b)=>examActivityTime(b)-examActivityTime(a))[0].attachment?.id,'1')
})
test('medication administration requires a prescription, staff permission and an actual time; duplicate administrations are blocked',()=>{
 const requested=prescribeMedication('patient-1',{medication:'Medicação de teste',dose:'Dose prescrita',route:'Via prescrita',instructions:''},doctor)
 const done=administerMedication(requested,new Date().toISOString(),lab)
 assert.equal(done.administeredBy,lab.id);assert.equal(done.requestedBy,doctor.id);assert.equal(done.status,'administrada')
 assert.throws(()=>administerMedication(done,new Date().toISOString(),lab),/já foi registrada/)
 assert.throws(()=>administerMedication(requested,'invalid',lab),/horário válido/)
 assert.throws(()=>prescribeMedication('patient-1',{medication:'Teste',dose:'',route:'',instructions:''},doctor),/dose e via/)
 assert.throws(()=>administerMedication(requested,new Date().toISOString(),doctor),/permissão/)
 assert.throws(()=>prescribeMedication('patient-1',{medication:'Teste',dose:'Dose',route:'Via',instructions:''},lab),/permissão/)
})
