import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {users} from './data/users'
import {seedRegistry,saveManagedUser,saveAccessProfile,resolveRegistryUser,permissionCatalog} from './admin-access'
import {hasUserPermission} from './permissions'
const registry=seedRegistry(users);const admin=resolveRegistryUser(registry.users.find(user=>user.role==='admin')!,registry.profiles)
const doctor={name:'Dra. Nova Médica',email:'nova@hospital.com',password:'segredo123',active:true,profileId:'profile-clinico',professionalRegistration:'CRM TESTE / PA',consultationRoom:'Sala 07'}
test('administrator creates and edits physicians with a managed profile, unique identity and room',()=>{
 const created=saveManagedUser(registry,admin,doctor);const user=created.users.find(user=>user.email===doctor.email)!
 assert.equal(user.professionalGroup,'medico');assert.equal(user.medicalSpecialty,'clinico');assert.equal(user.consultationRoom,'Sala 07');assert.equal(hasUserPermission(resolveRegistryUser(user,created.profiles),'clinical_evaluation'),true)
 const edited=saveManagedUser(created,admin,{...doctor,name:'Nome atualizado',password:''},user.id).users.find(item=>item.id===user.id)!
 assert.equal(edited.password,doctor.password);assert.equal(edited.id,user.id)
 assert.throws(()=>saveManagedUser(created,admin,doctor),/e-mail já/)
 assert.throws(()=>saveManagedUser(registry,admin,{...doctor,professionalRegistration:''}),/CRM/)
 assert.throws(()=>saveManagedUser(registry,{...admin,permissions:[]},doctor),/permissão/)
})
test('all profile types are present and custom profile changes affect linked users without overwriting explicit backend grants',()=>{
 assert.equal(registry.profiles.length,9)
 const edited=saveAccessProfile(registry,admin,{name:'Clínico restrito',role:'clinico',active:true,permissions:['view_dashboard_clinico','view_patient_basic']})
 const profile=edited.profiles.find(profile=>profile.name==='Clínico restrito')!
 const withUser=saveManagedUser(edited,admin,{...doctor,profileId:profile.id})
 const user=withUser.users.find(user=>user.email===doctor.email)!
 assert.equal(hasUserPermission(resolveRegistryUser(user,withUser.profiles),'request_exams'),false)
 const changed=saveAccessProfile(withUser,admin,{...profile,permissions:[...profile.permissions,'request_exams']},profile.id)
 assert.equal(hasUserPermission(resolveRegistryUser(user,changed.profiles),'request_exams'),true)
 assert.equal(hasUserPermission({...user,permissions:[]},'request_exams'),false)
 const disabled=saveAccessProfile(changed,admin,{...profile,active:false},profile.id)
 assert.equal(resolveRegistryUser(user,disabled.profiles).active,false)
 assert.throws(()=>saveManagedUser(disabled,admin,{...doctor,profileId:profile.id}),/perfil ativo/)
 assert.ok(permissionCatalog().includes('manage_profiles'))
})
test('last administrator and profiles in use cannot be accidentally broken',()=>{
 const current=registry.users.find(user=>user.role==='admin')!
 assert.throws(()=>saveManagedUser(registry,admin,{...current,profileId:current.profileId!,active:false},current.id),/ao menos um administrador/)
 const profile=registry.profiles.find(profile=>profile.role==='admin')!
 assert.throws(()=>saveAccessProfile(registry,admin,{...profile,permissions:[]},profile.id),/ao menos um administrador/)
 assert.throws(()=>saveAccessProfile(registry,admin,{...profile,active:false},profile.id),/ao menos um administrador/)
 assert.throws(()=>saveAccessProfile(registry,admin,{...profile,role:'clinico'},profile.id),/perfil em uso/)
 assert.throws(()=>saveAccessProfile(registry,users[0],{...profile,name:'Novo'}),/permissão/)
})
