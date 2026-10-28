'use client'
import {useState} from 'react'
import {useData} from '@/lib/data-context'
import {TICKET_CATEGORIES,type TicketCategory,type ArrivalTicket} from '@/lib/tickets'
import {BrandLogo} from '@/components/shared/brand-logo'
import {Button} from '@/components/ui/button'
export default function TicketKiosk(){const {issueTicket,isDataReady}=useData();const [ticket,setTicket]=useState<ArrivalTicket>();const [busy,setBusy]=useState(false);const [error,setError]=useState('')
async function issue(category:TicketCategory){setBusy(true);setError('');try{setTicket(await issueTicket(category))}catch(error){setError(error instanceof Error?error.message:'Não foi possível emitir a senha.')}finally{setBusy(false)}}
return <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-8 p-6"><BrandLogo className="w-64" /><h1 className="text-3xl font-bold">Retire sua senha</h1>{ticket?<div role="status" className="space-y-5 rounded-2xl border bg-card p-8 text-center"><p>Sua senha para atendimento</p><p className="font-mono text-7xl font-bold">{ticket.number}</p><p>{TICKET_CATEGORIES[ticket.category].label}</p><p>Aguarde a chamada da recepção. Guarde esta mesma senha para a triagem.</p><Button className="h-14 text-base" onClick={()=>setTicket(undefined)}>Concluir</Button></div>:<div className="grid gap-4 sm:grid-cols-3">{(Object.keys(TICKET_CATEGORIES) as TicketCategory[]).map(category=><Button key={category} variant="outline" className={`h-32 whitespace-normal text-xl ${TICKET_CATEGORIES[category].className}`} disabled={busy||!isDataReady} onClick={()=>issue(category)}>{TICKET_CATEGORIES[category].label}</Button>)}</div>}{error&&<p role="alert" className="text-destructive">{error}</p>}</main>}
