import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {patients} from './data/patients'
import {defaultSectors} from './sectors'
import {wardAdmission,appendWardRecord,blankWardVitals,dischargeWard,activeWardStay,wardMedicationVisible,type WardRecordDraft} from './ward'
import {hasUserPermission,projectPatientForUser} from './permissions'
import {administerMedication,prescribeMedication} from './lab-operations'
import {medicalTransfer} from './medical-care'
import {seedRegistry,upgradeWardRegistry,saveManagedUser} from './admin-access'
const nurse=users.find(u=>u.role==='enfermaria')!
const doctor=users.find(u=>u.role==='clinico')!
const sector=defaultSectors().find(s=>s.role==='enfermaria')!
const patient={...patients[0],status:'aguardando_clinico' as const,attendanceClosure:undefined,triageAssignedClinicianId:doctor.id,medicalConsultations:[],wardStays:[]}
function admitted(){const result={...patient,...wardAdmission(patient,nurse,sector,'Observação','Leito 04')};result.wardStays![0].admittedAt=new Date(Date.now()-600000).toISOString();return result}
const draft=():WardRecordDraft=>({kind:'sinais_vitais',occurredAt:new Date().toISOString(),vitals:{...blankWardVitals(),bloodPressure:'120/80',heartRate:'72',temperature:'36,5',oxygenSaturation:'98'},information:'Informações registradas',notes:'Observação'})
test('ward admission is scoped, singular and preserves clinical assessments and triage',()=>{
 const original=JSON.stringify(patient);const updates=wardAdmission(patient,nurse,sector,'Observação','Leito 04')
 assert.equal(updates.status,'em_enfermaria');assert.equal(updates.wardStays![0].bed,'Leito 04');assert.equal('triageData' in updates,false);assert.equal(JSON.stringify(patient),original)
 assert.throws(()=>wardAdmission({...patient,...updates},nurse,sector,'Nova'),/já está/)
 assert.throws(()=>wardAdmission(patient,{...nurse,sectorId:'outro'},sector,'Nova'),/permissão/)
 assert.throws(()=>wardAdmission({...patient,status:'concluido'},nurse,sector,'Nova'),/encerrada/)
 assert.throws(()=>wardAdmission(patient,nurse,sector,' '),/motivo/)
})
test('vital signs, observations and reassessment append timestamped authored history without changing triage values',()=>{
 const current=admitted();const original=JSON.stringify(current.triageData);const changes=appendWardRecord(current,nurse,draft())
 const record=changes.wardStays![0].records[0];assert.equal(record.vitalSigns?.temperature,36.5);assert.equal(record.by,nurse.id);assert.ok(record.recordedAt)
 assert.equal(appendWardRecord(current,nurse,{...draft(),kind:'observacao'}).wardStays![0].records[0].vitalSigns,undefined)
 assert.equal(JSON.stringify(current.triageData),original);assert.equal(current.wardStays![0].records.length,0)
 assert.throws(()=>appendWardRecord(current,nurse,{...draft(),vitals:{...blankWardVitals(),oxygenSaturation:'101'}}),/SpO/)
 assert.throws(()=>appendWardRecord(current,nurse,{...draft(),vitals:{...blankWardVitals(),glasgow:'16'}}),/Glasgow/)
 assert.throws(()=>appendWardRecord(current,nurse,{...draft(),vitals:blankWardVitals()}),/ao menos/)
 assert.throws(()=>appendWardRecord(current,nurse,{...draft(),occurredAt:new Date(Date.now()+60000).toISOString()}),/futura/)
 assert.throws(()=>appendWardRecord(current,nurse,{...draft(),occurredAt:new Date(Date.now()-3600000).toISOString()}),/após/)
 assert.throws(()=>appendWardRecord(current,nurse,{...draft(),kind:'reavaliacao',notes:''}),/reavaliação/)
 assert.equal(appendWardRecord(current,nurse,{...draft(),kind:'reavaliacao',notes:'Reavaliação registrada'}).wardStays![0].records[0].kind,'reavaliacao')
})
test('ward discharge retains records and returns the prior workflow without issuing hospital discharge',()=>{
 const current={...admitted(),...appendWardRecord(admitted(),nurse,draft())}
 const update=dischargeWard(current,nurse,'Encaminhado para a clínica.')
 assert.equal(update.status,'aguardando_clinico');assert.ok(update.wardStays![0].dischargedAt);assert.equal(update.wardStays![0].records.length,1);assert.equal('dischargeAt' in update,false)
 assert.equal(activeWardStay({...current,...update}),undefined)
 assert.throws(()=>appendWardRecord({...current,...update},nurse,draft()),/acompanhamento/)
 assert.throws(()=>dischargeWard(current,nurse,''),/observações/)
 assert.equal(dischargeWard({...current,status:'aguardando_exames'},nurse,'Continuidade do atendimento.').status,'aguardando_exames')
})
test('ward access and history do not reveal charts or system audit for unrelated sectors or subsequent care',()=>{
 const current=admitted()
 assert.equal(projectPatientForUser(patient,nurse),undefined)
 assert.equal(projectPatientForUser(current,{...nurse,sectorId:'outro'}),undefined)
 assert.equal(hasUserPermission(nurse,'view_patient_audit'),false)
 const discharged={...current,...dischargeWard(current,nurse,'Clínica'),clinicalEvaluation:{notes:'Avaliação médica posterior'}}
 assert.equal(projectPatientForUser(discharged,nurse)?.clinicalEvaluation,undefined)
 assert.equal(projectPatientForUser(discharged,nurse)?.wardStays?.length,1)
 assert.throws(()=>appendWardRecord(current,{...nurse,permissions:[]},draft()),/autorizado/)
 assert.throws(()=>prescribeMedication(current.id,{medication:'Exemplo',dose:'Exemplo',route:'Exemplo',instructions:''},nurse),/permissão/)
})
test('ward administration shares the once-only medication record and scopes orders to the stay encounter',()=>{
 const current=admitted()
 const order=prescribeMedication(current.id,{medication:'Prescrição fictícia',dose:'Dose de exemplo',route:'Via de exemplo',instructions:''},doctor)
 assert.equal(wardMedicationVisible(current,order,nurse),true)
 const done=administerMedication(order,new Date().toISOString(),nurse)
 assert.equal(done.status,'administrada');assert.throws(()=>administerMedication(done,new Date().toISOString(),nurse),/já foi/)
 const discharged={...current,...dischargeWard(current,nurse,'Clínica')}
 const future={...order,requestedAt:new Date(Date.now()+60000).toISOString()}
 assert.equal(wardMedicationVisible(discharged,future,nurse),false)
})
test('physician transfer creates a ward stay and preserves the responsible physician',()=>{
 const update=medicalTransfer(patient,doctor,{sectorId:sector.id,professionalId:'',reason:'Acompanhamento solicitado'},users,defaultSectors())
 assert.equal(update.status,'em_enfermaria');assert.equal(update.wardStays?.length,1);assert.equal(update.triageAssignedClinicianId,undefined)
 assert.equal({...patient,...update}.triageAssignedClinicianId,doctor.id)
})
test('admin registry adds the new ward role and sector without overwriting custom access',()=>{
 const registry=seedRegistry(users);const legacy={...registry,profiles:registry.profiles.filter(p=>p.role!=='enfermaria'),sectors:registry.sectors!.filter(s=>s.role!=='enfermaria')}
 const next=upgradeWardRegistry(legacy);assert.ok(next.profiles.find(p=>p.role==='enfermaria'));assert.ok(next.sectors?.find(s=>s.role==='enfermaria'))
 assert.deepEqual(next.profiles.find(p=>p.role==='clinico'),legacy.profiles.find(p=>p.role==='clinico'))
 const admin=users.find(u=>u.role==='admin')!
 const saved=saveManagedUser(next,admin,{name:'Enfermagem nova',email:'enfermagem@teste.com',password:'123456',active:true,profileId:'profile-enfermaria',sectorId:sector.id})
 assert.equal(saved.users.at(-1)?.role,'enfermaria')
})
