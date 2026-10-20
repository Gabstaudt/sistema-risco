'use client'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from './auth'
import {UNIT_SETTINGS_KEY,defaultUnitSettings,validateUnitSettings,type UnitSettings} from './unit-settings'
const EVENT='medrisk-unit-updated'
export function useUnit(){const {user}=useAuth();const [unit,setUnit]=useState(defaultUnitSettings);const [ready,setReady]=useState(false)
 useEffect(()=>{const load=()=>{setUnit(JSON.parse(localStorage.getItem(UNIT_SETTINGS_KEY)||'null')||defaultUnitSettings());setReady(true)};load();const sync=(event:StorageEvent)=>{if(event.key===UNIT_SETTINGS_KEY||event.key===null)load()};window.addEventListener('storage',sync);window.addEventListener(EVENT,load);return()=>{window.removeEventListener('storage',sync);window.removeEventListener(EVENT,load)}},[])
 const save=useCallback(async(draft:UnitSettings)=>{if(!user||!ready)throw new Error('Aguarde o carregamento.');const next=validateUnitSettings(draft,user);const run=()=>{localStorage.setItem(UNIT_SETTINGS_KEY,JSON.stringify(next));setUnit(next);window.dispatchEvent(new Event(EVENT));const logs=JSON.parse(localStorage.getItem('hospital-audit')||'[]');logs.push({id:crypto.randomUUID(),action:'unidade_configurada',description:`Dados da unidade atualizados: ${next.name}`,details:`Dados da unidade atualizados: ${next.name}`,userId:user.id,userName:user.name,userRole:user.role,timestamp:next.updatedAt});localStorage.setItem('hospital-audit',JSON.stringify(logs));window.dispatchEvent(new Event('medrisk-audit-updated'))};if(navigator.locks)await navigator.locks.request('medrisk-unit',run);else run()},[user,ready]);return {unit,ready,save}
}
export async function unitImage(file:File,logo=false):Promise<string>{
 if(!['image/png','image/jpeg'].includes(file.type)||!file.size||file.size>5*1024*1024)throw new Error('Selecione uma imagem PNG ou JPEG de até 5 MB.')
 const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,(logo?600:1200)/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível processar a imagem.');if(!logo){context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height)}context.drawImage(bitmap,0,0,canvas.width,canvas.height);const result=canvas.toDataURL(logo?'image/png':'image/jpeg',0.8);if(result.length>1_500_000)throw new Error('Imagem muito grande. Escolha uma imagem menor.');return result}finally{bitmap.close()}
}
