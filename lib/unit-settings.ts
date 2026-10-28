import type {User} from './types'
import {hasUserPermission} from './permissions'
export const UNIT_SETTINGS_KEY='medrisk-unit-settings'
export interface UnitSettings {id:string;name:string;legalName:string;cnes:string;cnpj:string;phone:string;email:string;address:string;municipality:string;uf:string;logo:string;image:string;updatedAt?:string;updatedBy?:string}
export const defaultUnitSettings=():UnitSettings=>({id:'unit-main',name:'Hospital Central',legalName:'',cnes:'',cnpj:'',phone:'',email:'',address:'',municipality:'',uf:'',logo:'',image:''})
export function validateUnitSettings(draft:UnitSettings,user:User):UnitSettings{
 if(!hasUserPermission(user,'system_settings'))throw new Error('Sem permissão para configurar a unidade.')
 const next=Object.fromEntries(Object.entries(draft).map(([key,value])=>[key,typeof value==='string'?value.trim():value])) as unknown as UnitSettings
 if(!next.name)throw new Error('Informe o nome da unidade.')
 if(next.cnes&&!/^\d{7}$/.test(next.cnes))throw new Error('O CNES deve conter 7 dígitos.')
 if(next.uf&&!/^[A-Z]{2}$/.test(next.uf))throw new Error('Informe a UF com duas letras maiúsculas.')
 if(next.email&&!/^\S+@\S+\.\S+$/.test(next.email))throw new Error('Informe um e-mail válido.')
 for(const key of ['logo','image'] as const)if(next[key]&&(!/^data:image\/(png|jpeg);base64,[a-z\d+/=]+$/i.test(next[key])||next[key].length>1_500_000))throw new Error('Use uma imagem PNG ou JPEG válida de até 1 MB após o processamento.')
 return {...next,id:'unit-main',updatedAt:new Date().toISOString(),updatedBy:user.id}
}
