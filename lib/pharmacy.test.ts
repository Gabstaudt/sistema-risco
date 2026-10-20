import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {seedRegistry,upgradeWardRegistry,saveManagedUser,resolveRegistryUser,defaultProfiles} from './admin-access'
import {canAccessRoute,projectPatientForUser,hasUserPermission} from './permissions'
import {patients} from './data/patients'
import {prescribeMedication,administerMedication} from './lab-operations'
import {emptyPharmacy,saveSupplier,saveProduct,saveProgram,enterStock,removeStock,separateMedication,cancelSeparation,deductAdministeredMedication,availableQuantity,productAvailable,reconcileSeparations,pharmacyDay,normalizeCnpj,type PharmacyState} from './pharmacy'
import {MOVEMENT_HEADERS,parsePharmacyCsv,importPharmacyMovements,pharmacyCsv,movementRows} from './pharmacy-csv'
import type {User,MedicationOrder} from './types'
const admin=users.find(user=>user.role==='admin')!;const nurse=users.find(user=>user.role==='enfermaria')!;const doctor=users.find(user=>user.role==='clinico')!
const pharmacist:User={...admin,id:'pharmacist',role:'farmacia',permissions:undefined}
function stock(){let state=saveSupplier(emptyPharmacy(),{name:'Fornecedor',cnpj:'12.345.678/0001-90',phone:'',email:'',address:'',active:true},admin);state=saveProgram(state,{name:'Programa municipal',description:'Descrição',active:true},admin);state=saveProduct(state,{code:'MED-01',name:'Produto de teste',unit:'ampola',minimum:5,expiryAlertDays:30,active:true},admin);return enterStock(state,{productId:state.products[0].id,lot:'LOTE-01',location:'Armário 01',expiry:'2099-12-31',quantity:20,supplierId:state.suppliers[0].id,programId:state.programs[0].id,reason:'Entrada inicial',at:'2026-01-01T12:00:00Z'},admin)}
function order():MedicationOrder{return {...prescribeMedication(patients[0].id,{medication:'Produto de teste',dose:'Conforme prescrição de teste',route:'Via de teste',instructions:''},doctor),requestedAt:'2026-01-01T12:00:00Z'}}
test('pharmacy profile is manageable, grants stock access without medical assessments, and obeys explicit grants',()=>{
 const registry=seedRegistry(users);assert.ok(registry.profiles.some(profile=>profile.role==='farmacia'));assert.ok(registry.sectors?.some(sector=>sector.role==='farmacia'))
 const created=saveManagedUser(registry,admin,{name:'Farmacêutica',email:'farmacia@teste.com',password:'123456',active:true,profileId:'profile-farmacia',sectorId:'sector-farmacia'},undefined)
 const user=resolveRegistryUser(created.users.find(user=>user.email==='farmacia@teste.com')!,created.profiles)
 assert.ok(canAccessRoute('/farmacia/separacao',user));assert.ok(!hasUserPermission(user,'view_clinical_data'));assert.ok(!canAccessRoute('/admin',user))
 assert.equal(projectPatientForUser(patients[0],user)?.clinicalEvaluation,undefined)
 assert.throws(()=>saveProduct(emptyPharmacy(),{name:'Teste',code:'01',unit:'unidade',minimum:0,expiryAlertDays:30,active:true},{...user,permissions:[]}),/permissão/)
})
test('existing registry migration adds pharmacy and upgrades only canonical admin once',()=>{
 const registry=seedRegistry(users);delete registry.pharmacyVersion;registry.profiles=registry.profiles.filter(profile=>profile.role!=='farmacia').map(profile=>({...profile,permissions:profile.permissions.filter(permission=>permission!=='manage_pharmacy')}));registry.sectors=registry.sectors?.filter(sector=>sector.role!=='farmacia')
 const upgraded=upgradeWardRegistry(registry);assert.ok(upgraded.profiles.some(profile=>profile.role==='farmacia'));assert.ok(upgraded.profiles.find(profile=>profile.role==='admin')?.permissions.includes('manage_pharmacy'))
 const revoked={...upgraded,profiles:upgraded.profiles.map(profile=>({...profile,permissions:profile.permissions.filter(permission=>permission!=='manage_pharmacy')}))};assert.ok(!upgradeWardRegistry(revoked).profiles.find(profile=>profile.role==='admin')?.permissions.includes('manage_pharmacy'))
 const custom={...registry,profiles:registry.profiles.map(profile=>profile.role==='admin'?{...profile,permissions:['view_dashboard_admin']}:profile)};assert.ok(!upgradeWardRegistry(custom).profiles.find(profile=>profile.role==='admin')?.permissions.includes('manage_pharmacy'))
})
test('suppliers, products and programs validate identities and preserve existing stock references',()=>{
 const state=stock();assert.equal(state.suppliers[0].cnpj,'12345678000190');assert.equal(normalizeCnpj('12.345.678/0001-90'),'12345678000190')
 assert.throws(()=>saveSupplier(state,{...state.suppliers[0]},admin),/já cadastrado/)
 assert.throws(()=>saveProduct(state,{...state.products[0]},admin),/já cadastrado/)
 assert.throws(()=>saveProduct(state,{...state.products[0],minimum:-1},admin,state.products[0].id),/inteiros/)
 assert.throws(()=>saveProgram(state,{...state.programs[0]},admin),/já cadastrado/)
 const edited=saveProduct(state,{...state.products[0],name:'Nome atualizado',active:false},admin,state.products[0].id);assert.equal(edited.lots[0].productId,edited.products[0].id)
 assert.throws(()=>enterStock(edited,{productId:edited.products[0].id,lot:'novo',location:'01',expiry:'2099-01-01',quantity:1,reason:'Teste'},admin),/ativo/)
})
test('entries track physical balances, supplier, health program, location and immutable movement author',()=>{
 const state=stock();const lot=state.lots[0];assert.equal(lot.quantity,20);assert.equal(state.movements[0].kind,'entrada');assert.equal(state.movements[0].by,admin.id)
 const next=enterStock(state,{...lot,quantity:4,reason:'Reposição'},pharmacist);assert.equal(next.lots.length,1);assert.equal(next.lots[0].quantity,24);assert.equal(state.lots[0].quantity,20)
 assert.throws(()=>enterStock(state,{...lot,quantity:-4,reason:'Erro'},admin),/quantidade/)
 assert.throws(()=>enterStock(state,{...lot,quantity:1.5,reason:'Erro'},admin),/inteira/)
 assert.throws(()=>enterStock(state,{...lot,expiry:'2099-02-30',quantity:1,reason:'Erro'},admin),/validade/)
 assert.throws(()=>enterStock(state,{...lot,quantity:1,reason:'Erro',movementId:state.movements[0].id},admin),/já registrada/)
})
test('separation reserves stock; nursing administration deducts exactly once and keeps an atomic medication journal',()=>{
 const state=stock();const prescription=order();const next=separateMedication(state,prescription,state.lots[0].id,2,pharmacist)
 assert.equal(next.lots[0].quantity,20);assert.equal(availableQuantity(next,next.lots[0]),18)
 assert.throws(()=>separateMedication(next,prescription,state.lots[0].id,1,pharmacist),/já foi separada/)
 assert.throws(()=>removeStock(next,next.lots[0].id,19,'Saída','Outro setor',admin),/reservado/)
 const administered=administerMedication(prescription,new Date().toISOString(),nurse);const deducted=deductAdministeredMedication(next,administered,nurse)
 assert.equal(deducted.lots[0].quantity,18);assert.equal(availableQuantity(deducted,deducted.lots[0]),18);assert.equal(deducted.separations[0].status,'administrada');assert.equal(deducted.administrations?.[0].id,prescription.id);assert.equal(deducted.movements.filter(item=>item.orderId===prescription.id).length,1)
 assert.throws(()=>deductAdministeredMedication(deducted,administered,nurse),/já foi registrada/)
 assert.throws(()=>deductAdministeredMedication(state,administered,nurse),/farmácia separar/)
 assert.throws(()=>deductAdministeredMedication(next,administered,admin),/autorizada/)
})
test('cancellation releases reservations; cancelled prescriptions cannot be separated',()=>{
 const state=stock();const prescription=order();const next=separateMedication(state,prescription,state.lots[0].id,2,admin)
 assert.throws(()=>cancelSeparation(next,next.separations[0].id,' ',admin),/justificativa/)
 const cancelled=cancelSeparation(next,next.separations[0].id,'Devolvido antes da administração',admin);assert.equal(availableQuantity(cancelled,cancelled.lots[0]),20);assert.equal(cancelled.movements.length,1)
 const reconciled=reconcileSeparations(next,[{...prescription,status:'cancelada'}]);assert.equal(availableQuantity(reconciled,reconciled.lots[0]),20)
 assert.throws(()=>separateMedication(state,{...prescription,status:'cancelada'},state.lots[0].id,1,admin),/aguardando/)
})
test('expired products cannot be separated or administered and require destination and reason for disposal',()=>{
 const state=stock();const expired={...state,lots:state.lots.map(lot=>({...lot,expiry:'2000-01-01'}))};const prescription=order()
 assert.equal(productAvailable(expired,expired.products[0].id),0)
 assert.throws(()=>separateMedication(expired,prescription,expired.lots[0].id,1,admin),/vencido/)
 assert.throws(()=>removeStock(expired,expired.lots[0].id,1,'Saída','Setor',admin),/descarte/)
 assert.throws(()=>removeStock(expired,expired.lots[0].id,1,'Vencido','',admin,'descarte'),/destinação/)
 const disposed=removeStock(expired,expired.lots[0].id,20,'Vencido','Lixo hospitalar',admin,'descarte');assert.equal(disposed.lots[0].quantity,0);assert.equal(disposed.movements[1].destination,'Lixo hospitalar')
 const separated=separateMedication(state,prescription,state.lots[0].id,1,admin);assert.throws(()=>deductAdministeredMedication({...separated,lots:expired.lots},administerMedication(prescription,new Date().toISOString(),nurse),nurse),/vencido/)
 assert.equal(pharmacyDay(new Date('2026-10-21T02:00:00Z')),'2026-10-20')
})
test('CSV supports quoted text and line breaks, exports movements, imports atomically and prevents replay',()=>{
 const state=stock();const lot=state.lots[0];const row=['import-1','entrada',state.products[0].code,lot.lot,lot.location,lot.expiry,3,state.suppliers[0].cnpj,state.programs[0].name,'Reposição; documento "123"\ncom observação','','2026-10-01T12:00:00Z']
 const csv=pharmacyCsv(MOVEMENT_HEADERS,[row]);assert.equal(parsePharmacyCsv(csv)[1][9],row[9]);const imported=importPharmacyMovements(state,csv,admin);assert.equal(imported.imported,1);assert.equal(imported.state.lots[0].quantity,23);assert.equal(importPharmacyMovements(imported.state,csv,admin).skipped,1)
 const invalid=pharmacyCsv(MOVEMENT_HEADERS,[row,[...row.slice(0,6),99,...row.slice(7)].map((value,index)=>index===0?'bad':index===1?'saida':value)])
 assert.throws(()=>importPharmacyMovements(state,invalid,admin),/Nenhuma movimentação/);assert.equal(state.lots[0].quantity,20)
 assert.equal(movementRows(imported.state).length,2)
 assert.throws(()=>parsePharmacyCsv('"não fechado'),/não fechadas/)
 assert.throws(()=>importPharmacyMovements(state,pharmacyCsv(MOVEMENT_HEADERS,[[...row.slice(0,1),'administracao',...row.slice(2)]]),admin),/enfermagem/)
})
