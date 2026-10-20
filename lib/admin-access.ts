import {DOCTOR_WORK_PERMISSIONS} from './medical-care'
import {isDoctor} from './medical-profile'
import {defaultSectors,type HospitalSector} from './sectors'
import { ROLE_LABELS, ROLE_PERMISSIONS, type User, type UserRole } from './types'
import { getUserPermissions, hasUserPermission } from './permissions'
import { normalizeUserProfile, professionalHierarchy } from './medical-profile'

export interface AccessProfile { id:string; name:string; role:UserRole; permissions:string[]; active:boolean; builtIn?:boolean }
export interface AccessRegistry { pharmacyVersion?:number; medicalWorkVersion?:number; sectors?:HospitalSector[]; triageVersion?:number; receptionVersion?:number; users:User[]; profiles:AccessProfile[] }
export type UserDraft = Pick<User,'name'|'email'|'password'|'active'|'department'|'consultationRoom'|'professionalRegistration'> & { profileId:string;sectorId?:string }
export const ACCESS_KEY = 'medrisk-access-registry'
export const defaultProfiles = ():AccessProfile[] => (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(role=>({id:`profile-${role}`,name:ROLE_LABELS[role],role,permissions:[...new Set(getUserPermissions({id:'template',role,active:true} as User))].filter(permission=>permission!=='view_all_data'),active:true,builtIn:true}))
export const PERMISSION_LABELS:Record<string,string> = {
 manage_pharmacy:'Gerenciar farmácia, estoque e separação de medicamentos',
 view_ward_care:'Consultar pacientes e registros da enfermaria',ward_admit:'Registrar entrada na enfermaria',ward_record_vitals:'Registrar sinais vitais na enfermaria',ward_observations:'Registrar observações na enfermaria',ward_reassess:'Reavaliar paciente na enfermaria',ward_discharge:'Registrar alta da enfermaria',manage_own_workplace:'Alterar o próprio consultório e setor',medical_consultation:'Registrar e finalizar consulta médica',transfer_patient:'Encaminhar paciente para outro médico ou setor',issue_admission_documents:'Emitir fichas de internação',view_medical_reports:'Consultar relatórios dos próprios atendimentos',cancel_triage_attendance:'Cancelar atendimento aguardando triagem',forward_triage_sector:'Encaminhar da triagem para outro setor',print_triage_sheet:'Imprimir ficha de triagem',manage_attendance:'Atualizar e encerrar atendimentos',print_blank_attendance:'Imprimir ficha em branco',manage_profiles:'Gerenciar perfis e permissões',manage_users:'Gerenciar usuários',system_settings:'Acessar configurações',view_reports:'Consultar e exportar relatórios',view_audit:'Consultar auditoria',view_surgery_audit:'Auditar cirurgias',manage_sectors:'Gerenciar setores',
 view_patient_basic:'Consultar cadastro do paciente',view_triage_data:'Consultar triagem',view_clinical_data:'Consultar avaliações médicas',view_exam_results:'Consultar exames e resultados',view_patient_history:'Consultar histórico de atendimentos',view_patient_audit:'Consultar histórico de execução',view_all_data:'Acesso a todos os dados clínicos (inclui as permissões de leitura)',view_patients_list:'Listar pacientes',view_patient_minimal:'Consultar ficha do paciente',search_patient:'Pesquisar pacientes',
 create_patient:'Cadastrar pacientes',edit_patient_basic:'Editar cadastro do paciente',manage_reception_queue:'Gerenciar fila da recepção',call_triage_ticket:'Chamar senhas da triagem',forward_to_triage:'Encaminhar à triagem',register_vital_signs:'Registrar sinais vitais',edit_vital_signs:'Editar sinais vitais',register_complaint:'Registrar queixas',forward_to_clinical:'Encaminhar ao clínico',
 clinical_evaluation:'Realizar avaliação clínica',create_exam_type:'Cadastrar e gerenciar tipos de exames',request_exams:'Solicitar exames',forward_to_lab:'Encaminhar ao laboratório',forward_to_cardiologist:'Encaminhar à cardiologia',forward_to_surgeon:'Encaminhar à cirurgia',return_to_triage:'Retornar à triagem',prescribe_medication:'Solicitar medicação',administer_medication:'Administrar medicação',request_surgical_risk:'Solicitar risco cirúrgico',request_specialist_assessment:'Solicitar avaliação especializada',
 issue_prescription:'Emitir receitas',issue_certificate:'Emitir atestados',print_patient_record:'Imprimir prontuário',print_patient_history:'Imprimir histórico',print_medication_sheet:'Imprimir ficha de medicação',print_exams:'Imprimir exames',
 view_pending_exams:'Consultar exames pendentes',register_exam_result:'Registrar resultados de exames',update_exam_status:'Registrar coleta e realização de exames',classify_cardiac_risk:'Avaliar risco cardiológico',approve_for_surgery:'Emitir parecer cardiológico favorável',contraindicate_surgery:'Contraindicar cirurgia',generate_report:'Emitir relatório',classify_asa:'Classificar ASA',request_additional_evaluation:'Solicitar avaliação complementar',approve_for_anesthesia:'Aprovar anestesia',contraindicate_anesthesia:'Contraindicar anestesia',record_surgery:'Registrar cirurgia e pós-operatório',calculate_scores:'Usar calculadora de risco',classify_risk:'Classificar risco cirúrgico',approve_surgery:'Liberar cirurgia',return_to_clinical:'Retornar ao clínico',return_to_lab:'Retornar ao laboratório',
}
for(const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) PERMISSION_LABELS[`view_dashboard_${role}`]=`Acessar área: ${ROLE_LABELS[role]}`
export const permissionCatalog = ()=>[...new Set([...Object.values(ROLE_PERMISSIONS).flat(),...defaultProfiles().flatMap(profile=>profile.permissions)])].sort((a,b)=>(PERMISSION_LABELS[a]||a).localeCompare(PERMISSION_LABELS[b]||b,'pt-BR'))
export function resolveRegistryUser(user:User,profiles:AccessProfile[]):User {
 if(!user.profileId)return normalizeUserProfile(user)
 const profile=profiles.find(profile=>profile.id===user.profileId)
 return normalizeUserProfile({...user,role:profile?.role||user.role,active:user.active&&Boolean(profile?.active),permissions:profile?.permissions||[]})
}
export function seedRegistry(users:User[]):AccessRegistry {return {pharmacyVersion:1,medicalWorkVersion:1,sectors:defaultSectors(),triageVersion:1,receptionVersion:1,profiles:defaultProfiles(),users:users.map(user=>({...user,sectorId:'sector-'+user.role,department:defaultSectors().find(s=>s.role===user.role)?.name,profileId:`profile-${user.role}`}))}}
function assertAdmin(actor:User,permission:string){if(!hasUserPermission(actor,permission))throw new Error('Sem permissão para realizar esta alteração.')}
function preserveAdmin(registry:AccessRegistry){
 if(!registry.users.some(user=>{const effective=resolveRegistryUser(user,registry.profiles);return effective.active&&effective.role==='admin'&&['manage_users','manage_profiles','system_settings','view_dashboard_admin'].every(permission=>hasUserPermission(effective,permission))}))throw new Error('Mantenha ao menos um administrador ativo com acesso a usuários, perfis e configurações.')
}
export function saveManagedUser(registry:AccessRegistry,actor:User,draft:UserDraft,id?:string):AccessRegistry {
 assertAdmin(actor,'manage_users')
 const previous=id?registry.users.find(user=>user.id===id):undefined
 if(id&&!previous)throw new Error('Usuário não encontrado.')
 const profile=registry.profiles.find(profile=>profile.id===draft.profileId)
 if(!profile||!profile.active)throw new Error('Selecione um perfil ativo.')
 const sector=(registry.sectors||defaultSectors()).find(sector=>sector.id===(draft.sectorId||previous?.sectorId||'sector-'+profile.role))
 if(!sector?.active||sector.role!==profile.role)throw new Error('Selecione um setor ativo compatível com o perfil.')
 const email=draft.email.trim().toLowerCase()
 if(!draft.name.trim()||!/^\S+@\S+\.\S+$/.test(email))throw new Error('Informe nome e e-mail válidos.')
 if(registry.users.some(user=>user.id!==id&&user.email.toLowerCase()===email))throw new Error('Este e-mail já está cadastrado.')
 if((!previous||draft.password)&&draft.password.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.')
 if(professionalHierarchy(profile.role).group==='medico'&&(draft.active||!previous)&&!draft.professionalRegistration?.trim())throw new Error('Informe CRM e UF do médico.')
 const next:User=normalizeUserProfile({...previous,...draft,sectorId:sector.id,department:sector.name,email,name:draft.name.trim(),password:draft.password||previous?.password||'',id:previous?.id||crypto.randomUUID(),role:profile.role,profileId:profile.id,permissions:undefined,createdAt:previous?.createdAt||new Date().toISOString()})
 const result={...registry,users:[...registry.users.filter(user=>user.id!==next.id),next]};preserveAdmin(result);return result
}
export function saveAccessProfile(registry:AccessRegistry,actor:User,draft:Omit<AccessProfile,'id'|'builtIn'>,id?:string):AccessRegistry {
 assertAdmin(actor,'manage_profiles')
 const previous=id?registry.profiles.find(profile=>profile.id===id):undefined
 if(id&&!previous)throw new Error('Perfil não encontrado.')
 if(!draft.name.trim()||!Object.hasOwn(ROLE_PERMISSIONS,draft.role))throw new Error('Informe nome e tipo válidos para o perfil.')
 if(registry.profiles.some(profile=>profile.id!==id&&profile.name.trim().toLowerCase()===draft.name.trim().toLowerCase()))throw new Error('Já existe um perfil com esse nome.')
 if(previous&&previous.role!==draft.role&&registry.users.some(user=>user.profileId===id))throw new Error('O tipo de um perfil em uso não pode ser alterado. Crie outro perfil.')
 const catalog=permissionCatalog();if(draft.permissions.some(permission=>!catalog.includes(permission)))throw new Error('Permissão inválida.')
 const profile:AccessProfile={...draft,id:previous?.id||crypto.randomUUID(),builtIn:previous?.builtIn,name:draft.name.trim(),permissions:[...new Set(draft.permissions)]}
 const result={...registry,profiles:[...registry.profiles.filter(item=>item.id!==profile.id),profile]};preserveAdmin(result);return result
}

export function upgradeAccessRegistry(registry:AccessRegistry):AccessRegistry {
 if((registry.receptionVersion||0)>=1)return registry
 const added=['manage_attendance','print_blank_attendance']
 return {...registry,receptionVersion:1,profiles:registry.profiles.map(profile=>{
  const canonical=defaultProfiles().find(item=>item.id===profile.id)
  if(!profile.builtIn||!canonical||!['recepcao','admin'].includes(profile.role))return profile
  const old=canonical.permissions.filter(p=>!added.includes(p)).sort().join('|')
  const existing=profile.permissions.filter(p=>p!=='view_all_data'&&!added.includes(p)).sort().join('|')
  return old===existing?{...profile,permissions:canonical.permissions}:profile
 })}
}

export function upgradeTriageRegistry(registry:AccessRegistry):AccessRegistry {
 const previous=upgradeAccessRegistry(registry)
 if(previous.triageVersion)return previous
 const added=['cancel_triage_attendance','forward_triage_sector','print_triage_sheet']
 return {...previous,triageVersion:1,profiles:previous.profiles.map(profile=>{
  const canonical=defaultProfiles().find(item=>item.id===profile.id)
  if(profile.role!=='triagem'||!profile.builtIn||!canonical)return profile
  const existing=profile.permissions.filter(p=>p!=='view_all_data').sort().join('|')
  const legacy=canonical.permissions.filter(p=>!added.includes(p)).sort().join('|')
  return existing===legacy?{...profile,permissions:canonical.permissions}:profile
 })}
}

export function upgradeSectorRegistry(registry:AccessRegistry):AccessRegistry {
 const current=upgradeTriageRegistry(registry)
 if(current.sectors)return current
 const sectors=defaultSectors()
 const users=current.users.map(user=>{
  let sector=sectors.find(sector=>sector.role===user.role&&(!user.department||sector.name===user.department))
  if(!sector){sector={id:'sector-legacy-'+crypto.randomUUID(),name:user.department!,role:user.role,active:true};sectors.push(sector)}
  return {...user,sectorId:sector.id,department:sector.name}
 })
 return {...current,sectors,users}
}
export function saveHospitalSector(registry:AccessRegistry,actor:User,draft:Omit<HospitalSector,'id'>,id?:string):AccessRegistry{
 assertAdmin(actor,'manage_sectors')
 const sectors=registry.sectors||defaultSectors()
 const previous=id?sectors.find(s=>s.id===id):undefined
 if(id&&!previous)throw new Error('Setor não encontrado.')
 const name=draft.name.trim()
 if(!name||!Object.hasOwn(ROLE_PERMISSIONS,draft.role))throw new Error('Informe nome e fluxo do setor.')
 if(sectors.some(sector=>sector.id!==id&&sector.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Já existe um setor com esse nome.')
 if(previous&&registry.users.some(user=>(user.sectorId||'sector-'+user.role)===id&&user.active)&&(!draft.active||draft.role!==previous.role))throw new Error('Realoque os usuários ativos antes de desativar ou alterar o fluxo do setor.')
 const sector={...draft,id:previous?.id||crypto.randomUUID(),name}
 return {...registry,sectors:[...sectors.filter(s=>s.id!==id),sector],users:registry.users.map(user=>(user.sectorId||'sector-'+user.role)===id?{...user,department:name}:user)}
}

export function upgradeMedicalRegistry(registry:AccessRegistry):AccessRegistry{
 const current=upgradeSectorRegistry(registry)
 if(current.medicalWorkVersion)return current
 return {...current,medicalWorkVersion:1,profiles:current.profiles.map(profile=>{
  const canonical=defaultProfiles().find(item=>item.id===profile.id)
  if(!profile.builtIn||!canonical||!['clinico','cardiologista','anestesista','cirurgiao'].includes(profile.role))return profile
  const old=canonical.permissions.filter(p=>!DOCTOR_WORK_PERMISSIONS.includes(p)).sort().join('|')
  const existing=profile.permissions.filter(p=>p!=='view_all_data').sort().join('|')
  return old===existing?{...profile,permissions:canonical.permissions}:profile
 })}
}
export interface WorkplaceDraft{sectorId:string;consultationRoom:string;availability?:User['workplaceAvailability']}
export function saveOwnWorkplace(registry:AccessRegistry,actor:User,draft:WorkplaceDraft):AccessRegistry{
 if(!isDoctor(actor)||!hasUserPermission(actor,'manage_own_workplace'))throw new Error('Sem permissão para alterar o local de atendimento.')
 const sector=(registry.sectors||defaultSectors()).find(sector=>sector.id===draft.sectorId&&sector.active&&sector.role===actor.role)
 if(!sector)throw new Error('Selecione um setor ativo compatível com sua especialidade.')
 if(!draft.consultationRoom.trim())throw new Error('Informe o número ou nome do consultório.')
 if(draft.consultationRoom.trim().length>60)throw new Error('O consultório deve ter no máximo 60 caracteres.')
 if(draft.availability&&!['disponivel','em_atendimento','indisponivel'].includes(draft.availability))throw new Error('Disponibilidade inválida.')
 if(!registry.users.some(user=>user.id===actor.id&&user.active))throw new Error('Usuário não disponível para atualização.')
 return {...registry,users:registry.users.map(user=>user.id===actor.id?{...user,sectorId:sector.id,department:sector.name,consultationRoom:draft.consultationRoom.trim(),...(draft.availability?{workplaceAvailability:draft.availability}:{})}:user)}
}

export function upgradeWardRegistry(registry:AccessRegistry):AccessRegistry{
 const current=upgradeMedicalRegistry(registry)
 const profiles=current.profiles.some(profile=>profile.id==='profile-enfermaria')?current.profiles:[...current.profiles,defaultProfiles().find(profile=>profile.role==='enfermaria')!]
 const sectors=(current.sectors||defaultSectors()).some(sector=>sector.id==='sector-enfermaria')?current.sectors!:[...(current.sectors||[]),defaultSectors().find(sector=>sector.role==='enfermaria')!]
 const pharmacyProfile=defaultProfiles().find(profile=>profile.role==='farmacia')!
 const withPharmacy=profiles.some(profile=>profile.id===pharmacyProfile.id)?profiles:[...profiles,pharmacyProfile]
 const pharmacySector=defaultSectors().find(sector=>sector.role==='farmacia')!
 const allSectors=sectors.some(sector=>sector.id===pharmacySector.id)?sectors:[...sectors,pharmacySector]
 if((current.pharmacyVersion||0)>=1)return {...current,profiles:withPharmacy,sectors:allSectors}
 const canonicalAdmin=defaultProfiles().find(profile=>profile.id==='profile-admin')!
 const upgraded=withPharmacy.map(profile=>{const old=canonicalAdmin.permissions.filter(permission=>permission!=='manage_pharmacy');return profile.id==='profile-admin'&&profile.builtIn&&profile.name===canonicalAdmin.name&&profile.permissions.length===old.length&&profile.permissions.every(permission=>old.includes(permission))?{...profile,permissions:[...profile.permissions,'manage_pharmacy']}:profile})
 return {...current,pharmacyVersion:1,profiles:upgraded,sectors:allSectors}
}
