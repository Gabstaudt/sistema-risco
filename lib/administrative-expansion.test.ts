import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {patients} from './data/patients'
import {defaultProfiles,seedRegistry,saveManagedUser} from './admin-access'
import {previewProfile} from './profile-preview'
import {hasUserPermission,canAccessRoute,projectPatientForUser} from './permissions'
import {validateUnitSettings,defaultUnitSettings} from './unit-settings'
import {summarizeAdministration} from './admin-analytics'
import {ageOnDay,municipalityOccurrences,extendedAdministrationReports,completedProductionSources,validateProductionCoding,bpaPending,type ProductionCoding} from './admin-reports'
import {emptyPharmacy} from './pharmacy'
import {consultation} from './medical-care'
const admin=users.find(user=>user.role==='admin')!;const doctor=users.find(user=>user.role==='clinico')!
const range={from:'2026-10-01',to:'2026-10-31'}
test('administrator previews a managed profile with its actual restrictions and cannot write through the preview',()=>{
 const registry=seedRegistry(users);const profile=registry.profiles.find(profile=>profile.role==='recepcao')!;const preview=previewProfile(admin,profile,registry.users)
 assert.ok(preview.previewMode);assert.equal(preview.role,'recepcao');assert.ok(canAccessRoute('/recepcao/cadastro',preview));assert.ok(hasUserPermission(preview,'view_patient_basic'));assert.ok(!hasUserPermission(preview,'create_patient'));assert.ok(!hasUserPermission(preview,'view_triage_data'));assert.equal(projectPatientForUser(patients[0],preview)?.clinicalEvaluation,undefined)
 assert.throws(()=>previewProfile(doctor,profile,registry.users),/administrador/)
 assert.throws(()=>previewProfile({...admin,permissions:[]},profile,registry.users),/administrador/)
 assert.throws(()=>saveManagedUser(registry,preview,{name:'Teste',email:'a@b.com',password:'123456',active:true,profileId:profile.id}),/permissão/)
})
test('unit configuration validates identifiers and image payloads, respects permission denials and records author',()=>{
 const draft={...defaultUnitSettings(),name:'Hospital Municipal',cnes:'1234567',uf:'PA',logo:'data:image/png;base64,aGVsbG8='};const saved=validateUnitSettings(draft,admin);assert.equal(saved.updatedBy,admin.id);assert.ok(saved.updatedAt)
 assert.throws(()=>validateUnitSettings({...draft,cnes:'123'},admin),/CNES/)
 assert.throws(()=>validateUnitSettings({...draft,logo:'data:image/svg+xml;base64,aGVsbG8='},admin),/imagem/)
 assert.throws(()=>validateUnitSettings(draft,{...admin,previewMode:true}),/permissão/)
 assert.throws(()=>validateUnitSettings(draft,{...admin,permissions:[]}),/permissão/)
})
test('professional registration requires occupation, CBO, sector, unit and profile without fabricating a CBO',()=>{
 const registry=seedRegistry(users);const draft={name:'Profissional',email:'profissional@teste.com',password:'123456',active:true,profileId:'profile-enfermaria',sectorId:'sector-enfermaria',isHealthProfessional:true,cboCode:'223505',occupationName:'Ocupação informada pelo hospital',unitName:'Unidade municipal',professionalCns:'123456789012345'}
 const next=saveManagedUser(registry,admin,draft);const created=next.users.find(user=>user.email===draft.email)!;assert.equal(created.cboCode,draft.cboCode);assert.equal(created.unitName,draft.unitName)
 assert.throws(()=>saveManagedUser(registry,admin,{...draft,cboCode:''}),/CBO/)
 assert.throws(()=>saveManagedUser(registry,admin,{...draft,unitName:''}),/unidade/)
 assert.throws(()=>saveManagedUser(registry,admin,{...draft,sectorId:'sector-clinico'}),/setor/)
})
function scenario(){const patient={...patients[0],id:'admin-report-patient',dataNascimento:'2008-10-20',municipioResidencia:'Marabá',ufResidencia:'PA',dataEntrada:'2026-10-19T13:00:00Z',cadastradoEm:'2026-10-19T13:00:00Z',status:'aguardando_clinico' as const,attendanceClosure:undefined,visitHistory:[],clinicalEvaluation:undefined,avaliacaoClinica:undefined,cardiologyAssessment:undefined,anesthesiaAssessment:undefined,surgicalRiskAssessment:undefined,avaliacaoCirurgica:undefined,triageAssignedClinicianId:doctor.id,medicalConsultations:[],careTimings:[],wardStays:[]};const staffed={...doctor,cboCode:'225125',occupationName:'Ocupação registrada',unitName:'Hospital A',department:'Setor A'};patient.medicalConsultations=consultation(patient,staffed,'start',undefined,new Date('2026-10-19T14:00:00Z')) as never[];patient.medicalConsultations=consultation(patient,staffed,'finish','Anamnese',new Date('2026-10-19T14:10:00Z')) as never[];const summary=summarizeAdministration({patients:[patient],exams:[],medications:[],audit:[],users:[{...staffed,cboCode:'999999',department:'Setor B'}]},range);return {patient,summary,staffed}}
test('reports use age at encounter and preserve professional CBO/sector snapshots after directory changes',()=>{
 const {patient,summary,staffed}=scenario();assert.equal(ageOnDay(patient.dataNascimento,patient.dataEntrada),17);assert.equal(ageOnDay(patient.dataNascimento,'2026-10-20T04:00:00Z'),18);assert.equal(municipalityOccurrences(summary)[0].name,'Marabá / PA');assert.equal(summary.medical[0].cboCode,'225125');assert.equal(summary.medical[0].sectorName,'Setor A');assert.equal(ageOnDay('2026-02-31',patient.dataEntrada),undefined)
 const reports=extendedAdministrationReports(summary,[patient],[staffed],emptyPharmacy(),[],defaultUnitSettings(),range);assert.ok(reports.faixas_etarias.rows.some(row=>row[0]==='10 a 19 anos'&&row[1]===1));assert.equal(reports.producao_cbo.rows[0][0],'225125');assert.equal(reports.setores.rows[0][0],'Setor A');assert.equal(reports.cadastro_pacientes.rows.length,1)
 const completed={...patient,clinicalEvaluation:{completedAt:'2026-10-19T14:10:00Z',completedBy:staffed.id}} as import('./types').Patient;const after=summarizeAdministration({patients:[completed],exams:[],medications:[],audit:[],users:[staffed]},range);assert.equal(completedProductionSources(after,[completed],[staffed])[0].id,completedProductionSources(summary,[patient],[staffed])[0].id)
})
test('BPA conference never invents procedure codes or asserts official validity, and coding requires completed production',()=>{
 const {patient,summary,staffed}=scenario();patient.cartaoSus='';const source=completedProductionSources(summary,[patient],[staffed])[0];const unit=defaultUnitSettings();assert.ok(bpaPending(source,undefined,patient,unit).includes('Procedimento SIGTAP'))
 const draft:ProductionCoding={sourceId:source.id,procedureCode:'0000000001',procedureName:'Procedimento fictício de teste',quantity:1,instrument:'BPA-I',cboCode:'225125',professionalCns:'123456789012345',cnes:'1234567',diagnosis:'',municipalityCode:'150420',updatedAt:'',updatedBy:''};assert.equal(validateProductionCoding(draft,admin,[source]).updatedBy,admin.id)
 assert.throws(()=>validateProductionCoding(draft,{...admin,permissions:[]},[source]),/permissão/);assert.throws(()=>validateProductionCoding(draft,{...admin,permissions:['view_reports']},[source]),/permissão/);assert.throws(()=>validateProductionCoding(draft,{...admin,previewMode:true},[source]),/permissão/);assert.throws(()=>validateProductionCoding(draft,admin,[]),/concluída/)
 const report=extendedAdministrationReports(summary,[patient],[staffed],emptyPharmacy(),[draft],unit,range).bpa;assert.equal(report.rows.length,1);assert.equal(report.rows[0][10],draft.procedureCode);assert.ok(report.rows[0][15].toString().includes('CNS paciente'))
})
test('dispensation excludes reservations, stock receipts and expired-product disposal',()=>{
 const {patient,summary,staffed}=scenario();const state={...emptyPharmacy(),products:[{id:'product',code:'P01',name:'Produto',unit:'unidade',minimum:0,expiryAlertDays:30,active:true}],lots:[{id:'lot',productId:'product',lot:'LOTE',location:'Local',expiry:'2099-01-01',quantity:5,enteredAt:'2026-10-01T12:00:00Z'}],movements:(['entrada','saida','administracao','descarte'] as const).map((kind,index)=>({id:'m'+index,kind,lotId:'lot',productId:'product',quantity:1,at:'2026-10-19T15:00:00Z',recordedAt:'2026-10-19T15:00:00Z',by:admin.id,reason:'Teste',destination:'Setor'}))};const report=extendedAdministrationReports(summary,[patient],[staffed],state,[],defaultUnitSettings(),range).dispensacao;assert.equal(report.rows.length,2)
})
