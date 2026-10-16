'use client'
import {useState} from 'react'
import {useAuth} from '@/lib/auth'
import {useData} from '@/lib/data-context'
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Button} from '@/components/ui/button'
import {users} from '@/lib/data/users'
import type {MedicationDraft} from '@/lib/lab-operations'
const blank:MedicationDraft={medication:'',dose:'',route:'',instructions:''}
export function localTime(date=new Date()){const parts=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')];return `${parts.join('-')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`}
export function MedicationOrders({patientId,prescribe=false,showAllInitially=false}:{patientId?:string;prescribe?:boolean;showAllInitially?:boolean}){
 const {hasPermission}=useAuth();const {medicationOrders,patients,prescribeMedicationOrder,recordMedicationAdministration}=useData()
 const [draft,setDraft]=useState(blank);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [times,setTimes]=useState<Record<string,string>>({});const [showDone,setShowDone]=useState(showAllInitially)
 const orders=medicationOrders.filter(order=>(!patientId||order.patientId===patientId)&&(showDone||order.status==='solicitada')).sort((a,b)=>Date.parse(b.requestedAt)-Date.parse(a.requestedAt))
 async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action()}catch(error){setError(error instanceof Error?error.message:'Não foi possível registrar.')}finally{setBusy(false)}}
 return <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Medicações {showDone?'registradas':'a administrar'}</CardTitle><Button variant="outline" onClick={()=>setShowDone(!showDone)}>{showDone?'Ver aguardando':'Ver todas'}</Button></CardHeader><CardContent className="space-y-4">
  {prescribe&&patientId&&hasPermission('prescribe_medication')&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(['medication','dose','route','instructions'] as const).map(key=><div key={key} className="space-y-2"><Label htmlFor={`medication-${key}`}>{ {medication:'Medicação *',dose:'Dose prescrita *',route:'Via de administração *',instructions:'Orientações'}[key] }</Label><Input id={`medication-${key}`} className="h-12" value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></div>)}<Button className="h-12" disabled={busy||!draft.medication.trim()||!draft.dose.trim()||!draft.route.trim()} onClick={()=>run(async()=>{await prescribeMedicationOrder(patientId,draft);setDraft(blank)})}>Solicitar medicação</Button></div>}
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {!orders.length&&<p className="py-4 text-muted-foreground">Nenhuma medicação nesta lista.</p>}
  <ul className="divide-y">{orders.map(order=><li key={order.id} className="space-y-3 py-4"><div><p className="font-semibold">{order.medication} · {order.dose} · {order.route}</p>{!patientId&&<p>{patients.find(patient=>patient.id===order.patientId)?.nomeCompleto || 'Paciente não encontrado'}</p>}<p className="text-sm text-muted-foreground">Solicitada em {new Date(order.requestedAt).toLocaleString('pt-BR')} · {users.find(user=>user.id===order.requestedBy)?.name || 'Responsável não informado'}</p>{order.instructions&&<p className="whitespace-pre-wrap break-words">{order.instructions}</p>}</div>
   {order.status==='administrada'?<p className="rounded-lg bg-primary/5 p-3 font-medium">Administrada em {new Date(order.administeredAt!).toLocaleString('pt-BR')} · {users.find(user=>user.id===order.administeredBy)?.name || 'Responsável não informado'}</p>:hasPermission('administer_medication')?<div className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor={`admin-time-${order.id}`}>Data e hora da administração</Label><Input id={`admin-time-${order.id}`} type="datetime-local" step="1" className="h-12" value={times[order.id]||''} onChange={event=>setTimes({...times,[order.id]:event.target.value})}/></div><Button variant="outline" className="h-12" onClick={()=>setTimes({...times,[order.id]:localTime()})}>Usar horário atual</Button><Button className="h-12" disabled={busy||!times[order.id]} onClick={()=>run(async()=>{await recordMedicationAdministration(order.id,new Date(times[order.id]).toISOString());setShowDone(true)})}>Registrar como administrada</Button></div>:<p className="font-medium text-amber-800">Aguardando administração</p>}
  </li>)}</ul>
 </CardContent></Card>
}
