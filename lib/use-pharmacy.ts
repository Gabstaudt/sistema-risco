'use client'
import {useState,useEffect,useCallback} from 'react'
import {useAuth} from './auth'
import {hasUserPermission} from './permissions'
import {emptyPharmacy,reconcileSeparations,PHARMACY_KEY,MEDICATION_STORAGE_KEY,type PharmacyState} from './pharmacy'
import {PHARMACY_EVENT,readPharmacy,readMedicationOrders,writePharmacy,medicationPharmacyLock} from './pharmacy-storage'
import type {MedicationOrder,User} from './types'
export function usePharmacy(){
 const {user}=useAuth();const [state,setState]=useState(emptyPharmacy);const [ready,setReady]=useState(false)
 const readUser=user?.previewMode?{...user,previewMode:false}:user
 const permitted=hasUserPermission(readUser,'manage_pharmacy')||hasUserPermission(readUser,'administer_medication')||hasUserPermission(readUser,'view_reports')
 const refresh=useCallback(()=>{if(permitted)setState(reconcileSeparations(readPharmacy(),readMedicationOrders()));else setState(emptyPharmacy());setReady(true)},[permitted])
 useEffect(()=>{refresh();const onStorage=(event:StorageEvent)=>{if(!event.key||[PHARMACY_KEY,MEDICATION_STORAGE_KEY].includes(event.key))refresh()};window.addEventListener('storage',onStorage);window.addEventListener(PHARMACY_EVENT,refresh);return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener(PHARMACY_EVENT,refresh)}},[refresh])
 const transact=useCallback(async(change:(state:PharmacyState,user:User,orders:MedicationOrder[])=>PharmacyState,description='Alteração na farmácia')=>{
  if(!ready||!user||!hasUserPermission(user,'manage_pharmacy'))throw new Error('Sem permissão para gerenciar a farmácia.')
  await medicationPharmacyLock(()=>{const orders=readMedicationOrders();const current=reconcileSeparations(readPharmacy(),orders);const next=change(current,user,orders);const details=JSON.stringify(Object.fromEntries((['suppliers','products','programs','lots','movements','separations'] as const).map(key=>[key,next[key].filter(record=>JSON.stringify(record)!==JSON.stringify(current[key].find(item=>item.id===record.id))).map(record=>({before:current[key].find(item=>item.id===record.id),after:record}))]).filter(([,changes])=>(changes as unknown[]).length)));const logged={...next,events:[...(next.events||[]),{id:crypto.randomUUID(),at:new Date().toISOString(),by:user.id,action:description,details}]};writePharmacy(logged);setState(logged)})
 },[user,ready])
 return {state,ready,transact}
}
