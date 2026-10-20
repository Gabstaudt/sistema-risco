import {summarizeAdministration} from './admin-analytics'
import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {patients} from './data/patients'
import {consultation,medicalTransfer,DOCTOR_WORK_PERMISSIONS} from './medical-care'
import {seedRegistry,saveOwnWorkplace,upgradeMedicalRegistry} from './admin-access'
import {defaultSectors} from './sectors'
import {isPatientAssignedToDoctor} from './medical-profile'
import {issueMedicalDocument} from './medical-documents'
import {ADMISSION_DOCUMENTS} from './admission-documents'
const doctor=users.find(u=>u.role==='clinico')!
const patient={...patients[0],status:'aguardando_clinico' as const,attendanceClosure:undefined,triageAssignedClinicianId:doctor.id,assessmentRequests:undefined,medicalConsultations:[]}
test('physician changes only own room, sector and availability; specialty and access remain unchanged',()=>{
 const registry=seedRegistry(users)
 const updated=saveOwnWorkplace(registry,doctor,{sectorId:'sector-clinico',consultationRoom:'  Consultório 08  ',availability:'em_atendimento'})
 const stored=updated.users.find(u=>u.id===doctor.id)!
 assert.equal(stored.consultationRoom,'Consultório 08');assert.equal(stored.workplaceAvailability,'em_atendimento')
 assert.equal(stored.role,doctor.role);assert.equal(stored.password,doctor.password)
 assert.deepEqual(updated.users.find(u=>u.role==='triagem'),registry.users.find(u=>u.role==='triagem'))
 assert.throws(()=>saveOwnWorkplace(registry,doctor,{sectorId:'sector-cardiologista',consultationRoom:'8'}),/compatível/)
 assert.throws(()=>saveOwnWorkplace(registry,{...doctor,permissions:[]},{sectorId:'sector-clinico',consultationRoom:'8'}),/permissão/)
})
test('consultation timing survives repeated starts and records an explicit finish with anamnesis',()=>{
 const started=consultation(patient,doctor,'start',undefined,new Date('2026-10-19T10:00:00Z'))
 const working={...patient,medicalConsultations:started}
 assert.deepEqual(consultation(working,doctor,'start',undefined,new Date('2026-10-19T11:00:00Z')),started)
 const saved=consultation(working,doctor,'save','Anamnese relatada')
 const finished=consultation({...working,medicalConsultations:saved},doctor,'finish','Anamnese relatada',new Date('2026-10-19T10:15:00Z'))
 assert.equal(finished[0].startedAt,'2026-10-19T10:00:00.000Z');assert.equal(finished[0].endedAt,'2026-10-19T10:15:00.000Z')
 assert.equal(finished[0].outcome,'finalizada');assert.equal(finished[0].anamnesis,'Anamnese relatada')
 assert.throws(()=>consultation(working,doctor,'finish',''),/anamnese/)
 assert.throws(()=>consultation({...working,triageAssignedClinicianId:'another'},doctor,'save','Texto'),/direcionado/)
})
test('medical handoff assigns destination and preserves source notes without source access to the transferred chart',()=>{
 const target=users.find(u=>u.role==='cardiologista')!
 const working={...patient,medicalConsultations:consultation(patient,doctor,'start')}
 const updates=medicalTransfer(working,doctor,{sectorId:'sector-cardiologista',professionalId:target.id,reason:'Avaliação solicitada'},users,defaultSectors())
 const transferred={...working,...updates}
 assert.equal(updates.status,'aguardando_cardiologista')
 assert.equal(isPatientAssignedToDoctor(transferred,doctor),false);assert.equal(isPatientAssignedToDoctor(transferred,target),true)
 assert.equal(updates.medicalConsultations?.[0].outcome,'encaminhada')
 assert.equal(updates.medicalTransfers?.[0].reason,'Avaliação solicitada')
 assert.throws(()=>medicalTransfer(working,doctor,{sectorId:'sector-cardiologista',professionalId:target.id,reason:''},users,defaultSectors()),/motivo/)
 assert.throws(()=>medicalTransfer(working,doctor,{sectorId:'sector-cardiologista',professionalId:target.id,reason:'Parecer'},users.map(u=>({...u,workplaceAvailability:'indisponivel'})),defaultSectors()),/médico ativo/)
})
test('all six admission records require physician, assignment, permission, authored content and CRM',()=>{
 for(const kind of Object.keys(ADMISSION_DOCUMENTS) as (keyof typeof ADMISSION_DOCUMENTS)[]){
  const draft={kind,content:'Conteúdo informado pelo médico',professionalRegistration:'CRM TESTE / PA'}
  const document=issueMedicalDocument(patient,draft,doctor)
  assert.equal(document.kind,kind);assert.equal(document.physicianId,doctor.id)
  assert.throws(()=>issueMedicalDocument(patient,{...draft,content:''},doctor),/conteúdo/)
  assert.throws(()=>issueMedicalDocument(patient,draft,{...doctor,permissions:['view_patient_basic']}),/permissão/)
 }
})
test('medical permission migration is one-time and does not broaden custom profiles',()=>{
 const registry=seedRegistry(users)
 const old={...registry,medicalWorkVersion:undefined,profiles:registry.profiles.map(p=>({...p,permissions:p.permissions.filter(k=>!DOCTOR_WORK_PERMISSIONS.includes(k))}))}
 assert.ok(upgradeMedicalRegistry(old).profiles.find(p=>p.role==='clinico')?.permissions.includes('manage_own_workplace'))
 const restricted={...old,profiles:old.profiles.map(p=>p.role==='clinico'?{...p,permissions:['view_patient_basic']}:p)}
 assert.deepEqual(upgradeMedicalRegistry(restricted).profiles.find(p=>p.role==='clinico')?.permissions,['view_patient_basic'])
})

test('new completed consultations feed administrative attendance indicators without draft records',()=>{
 const record=consultation(patient,doctor,'start',undefined,new Date('2026-10-19T10:00:00Z'))[0]
 const completed={...record,endedAt:'2026-10-19T10:15:00Z',outcome:'finalizada' as const}
 const input={...patient,clinicalEvaluation:undefined,avaliacaoClinica:undefined,cardiologyAssessment:undefined,anesthesiaAssessment:undefined,surgicalRiskAssessment:undefined,avaliacaoCirurgica:undefined,visitHistory:[],medicalConsultations:[completed]}
 const report=summarizeAdministration({patients:[input],exams:[],medications:[],audit:[],users},{from:'2026-10-19',to:'2026-10-19'})
 assert.equal(report.medical.length,1);assert.equal(report.doctors[0].name,doctor.name)
})
