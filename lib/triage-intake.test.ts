import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {patients} from './data/patients'
import {triageIntake,validateTriageIntake} from './triage-intake'
import {defaultSectors} from './sectors'
import {seedRegistry,saveHospitalSector,saveManagedUser,upgradeSectorRegistry,upgradeTriageRegistry} from './admin-access'
import {closeReceptionAttendance} from './reception-attendance'
const nurse=users.find(u=>u.role==='triagem')!
const admin=users.find(u=>u.role==='admin')!
const doctor=users.find(u=>u.role==='clinico')!
test('triage stores requested observations without deriving Manchester or clinical diagnoses',()=>{
 const draft={...triageIntake(),anamnesis:'A'.repeat(400),preexistingDiseases:'D'.repeat(100),professionalId:doctor.id,patientStates:['Consciente','Orientado'],symptoms:['Palidez']}
 const update=validateTriageIntake(draft,true,users,nurse)
 assert.equal(update.status,'aguardando_clinico');assert.equal(update.triageRiskClassification,undefined)
 assert.throws(()=>validateTriageIntake({...draft,anamnesis:'A'.repeat(401)},true,users,nurse),/400/)
 assert.throws(()=>validateTriageIntake({...draft,preexistingDiseases:'D'.repeat(101)},true,users,nurse),/100/)
 assert.throws(()=>validateTriageIntake({...draft,medicationsInUse:'sim'},false,users,nurse),/medicamentos/)
 assert.throws(()=>validateTriageIntake(draft,true,users,{...nurse,permissions:['register_vital_signs']}),/encaminhar/)
})
test('sector referral assigns specialty queues to an eligible professional in the selected sector',()=>{
 const cardio=users.find(u=>u.role==='cardiologista')!
 const draft={...triageIntake(),destination:'cardiologista' as const,sectorId:'sector-cardiologista',professionalId:cardio.id}
 const update=validateTriageIntake(draft,true,users,nurse)
 assert.equal(update.status,'aguardando_cardiologista');assert.equal(update.assessmentRequests?.[0].assignedProfessionalId,cardio.id)
 assert.throws(()=>validateTriageIntake(draft,true,users.map(u=>({...u,sectorId:'another-sector'})),nurse),/profissional/)
 assert.throws(()=>validateTriageIntake(draft,true,users,nurse,defaultSectors().map(s=>({...s,active:false}))),/setor ativo/)
 assert.equal(validateTriageIntake({...triageIntake(),destination:'laboratorio',sectorId:'sector-laboratorio'},true,users,nurse).status,'aguardando_laboratorio')
})
test('triage can cancel waiting patients with a reason, but cannot close patients in other sectors',()=>{
 const waiting={...patients[0],status:'aguardando_triagem' as const}
 assert.equal(closeReceptionAttendance(waiting,nurse,'cancelamento','Foi embora').status,'concluido')
 assert.throws(()=>closeReceptionAttendance({...waiting,status:'em_triagem'},nurse,'cancelamento','Foi embora'),/permissão/)
 assert.throws(()=>closeReceptionAttendance(waiting,nurse,'cancelamento',''),/justificativa/)
 assert.throws(()=>closeReceptionAttendance(waiting,{...nurse,permissions:[]},'cancelamento','Foi embora'),/permissão/)
})
test('admin manages sectors and binds users; sectors do not grant permissions or change professional roles',()=>{
 let registry=seedRegistry(users)
 registry=saveHospitalSector(registry,admin,{name:'Clínica B',role:'clinico',active:true})
 const sector=registry.sectors!.find(s=>s.name==='Clínica B')!
 const clinician=registry.users.find(u=>u.id===doctor.id)!
 registry=saveManagedUser(registry,admin,{...clinician,professionalRegistration:'CRM TESTE / PA',password:'',profileId:'profile-clinico',sectorId:sector.id},doctor.id)
 assert.equal(registry.users.find(u=>u.id===doctor.id)?.department,'Clínica B')
 assert.throws(()=>saveHospitalSector(registry,admin,{...sector,active:false},sector.id),/Realoque/)
 assert.throws(()=>saveManagedUser(registry,admin,{...clinician,professionalRegistration:'CRM TESTE / PA',password:'',profileId:'profile-clinico',sectorId:'sector-cardiologista'},doctor.id),/compatível/)
 assert.throws(()=>saveHospitalSector(registry,nurse,{name:'Outro',role:'clinico',active:true}),/permissão/)
})
test('legacy sector and triage upgrades preserve customized permissions and existing sector labels',()=>{
 const registry=seedRegistry(users)
 const legacy={...registry,sectors:undefined,triageVersion:undefined,users:registry.users.map(u=>({...u,sectorId:undefined,department:u.id===doctor.id?'Clínica antiga':undefined})),profiles:registry.profiles.map(p=>({...p,permissions:p.permissions.filter(k=>!['cancel_triage_attendance','forward_triage_sector','print_triage_sheet'].includes(k))}))}
 const upgraded=upgradeSectorRegistry(legacy)
 assert.equal(upgraded.sectors!.find(s=>s.id===upgraded.users.find(u=>u.id===doctor.id)?.sectorId)?.name,'Clínica antiga')
 assert.ok(upgraded.profiles.find(p=>p.role==='triagem')?.permissions.includes('cancel_triage_attendance'))
 const custom={...legacy,profiles:legacy.profiles.map(p=>p.role==='triagem'?{...p,permissions:['view_patient_basic']}:p)}
 assert.deepEqual(upgradeTriageRegistry(custom).profiles.find(p=>p.role==='triagem')?.permissions,['view_patient_basic'])
})
