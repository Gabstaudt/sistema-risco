import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { saveSurgeryRecord, summarizeSurgeries, type SurgeryDraft } from './surgery-records'
import { patients } from './data/patients'
import { users } from './data/users'
import { canAccessRoute, projectPatientForUser } from './permissions'
const surgeon=users.find(user=>user.role==='cirurgiao')!
const draft: SurgeryDraft={procedureType:'Herniorrafia',segment:'Cirurgia geral',status:'realizada',performedAt:'2024-01-10',notes:'Cirurgia realizada',postoperativeNotes:'Sem intercorrências',postoperativeOutcome:'alta'}
test('recording and following surgery retains a single record and its author',()=>{
 const first=saveSurgeryRecord(patients[0],surgeon,draft)
 const updated=saveSurgeryRecord({...patients[0],surgeryRecords:first},surgeon,{...draft,postoperativeNotes:'Retorno registrado'},first[0].id)
 assert.equal(updated.length,1);assert.equal(updated[0].createdAt,first[0].createdAt);assert.equal(updated[0].createdBy,surgeon.id);assert.equal(updated[0].postoperativeNotes,'Retorno registrado')
})
test('surgical approvals and planned/cancelled procedures are not counted as executed surgery',()=>{
 const performed=saveSurgeryRecord(patients[0],surgeon,draft)
 const planned=saveSurgeryRecord({...patients[0],surgeryRecords:performed},surgeon,{...draft,status:'planejada',postoperativeNotes:''})
 const cancelled=saveSurgeryRecord({...patients[0],surgeryRecords:planned},surgeon,{...draft,status:'cancelada',postoperativeNotes:''})
 assert.equal(summarizeSurgeries([{...patients[0],surgeryRecords:cancelled}]).total,1)
 assert.equal(summarizeSurgeries(patients).total,0)
})
test('auditing groups case-insensitive types and applies inclusive date/type filters',()=>{
 const one=saveSurgeryRecord(patients[0],surgeon,draft)
 const two=saveSurgeryRecord({...patients[0],surgeryRecords:one},surgeon,{...draft,procedureType:' herniorrafia ',performedAt:'2024-01-11'})
 const source=[{...patients[0],surgeryRecords:two}]
 assert.equal(summarizeSurgeries(source).byType[0].count,2)
 assert.equal(summarizeSurgeries(source,'2024-01-11','2024-01-11','HERNIORRAFIA').total,1)
 assert.equal(summarizeSurgeries(source,'2024-02-01').total,0)
})
test('invalid dates and unauthorized mutations are rejected',()=>{
 assert.throws(()=>saveSurgeryRecord(patients[0],surgeon,{...draft,performedAt:''}),/data válida/)
 assert.throws(()=>saveSurgeryRecord(patients[0],surgeon,{...draft,performedAt:'2024-02-30'}),/data válida/)
 assert.throws(()=>saveSurgeryRecord(patients[0],surgeon,{...draft,performedAt:'2099-01-01'}),/futura/)
 assert.throws(()=>saveSurgeryRecord(patients[0],users[0],draft),/permissão/)
 assert.throws(()=>saveSurgeryRecord(patients[0],{...surgeon,permissions:[]},draft),/permissão/)
})
test('reception cannot read surgery records or open the surgery audit',()=>{
 const source={...patients[0],surgeryRecords:saveSurgeryRecord(patients[0],surgeon,draft)}
 assert.equal(projectPatientForUser(source,users[0])?.surgeryRecords,undefined)
 assert.equal(canAccessRoute('/admin/cirurgias',users[0]),false)
 assert.equal(canAccessRoute('/admin/cirurgias',users.find(user=>user.role==='admin')!),true)
 assert.equal(canAccessRoute(`/cirurgiao/acompanhamento/${source.id}`,surgeon),true)
})
