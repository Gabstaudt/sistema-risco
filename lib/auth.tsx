'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { User } from './types'
import { normalizeUserProfile, type BackendProfile } from './medical-profile'
import { hasUserPermission } from './permissions'
import { users as initialUsers } from './data/users'
import { ACCESS_KEY, upgradeAccessRegistry, seedRegistry, resolveRegistryUser, saveManagedUser, saveAccessProfile, type AccessRegistry, type AccessProfile, type UserDraft } from './admin-access'
interface AuthContextType {
 user:User|null; users:User[]; profiles:AccessProfile[]; isLoading:boolean
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
 if(session.permissions!==undefined&&!session.profileId)return normalizeUserProfile(session)
 const effective=resolveRegistryUser(managed||session,registry.profiles)
 return effective.active?effective:null
}
export function AuthProvider({children}:{children:ReactNode}) {
 const [session,setSessionState]=useState<User|null>(null)
 const [registry,setRegistry]=useState<AccessRegistry>(()=>seedRegistry(initialUsers))
 const [isLoading,setIsLoading]=useState(true)
 useEffect(()=>{
  const stored=localStorage.getItem(ACCESS_KEY);const loaded:AccessRegistry=upgradeAccessRegistry(stored?JSON.parse(stored):seedRegistry(initialUsers))
  localStorage.setItem(ACCESS_KEY,JSON.stringify(loaded));setRegistry(loaded)
  try{const current=localStorage.getItem(STORAGE_KEY);if(current)setSessionState(normalizeUserProfile(JSON.parse(current)))}catch{localStorage.removeItem(STORAGE_KEY)}
  setIsLoading(false)
  const sync=(event:StorageEvent)=>{if(event.key===ACCESS_KEY&&event.newValue)setRegistry(JSON.parse(event.newValue));if(event.key===STORAGE_KEY)setSessionState(event.newValue?normalizeUserProfile(JSON.parse(event.newValue)):null)}
  window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)
 },[])
 const user=useMemo(()=>sessionFor(session,registry),[session,registry])
 const setSession=useCallback((input:BackendProfile|null)=>{
  const next=input?normalizeUserProfile(input):null;setSessionState(next)
  if(next)localStorage.setItem(STORAGE_KEY,JSON.stringify(next));else localStorage.removeItem(STORAGE_KEY)
 },[])
 const login=useCallback(async(email:string,password:string)=>{
  const current:AccessRegistry=JSON.parse(localStorage.getItem(ACCESS_KEY)||JSON.stringify(registry))
  const found=current.users.find(user=>user.email.toLowerCase()===email.trim().toLowerCase()&&user.password===password)
  const effective=found?resolveRegistryUser(found,current.profiles):null
  if(!effective?.active)return {success:false,error:'E-mail ou senha incorretos, ou acesso inativo.'}
  setRegistry(current);setSession(effective);return {success:true,redirectPath:`/${effective.role}`}
 },[registry,setSession])
 const mutate=useCallback(async(change:(registry:AccessRegistry,actor:User)=>AccessRegistry,action:'usuario_gerenciado'|'perfil_gerenciado',description:string)=>{
  const run=()=>{
   const current:AccessRegistry=JSON.parse(localStorage.getItem(ACCESS_KEY)||JSON.stringify(registry))
   const actor=sessionFor(session,current);if(!actor)throw new Error('Faça login para gerenciar acessos.')
   const next=change(current,actor);localStorage.setItem(ACCESS_KEY,JSON.stringify(next));setRegistry(next)
   const logs=JSON.parse(localStorage.getItem('hospital-audit')||'[]');logs.push({id:crypto.randomUUID(),action,description,details:description,userId:actor.id,userName:actor.name,userRole:actor.role,timestamp:new Date().toISOString()});localStorage.setItem('hospital-audit',JSON.stringify(logs));window.dispatchEvent(new Event('medrisk-audit-updated'))
  }
  if(navigator.locks)await navigator.locks.request('medrisk-access',run);else run()
 },[registry,session])
 const saveUser=useCallback((draft:UserDraft,id?:string)=>mutate((current,actor)=>saveManagedUser(current,actor,draft,id),'usuario_gerenciado',`${id?'Atualizado':'Criado'} usuário: ${draft.name}`),[mutate])
 const saveProfile=useCallback((draft:Omit<AccessProfile,'id'|'builtIn'>,id?:string)=>mutate((current,actor)=>saveAccessProfile(current,actor,draft,id),'perfil_gerenciado',`${id?'Atualizado':'Criado'} perfil: ${draft.name}`),[mutate])
 const hasPermission=useCallback((permission:string)=>hasUserPermission(user,permission),[user])
 const logout=useCallback(()=>setSession(null),[setSession])
 const getRedirectPath=useCallback(()=>user?`/${user.role}`:'/login',[user])
 const directory=useMemo(()=>registry.users.map(item=>({...resolveRegistryUser(item,registry.profiles),password:''})),[registry])
 return <AuthContext.Provider value={{user,users:directory,profiles:registry.profiles,isLoading,login,logout,setSession,hasPermission,getRedirectPath,saveUser,saveProfile}}>{children}</AuthContext.Provider>
}
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be used within an AuthProvider');return context}
