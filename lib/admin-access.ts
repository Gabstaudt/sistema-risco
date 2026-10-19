import { ROLE_LABELS, ROLE_PERMISSIONS, type User, type UserRole } from './types'
import { getUserPermissions, hasUserPermission } from './permissions'
import { normalizeUserProfile, professionalHierarchy } from './medical-profile'

export interface AccessProfile { id:string; name:string; role:UserRole; permissions:string[]; active:boolean; builtIn?:boolean }
export interface AccessRegistry { users:User[]; profiles:AccessProfile[] }
export type UserDraft = Pick<User,'name'|'email'|'password'|'active'|'department'|'consultationRoom'|'professionalRegistration'> & { profileId:string }
export const ACCESS_KEY = 'medrisk-access-registry'
export const defaultProfiles = ():AccessProfile[] => (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(role=>({id:`profile-${role}`,name:ROLE_LABELS[role],role,permissions:[...new Set(getUserPermissions({id:'template',role,active:true} as User))].filter(permission=>permission!=='view_all_data'),active:true,builtIn:true}))
export const PERMISSION_LABELS:Record<string,string> = {
 manage_profiles:'Gerenciar perfis e permissões',manage_users:'Gerenciar usuários',system_settings:'Acessar configurações',view_reports:'Consultar e exportar relatórios',view_audit:'Consultar auditoria',view_surgery_audit:'Auditar cirurgias',manage_sectors:'Gerenciar setores',
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
export function seedRegistry(users:User[]):AccessRegistry {return {profiles:defaultProfiles(),users:users.map(user=>({...user,profileId:`profile-${user.role}`}))}}
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
 const email=draft.email.trim().toLowerCase()
 if(!draft.name.trim()||!/^\S+@\S+\.\S+$/.test(email))throw new Error('Informe nome e e-mail válidos.')
 if(registry.users.some(user=>user.id!==id&&user.email.toLowerCase()===email))throw new Error('Este e-mail já está cadastrado.')
 if((!previous||draft.password)&&draft.password.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.')
 if(professionalHierarchy(profile.role).group==='medico'&&(draft.active||!previous)&&!draft.professionalRegistration?.trim())throw new Error('Informe CRM e UF do médico.')
 const next:User=normalizeUserProfile({...previous,...draft,email,name:draft.name.trim(),password:draft.password||previous?.password||'',id:previous?.id||crypto.randomUUID(),role:profile.role,profileId:profile.id,permissions:undefined,createdAt:previous?.createdAt||new Date().toISOString()})
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
