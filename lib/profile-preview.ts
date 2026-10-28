import type {User} from './types'
import type {AccessProfile} from './admin-access'
import {hasUserPermission} from './permissions'
export interface ProfilePreview {profileId:string;professionalId?:string}
export function previewProfile(actor:User|null,profile:AccessProfile|undefined,users:User[],professionalId?:string):User{
 if(!actor||actor.role!=='admin'||actor.previewMode||!hasUserPermission(actor,'manage_profiles'))throw new Error('Somente o administrador pode visualizar outro perfil.')
 if(!profile?.active||!profile.permissions.includes(`view_dashboard_${profile.role}`))throw new Error('Selecione um perfil ativo com acesso à sua área inicial.')
 const reference=professionalId?users.find(user=>user.id===professionalId&&user.active&&user.profileId===profile.id):users.find(user=>user.active&&user.profileId===profile.id)
 if(professionalId&&!reference)throw new Error('Profissional de referência inválido.')
 return {...(reference||actor),id:reference?.id||`preview-${profile.id}`,password:'',name:reference?.name||`Visualização: ${profile.name}`,role:profile.role,profileId:profile.id,permissions:profile.permissions,active:true,sectorId:reference?.sectorId||`sector-${profile.role}`,department:reference?.department||profile.name,previewMode:true}
}
