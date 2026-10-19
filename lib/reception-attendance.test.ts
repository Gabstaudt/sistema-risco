import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {cleanRegistration,registrationDraft} from './patient-registration'
import {intakeUpdates,updateReceptionAttendance,closeReceptionAttendance} from './reception-attendance'
import {users} from './data/users'
import {patients} from './data/patients'
import {seedRegistry,upgradeAccessRegistry} from './admin-access'
import {summarizeAdministration} from './admin-analytics'
const actor=users.find(u=>u.role==='recepcao')!
const doctor=users.find(u=>u.role==='clinico')!
const draft={...registrationDraft(),nomeCompleto:'Paciente sem documentos',dataNascimento:'1990-01-01',sexo:'F',maeDesconhecida:true,paiDesconhecido:true}
const intake={complaint:'Dor',notes:'Relato inicial',route:'sem_triagem' as const,doctorId:doctor.id}
test('registration allows absent optional identifiers and requires explicit parent information',()=>{
 const clean=cleanRegistration(draft,[{...patients[0],cpf:'',cartaoSus:''}])
 assert.equal(clean.cpf,'');assert.equal(clean.telefone,'');assert.equal(clean.nomeMae,'')
 assert.throws(()=>cleanRegistration({...draft,maeDesconhecida:false},[]),/mãe/)
 assert.throws(()=>cleanRegistration({...draft,paiDesconhecido:false},[]),/pai/)
 assert.throws(()=>cleanRegistration({...draft,nacionalidade:'naturalizado'},[]),/naturalização/)
 assert.throws(()=>cleanRegistration({...draft,dataNascimento:'2026-02-30'},[]),/nascimento/)
})
test('no triage uses white classification and an eligible assigned clinician',()=>{
 const result=intakeUpdates(intake,users)
 assert.equal(result.receptionClassification,'branca');assert.equal(result.status,'aguardando_clinico')
 assert.equal(result.triageAssignedClinicianId,doctor.id);assert.equal(result.triageRiskClassification,undefined)
 assert.throws(()=>intakeUpdates({...intake,doctorId:''},users),/clínico/)
 assert.throws(()=>intakeUpdates(intake,users.map(u=>({...u,permissions:[]}))),/clínico/)
 assert.equal(intakeUpdates({...intake,route:'com_triagem'},users).triageAssignedClinicianId,undefined)
})
test('reception update preserves clinical status and administrative closure requires justification',()=>{
 const patient={...patients[0],status:'em_avaliacao_clinica' as const,attendanceRoute:'com_triagem' as const}
 const update=updateReceptionAttendance(patient,{...intake,route:'com_triagem'},actor,users,[])
 assert.equal(update.status,undefined)
 assert.throws(()=>updateReceptionAttendance(patient,intake,actor,users,[]),/antes da chamada/)
 assert.throws(()=>closeReceptionAttendance(patient,actor,'cancelamento','  '),/justificativa/)
 const closed=closeReceptionAttendance(patient,actor,'cancelamento','Paciente foi embora')
 assert.equal(closed.attendanceClosure?.reason,'Paciente foi embora')
 assert.throws(()=>closeReceptionAttendance({...patient,...closed},actor,'baixa','Saiu'),/encerrado/)
 assert.throws(()=>closeReceptionAttendance(patient,{...actor,permissions:[]},'baixa','Saiu'),/permissão/)
})
test('registry upgrade grants new reception defaults while retaining custom revocations',()=>{
 const registry=seedRegistry(users)
 const old={...registry,receptionVersion:undefined,profiles:registry.profiles.map(p=>({...p,permissions:p.permissions.filter(k=>!['manage_attendance','print_blank_attendance'].includes(k))}))}
 assert.ok(upgradeAccessRegistry(old).profiles.find(p=>p.role==='recepcao')!.permissions.includes('manage_attendance'))
 const restricted={...old,profiles:old.profiles.map(p=>p.role==='recepcao'?{...p,permissions:p.permissions.filter(k=>k!=='create_patient')}:p)}
 const upgraded=upgradeAccessRegistry(old);const revoked={...upgraded,profiles:upgraded.profiles.map(p=>({...p,permissions:p.permissions.filter(k=>k!=='manage_attendance')}))};assert.ok(!upgradeAccessRegistry(revoked).profiles.find(p=>p.role==='recepcao')!.permissions.includes('manage_attendance'))
 assert.ok(!upgradeAccessRegistry(restricted).profiles.find(p=>p.role==='recepcao')!.permissions.includes('manage_attendance'))
})
test('administrative reports count white separately from Manchester and unclassified',()=>{
 const patient={...patients[0],visitHistory:[],attendanceRoute:'sem_triagem' as const,triageData:undefined,triageRiskClassification:undefined,dataEntrada:'2026-10-19T12:00:00Z'}
 const report=summarizeAdministration({patients:[patient],exams:[],medications:[],audit:[],users},{from:'2026-10-19',to:'2026-10-19'})
 assert.equal(report.classifications.find(c=>c.priority==='branca')?.count,1)
 assert.equal(report.classifications.reduce((sum,c)=>sum+c.count,0),1)
})
