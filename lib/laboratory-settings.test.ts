import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {validateExamConfiguration,examReferenceForAge,compareLaboratoryQueue,patientAgeAtRequest} from './laboratory-settings'
import type {ExamType,ExamRequest,ExamAgeRange} from './types'
const admin=users.find(user=>user.role==='admin')!
const doctor=users.find(user=>user.role==='clinico')!
const ranges:ExamAgeRange[]=[{id:'child',name:'Crianças',minYears:0,maxYears:17,reference:'Referência pediátrica configurada'},{id:'adult',name:'Adultos',minYears:18,reference:'Referência adulta configurada'}]
const exam:ExamType={id:'exam',name:'Hemograma',category:'Hematologia',createdAt:'2026-01-01',createdBy:admin.id,ageRanges:ranges,active:true,valueReference:'Geral'}
test('admin configures availability and non-overlapping age ranges; explicit permissions are authoritative',()=>{
 assert.doesNotThrow(()=>validateExamConfiguration(exam,undefined,admin))
 assert.throws(()=>validateExamConfiguration(exam,undefined,doctor),/administração/)
 assert.throws(()=>validateExamConfiguration({...exam,active:false},exam,doctor),/administração/)
 assert.throws(()=>validateExamConfiguration(exam,undefined,{...admin,permissions:[]}),/administração/)
 assert.doesNotThrow(()=>validateExamConfiguration(exam,exam,doctor))
 assert.throws(()=>validateExamConfiguration({...exam,ageRanges:[ranges[0],{...ranges[1],minYears:17}]},exam,admin),/sobrepor/)
 assert.throws(()=>validateExamConfiguration({...exam,ageRanges:[{...ranges[0],minYears:-1}]},exam,admin),/idades/)
 assert.equal(examReferenceForAge(exam,17),ranges[0].reference)
 assert.equal(examReferenceForAge(exam,18),ranges[1].reference)
})
const request=(id:string,time:string,labUrgency?:ExamRequest['labUrgency']):ExamRequest=>({id,patientId:'p',examTypeId:'exam',examTypeName:'Hemograma',status:'solicitado',solicitadoPor:'doctor',solicitadoEm:time,labUrgency})
test('laboratory queue prioritizes urgency then FIFO independently of collection events',()=>{
 const first=request('first','2026-10-20T08:00:00Z','urgente')
 const second={...request('second','2026-10-20T09:00:00Z','urgente'),coletadoEm:'2026-10-20T10:00:00Z'}
 const emergency=request('emergency','2026-10-20T09:30:00Z','emergente')
 assert.deepEqual([second,first,emergency].sort((a,b)=>compareLaboratoryQueue(a,b,[])).map(exam=>exam.id),['emergency','first','second'])
 assert.deepEqual([second,first,emergency].sort((a,b)=>compareLaboratoryQueue(a,b,[],true)).map(exam=>exam.id),['first','second','emergency'])
})

test('exam reference uses age on request date in Belem, preserving birthday boundaries and absent birth dates',()=>{
 assert.equal(patientAgeAtRequest({dataNascimento:'2008-10-20'} as import('./types').Patient,new Date('2026-10-20T02:00:00Z')),17)
 assert.equal(patientAgeAtRequest({dataNascimento:'2008-10-20'} as import('./types').Patient,new Date('2026-10-20T04:00:00Z')),18)
 assert.equal(examReferenceForAge(exam,undefined),'Geral')
})
