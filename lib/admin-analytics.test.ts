import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {presetRange,inRange,summarizeAdministration,recordCareStart,administrationReports} from './admin-analytics'
import {reportCsv} from './report-export'
import {patients} from './data/patients'
import {users} from './data/users'
import type {ExamRequest,MedicationOrder,Patient} from './types'
const range={from:'2026-10-01',to:'2026-10-17'}
const patient:Patient={...patients[2],id:'analytics-patient',dataEntrada:'2026-10-17T08:00:00-03:00',triageRiskClassification:'urgente',triageData:{manchester:{protocol:'Manchester',priority:'urgente',flowchart:'',discriminator:'',targetMinutes:60}},clinicalEvaluation:{completedAt:'2026-10-17T09:00:00-03:00',completedBy:'user-3'},cardiologyAssessment:undefined,anesthesiaAssessment:undefined,surgicalRiskAssessment:undefined,avaliacaoClinica:undefined,avaliacaoCirurgica:undefined,visitHistory:[],careTimings:[{id:'wait1',sector:'clinico',queuedAt:'2026-10-17T08:00:00-03:00',startedAt:'2026-10-17T08:30:00-03:00',professionalId:'user-3',encounterEntryAt:'2026-10-17T08:00:00-03:00'}]}
const exam:ExamRequest={id:'e',patientId:patient.id,examTypeId:'type',examTypeName:'Hemograma',status:'coletado',solicitadoPor:'user-3',solicitadoEm:'2026-10-17T10:00:00-03:00',coletadoEm:'2026-10-17T10:20:00-03:00'}
const med:MedicationOrder={id:'m',patientId:patient.id,medication:'Medicação de teste',dose:'Conforme prescrição',route:'Prescrita',instructions:'',status:'administrada',requestedAt:'2026-10-17T10:00:00-03:00',requestedBy:'user-3',administeredAt:'2026-10-17T10:30:00-03:00',administeredBy:'user-4'}
test('presets use Belem days, inclusive ranges and clamped calendar months, independent of host timezone',()=>{
 assert.deepEqual(presetRange('today',new Date('2026-10-17T01:00:00Z')),{from:'2026-10-16',to:'2026-10-16'})
 assert.deepEqual(presetRange('3d',new Date('2026-10-17T12:00:00Z')),{from:'2026-10-15',to:'2026-10-17'})
 assert.deepEqual(presetRange('1m',new Date('2026-03-31T12:00:00Z')),{from:'2026-02-28',to:'2026-03-31'})
 assert.deepEqual(presetRange('1y',new Date('2024-02-29T12:00:00Z')),{from:'2023-02-28',to:'2024-02-29'})
 assert.equal(inRange('2026-10-18T02:59:59Z',range),true);assert.equal(inRange('2026-10-18T03:00:00Z',range),false)
 assert.equal(inRange('2026-10-17T12:00:00Z',{from:'2026-02-31',to:'2026-10-17'}),false)
})
test('metrics deduplicate encounter snapshots and audit and count performed exams and administered medication only',()=>{
 const current={id:'current',entryAt:patient.dataEntrada,unit:'Hospital',reason:'Teste',clinicalSnapshot:{clinicalEvaluation:patient.clinicalEvaluation},triage:{riskClassification:'urgente' as const},medicationsAdministered:[{name:med.medication,dose:med.dose,route:med.route,administeredAt:med.administeredAt}]}
 const source={patients:[{...patient,visitHistory:[current,{...current,id:'duplicate'}]}],exams:[exam],medications:[med,{...med,id:'pending',status:'solicitada' as const,administeredAt:undefined}],audit:[{id:'audit',action:'avaliacao_clinica_concluida' as const,patientId:patient.id,userId:'user-3',userName:'Dr. Carlos Mendes',userRole:'clinico' as const,description:'Concluído',timestamp:'2026-10-17T09:01:00-03:00'}],users}
 const summary=summarizeAdministration(source,range)
 assert.equal(summary.visits.length,1);assert.equal(summary.patientsAttended,1);assert.equal(summary.medical.length,1);assert.equal(summary.medications.length,1);assert.equal(summary.performed.length,0)
 assert.equal(summary.classifications.find(item=>item.priority==='urgente')?.count,1)
 assert.equal(summary.waits.find(item=>item.sector==='clinico')?.minutes,30);assert.equal(summary.waits.find(item=>item.sector==='laboratorio')?.minutes,20);assert.equal(summary.waits.find(item=>item.sector==='recepcao')?.minutes,null)
 const performed=summarizeAdministration({...source,exams:[{...exam,performedAt:'2026-10-17T11:00:00-03:00'}]},range);assert.equal(performed.examRanking[0].count,1)
 assert.equal(summarizeAdministration(source,{from:'2026-01-01',to:'2026-01-31'}).patientsAttended,0)
 const reports=administrationReports(summary,range);assert.ok(reportCsv(Object.values(reports)).includes('30'));assert.equal(reportCsv([{title:'Teste',headers:['Nome'],rows:[['=1+1']]}]).includes('"\'=1+1"'),true)
})
test('waiting samples are recorded once per sector entry, retain previous encounters and never guess missing starts',()=>{
 const noSamples={...patient,careTimings:undefined}
 const first=recordCareStart(noSamples,'triagem','2026-10-17T08:00:00-03:00','user-2',new Date('2026-10-17T08:10:00-03:00'))
 const repeated=recordCareStart({...noSamples,careTimings:first},'triagem','2026-10-17T08:00:00-03:00','user-2',new Date('2026-10-17T08:20:00-03:00'))
 assert.equal(repeated,first);assert.equal(first.length,1)
 assert.equal(recordCareStart(noSamples,'triagem','invalid','user-2').length,0)
 const withoutTimes=summarizeAdministration({patients:[noSamples],exams:[],medications:[],audit:[],users},range)
 assert.ok(withoutTimes.waits.every(row=>row.minutes===null))
})
