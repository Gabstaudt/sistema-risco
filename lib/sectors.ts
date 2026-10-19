import type {UserRole,User} from './types'
export interface HospitalSector {id:string;name:string;role:UserRole;active:boolean}
export const defaultSectors=():HospitalSector[]=>Object.entries({recepcao:'Recepção',triagem:'Triagem',clinico:'Clínica',laboratorio:'Laboratório',cardiologista:'Cardiologia',anestesista:'Anestesia',cirurgiao:'Cirurgia',admin:'Administração'}).map(([role,name])=>({id:'sector-'+role,name,role:role as UserRole,active:true}))
export const userSectorId=(user:User)=>user.sectorId||'sector-'+user.role
