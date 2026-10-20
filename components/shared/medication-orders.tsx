'use client'
import Link from 'next/link'
import {usePharmacy} from '@/lib/use-pharmacy'
import {pharmacyDay} from '@/lib/pharmacy'
import {useRef,useState} from 'react'
import {useAuth} from '@/lib/auth'
import {useData} from '@/lib/data-context'
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Button} from '@/components/ui/button'
import type {MedicationDraft} from '@/lib/lab-operations'
const blank:MedicationDraft={medication:'',dose:'',route:'',instructions:''}
export function localTime(date=new Date()){const parts=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')];return `${parts.join('-')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`}
export function MedicationOrders({patientId,prescribe=false,showAllInitially=false,administrationEnabled=true}:{patientId?:string;prescribe?:boolean;showAllInitially?:boolean;administrationEnabled?:boolean}){
 const { user,users,hasPermission}=useAuth();const {medicationOrders,patients,prescribeMedicationOrder,recordMedicationAdministration}=useData()
 const {state:pharmacy}=usePharmacy()
 const separationFor=(id:string)=>pharmacy.separations.find(item=>item.orderId===id&&item.status==='separada')
 const validSeparation=(id:string)=>{const separation=separationFor(id);const lot=pharmacy.lots.find(lot=>lot.id===separation?.lotId);return !!lot&&lot.expiry>=pharmacyDay()}
 const running=useRef(false)
 const [draft,setDraft]=useState(blank);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [times,setTimes]=useState<Record<string,string>>({});const [showDone,setShowDone]=useState(showAllInitially)
 const orders=medicationOrders.filter(order=>(!patientId||order.patientId===patientId)&&(showDone||order.status==='solicitada')).sort((a,b)=>Date.parse(b.requestedAt)-Date.parse(a.requestedAt))
 async function run(action:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setError('');try{await action()}catch(error){setError(error instanceof Error?error.message:'Não foi possível registrar.')}finally{running.current=false;setBusy(false)}}
 return <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Medicações {showDone?'registradas':'a administrar'}</CardTitle><Button variant="outline" onClick={()=>setShowDone(!showDone)}>{showDone?'Ver aguardando':'Ver todas'}</Button></CardHeader><CardContent className="space-y-4">
  {prescribe&&patientId&&hasPermission('prescribe_medication')&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(['medication','dose','route','instructions'] as const).map(key=><div key={key} className="space-y-2"><Label htmlFor={`medication-${key}`}>{ {medication:'Medicação *',dose:'Dose prescrita *',route:'Via de administração *',instructions:'Orientações'}[key] }</Label><Input id={`medication-${key}`} className="h-12" value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></div>)}<Button className="h-12" disabled={busy||!draft.medication.trim()||!draft.dose.trim()||!draft.route.trim()} onClick={()=>run(async()=>{await prescribeMedicationOrder(patientId,draft);setDraft(blank);setShowDone(true)})}>Solicitar medicação</Button></div>}
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {!orders.length&&<p className="py-4 text-muted-foreground">Nenhuma medicação nesta lista.</p>}
  <ul className="divide-y">{orders.map(order=><li key={order.id} className="space-y-3 py-4"><div><p className="font-semibold">{order.medication} · {order.dose} · {order.route}</p>{!patientId&&<p>{patients.find(patient=>patient.id===order.patientId)?.nomeCompleto || 'Paciente não encontrado'}</p>}<p className="text-sm text-muted-foreground">Solicitada em {new Date(order.requestedAt).toLocaleString('pt-BR')} · {users.find(user=>user.id===order.requestedBy)?.name || 'Responsável não informado'}</p>{order.instructions&&<p className="whitespace-pre-wrap break-words">{order.instructions}</p>}</div>
   <div className="flex flex-wrap gap-2">{hasPermission('print_medication_sheet')&&<Button asChild variant="outline" className="h-11"><Link href={`/paciente/${order.patientId}/imprimir?tipo=solicitacao_medicacao&medicacao=${order.id}`} target="_blank">Imprimir solicitação</Link></Button>}<Button asChild variant="outline" className="h-11"><Link href={`/paciente/${order.patientId}/medicacoes`}>Abrir ficha de medicação</Link></Button></div>
   {order.status==='solicitada'&&hasPermission('administer_medication')&&<p className="rounded-lg border p-3 text-sm">{(()=>{const separation=separationFor(order.id);const lot=pharmacy.lots.find(lot=>lot.id===separation?.lotId);const product=pharmacy.products.find(product=>product.id===lot?.productId);return separation&&lot?`Separada pela farmácia: ${separation.quantity} ${product?.unit||'unidade(s)'} · ${product?.name} · lote ${lot.lot}${lot.expiry<pharmacyDay()?' — vencido; solicitar nova separação':''}`:'Aguardando separação pela farmácia.'})()}</p>}
   {order.status==='cancelada'?<p className="rounded-lg border p-3">Cancelada: {order.cancelledReason}</p>:order.status==='administrada'?<p className="rounded-lg bg-primary/5 p-3 font-medium">Administrada em {new Date(order.administeredAt!).toLocaleString('pt-BR')} · {users.find(user=>user.id===order.administeredBy)?.name || 'Responsável não informado'}</p>:hasPermission('administer_medication')&&administrationEnabled&&(user?.role!=='enfermaria'||patients.some(patient=>patient.id===order.patientId&&patient.wardStays?.some(stay=>!stay.dischargedAt&&stay.encounterEntryAt===patient.dataEntrada)&&Date.parse(order.requestedAt)>=Date.parse(patient.dataEntrada)))?<div className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor={`admin-time-${order.id}`}>Data e hora da administração</Label><Input id={`admin-time-${order.id}`} type="datetime-local" step="1" className="h-12" value={times[order.id]||''} onChange={event=>setTimes({...times,[order.id]:event.target.value})}/></div><Button variant="outline" className="h-12" onClick={()=>setTimes({...times,[order.id]:localTime()})}>Usar horário atual</Button><Button className="h-12" disabled={busy||!times[order.id]||!validSeparation(order.id)} onClick={()=>run(async()=>{await recordMedicationAdministration(order.id,new Date(times[order.id]).toISOString());setShowDone(true)})}>Registrar como administrada</Button></div>:<p className="font-medium text-amber-800">Aguardando administração</p>}
  </li>)}</ul>
 </CardContent></Card>
}
