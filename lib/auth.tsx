'use client'
import {previewProfile,type ProfilePreview} from './profile-preview'
import {defaultSectors,type HospitalSector} from './sectors'
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { User } from './types'
import { normalizeUserProfile, type BackendProfile } from './medical-profile'
import { hasUserPermission } from './permissions'
import { users as initialUsers } from './data/users'
import { ACCESS_KEY, upgradeWardRegistry, seedRegistry, resolveRegistryUser, saveManagedUser, saveAccessProfile, saveHospitalSector,saveOwnWorkplace,type WorkplaceDraft, type AccessRegistry, type AccessProfile, type UserDraft } from './admin-access'
interface AuthContextType {
 preview:ProfilePreview|null;startPreview:(profileId:string,professionalId?:string)=>string;stopPreview:()=>void;
 saveWorkplace:(draft:WorkplaceDraft)=>Promise<void>;sectors:HospitalSector[];saveSector:(draft:Omit<HospitalSector,'id'>,id?:string)=>Promise<void>; user:User|null; users:User[]; profiles:AccessProfile[]; isLoading:boolean
 login:(email:string,password:string)=>Promise<{success:boolean;error?:string;redirectPath?:string}>
 logout:()=>void; setSession:(user:BackendProfile|null)=>void; hasPermission:(permission:string)=>boolean; getRedirectPath:()=>string
 saveUser:(draft:UserDraft,id?:string)=>Promise<void>
 saveProfile:(draft:Omit<AccessProfile,'id'|'builtIn'>,id?:string)=>Promise<void>
}
const AuthContext=createContext<AuthContextType|undefined>(undefined)
const STORAGE_KEY='hospital-auth-user'
function sessionFor(session:User|null,registry:AccessRegistry):User|null {
 if(!session)return null
 const managed=registry.users.find(user=>user.id===session.id)
 if(managed&&!managed.active)return null
 // Effective backend grants remain authoritative for a backend-owned session.
 if(session.permissions!==undefined&&!session.profileId)return normalizeUserProfile({...session,...(managed?{sectorId:managed.sectorId,department:managed.department,consultationRoom:managed.consultationRoom,workplaceAvailability:managed.workplaceAvailability}:{})})
 const effective=resolveRegistryUser(managed||session,registry.profiles)
 return effective.active?effective:null
}
export function AuthProvider({children}:{children:ReactNode}) {
 const [preview,setPreview]=useState<ProfilePreview|null>(null)
 const [session,setSessionState]=useState<User|null>(null)
 const [registry,setRegistry]=useState<AccessRegistry>(()=>seedRegistry(initialUsers))
 const [isLoading,setIsLoading]=useState(true)
 useEffect(()=>{
  const stored=localStorage.getItem(ACCESS_KEY);const loaded:AccessRegistry=upgradeWardRegistry(stored?JSON.parse(stored):seedRegistry(initialUsers))
  localStorage.setItem(ACCESS_KEY,JSON.stringify(loaded));setRegistry(loaded)
  try{const current=localStorage.getItem(STORAGE_KEY);if(current)setSessionState(normalizeUserProfile(JSON.parse(current)))}catch{localStorage.removeItem(STORAGE_KEY)}
  try{setPreview(JSON.parse(sessionStorage.getItem('medrisk-profile-preview')||'null'))}catch{sessionStorage.removeItem('medrisk-profile-preview')}
  setIsLoading(false)
  const sync=(event:StorageEvent)=>{if(event.key===ACCESS_KEY&&event.newValue)setRegistry(JSON.parse(event.newValue));if(event.key===STORAGE_KEY)setSessionState(event.newValue?normalizeUserProfile(JSON.parse(event.newValue)):null)}
  window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)
 },[])
 const administrator=useMemo(()=>sessionFor(session,registry),[session,registry])
 const user=useMemo(()=>{if(preview)try{return previewProfile(administrator,registry.profiles.find(profile=>profile.id===preview.profileId),registry.users,preview.professionalId)}catch{return administrator}return administrator},[administrator,preview,registry])
 useEffect(()=>{if(!isLoading&&preview&&!user?.previewMode){setPreview(null);sessionStorage.removeItem('medrisk-profile-preview')}},[isLoading,preview,user])
 const setSession=useCallback((input:BackendProfile|null)=>{
  setPreview(null);sessionStorage.removeItem('medrisk-profile-preview');const next=input?normalizeUserProfile(input):null;setSessionState(next)
  if(next)localStorage.setItem(STORAGE_KEY,JSON.stringify(next));else localStorage.removeItem(STORAGE_KEY)
 },[])
 const login=useCallback(async(email:string,password:string)=>{
  const current:AccessRegistry=JSON.parse(localStorage.getItem(ACCESS_KEY)||JSON.stringify(registry))
  const found=current.users.find(user=>user.email.toLowerCase()===email.trim().toLowerCase()&&user.password===password)
  const effective=found?resolveRegistryUser(found,current.profiles):null
  if(!effective?.active)return {success:false,error:'E-mail ou senha incorretos, ou acesso inativo.'}
  sessionStorage.removeItem('medrisk-workplace-confirmed-'+effective.id);setRegistry(current);setSession(effective);return {success:true,redirectPath:`/${effective.role}`}
 },[registry,setSession])
 const mutate=useCallback(async(change:(registry:AccessRegistry,actor:User)=>AccessRegistry,action:'usuario_gerenciado'|'perfil_gerenciado'|'setor_gerenciado'|'local_medico_atualizado',description:string)=>{
  if(preview)throw new Error('Visualização de perfil: alterações não são permitidas.')
  const run=()=>{
   const current:AccessRegistry=JSON.parse(localStorage.getItem(ACCESS_KEY)||JSON.stringify(registry))
   const actor=sessionFor(session,current);if(!actor)throw new Error('Faça login para gerenciar acessos.')
   const next=change(current,actor);localStorage.setItem(ACCESS_KEY,JSON.stringify(next));setRegistry(next)
   const logs=JSON.parse(localStorage.getItem('hospital-audit')||'[]');logs.push({id:crypto.randomUUID(),action,description,details:description,userId:actor.id,userName:actor.name,userRole:actor.role,timestamp:new Date().toISOString()});localStorage.setItem('hospital-audit',JSON.stringify(logs));window.dispatchEvent(new Event('medrisk-audit-updated'))
  }
  if(navigator.locks)await navigator.locks.request('medrisk-access',run);else run()
 },[registry,session,preview])
 const saveUser=useCallback((draft:UserDraft,id?:string)=>mutate((current,actor)=>saveManagedUser(current,actor,draft,id),'usuario_gerenciado',`${id?'Atualizado':'Criado'} usuário: ${draft.name}`),[mutate])
 const saveProfile=useCallback((draft:Omit<AccessProfile,'id'|'builtIn'>,id?:string)=>mutate((current,actor)=>saveAccessProfile(current,actor,draft,id),'perfil_gerenciado',`${id?'Atualizado':'Criado'} perfil: ${draft.name}`),[mutate])
 const saveSector=useCallback((draft:Omit<HospitalSector,'id'>,id?:string)=>mutate((current,actor)=>saveHospitalSector(current,actor,draft,id),'setor_gerenciado',`${id?'Atualizado':'Criado'} setor: ${draft.name}`),[mutate])
 const saveWorkplace=useCallback((draft:WorkplaceDraft)=>mutate((current,actor)=>saveOwnWorkplace(current,actor,draft),'local_medico_atualizado',`Local de atendimento atualizado: ${draft.consultationRoom}`),[mutate])
 const hasPermission=useCallback((permission:string)=>hasUserPermission(user?.previewMode?{...user,previewMode:false}:user,permission),[user])
 const startPreview=useCallback((profileId:string,professionalId?:string)=>{const profile=registry.profiles.find(profile=>profile.id===profileId);const effective=previewProfile(administrator,profile,registry.users,professionalId);const next={profileId,professionalId:effective.id.startsWith('preview-')?undefined:effective.id};sessionStorage.setItem('medrisk-profile-preview',JSON.stringify(next));setPreview(next);return '/'+effective.role},[administrator,registry])
 const stopPreview=useCallback(()=>{sessionStorage.removeItem('medrisk-profile-preview');setPreview(null)},[])
 const logout=useCallback(()=>setSession(null),[setSession])
 const getRedirectPath=useCallback(()=>user?`/${user.role}`:'/login',[user])
 const directory=useMemo(()=>registry.users.map(item=>({...resolveRegistryUser(item,registry.profiles),password:''})),[registry])
 return <AuthContext.Provider value={{preview,startPreview,stopPreview,saveWorkplace,sectors:registry.sectors||defaultSectors(),saveSector,user,users:directory,profiles:registry.profiles,isLoading,login,logout,setSession,hasPermission,getRedirectPath,saveUser,saveProfile}}>{children}</AuthContext.Provider>
}
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be used within an AuthProvider');return context}
