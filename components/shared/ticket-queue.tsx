'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { sortTickets, TICKET_CATEGORIES, type TicketCategory, type TicketCallStage } from '@/lib/tickets'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Textarea} from '@/components/ui/textarea'
import {Label} from '@/components/ui/label'
import { RecentTriagePatients } from './recent-triage-patients'
const titles = { recepcao: 'Recepção', triagem: 'Triagem', clinico: 'Atendimento clínico' }
export function TicketQueue({ stage }: { stage: TicketCallStage }) {
 const { user,hasPermission } = useAuth()
 const { tickets, patients, closeAttendance,callTicket, issueTicket, markTicketAbsent, beginTicketTriage, beginTicketClinical, isDataReady } = useData()
 const router = useRouter()
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [cancelId,setCancelId]=useState('');const [reason,setReason]=useState('')
 const [search, setSearch] = useState('')
 const [routeFilter,setRouteFilter]=useState('todos')
 const waiting = sortTickets(tickets.filter(ticket => ticket.stage === `aguardando_${stage}` && (stage!=='clinico'||routeFilter==='todos'||(patients.find(p=>p.id===ticket.patientId)?.attendanceRoute||'com_triagem')===routeFilter)), stage)
 const active = tickets.find(ticket => ticket.calledBy === user?.id && [ `chamada_${stage}`, `em_${stage}` ].includes(ticket.stage))
 const absent = tickets.filter(ticket => ticket.stage === `ausente_${stage}`)
 const forwarded = sortTickets(tickets.filter(ticket => ['aguardando_triagem','chamada_triagem','em_triagem','ausente_triagem'].includes(ticket.stage)), 'triagem')
 const name = (id?: string) => patients.find(patient => patient.id === id)?.nomeCompleto || 'Paciente encaminhado'
 async function run(action: () => Promise<unknown>) {
   setBusy(true); setError('')
   try { await action() } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível atualizar a fila.') } finally { setBusy(false) }
 }
 async function start() {
   if (!active) return
   if (stage === 'recepcao') return
   const id = stage === 'triagem' ? await beginTicketTriage(active.id) : await beginTicketClinical(active.id)
   router.push(stage === 'triagem' ? `/triagem/atendimento/${id}` : `/clinico/avaliar/${id}`)
 }
 const inProgress = active?.stage.startsWith('em_')
 return <>
  <Header breadcrumbs={[{ label: titles[stage] }, { label: 'Chamada de senhas' }]} />
  <main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{titles[stage]} — chamada de senhas</h1>
      <div className="flex flex-wrap gap-2">{stage==='triagem'&&<><Button asChild variant="outline" className="h-12"><Link href="/triagem/pacientes">Pesquisar pacientes</Link></Button>{hasPermission('create_patient')&&<Button asChild className="h-12"><Link href="/triagem/cadastro">Novo atendimento</Link></Button>}</>}<Button asChild variant="outline" className="h-12"><Link href="/painel" target="_blank">Painel de chamadas</Link></Button><Button className="h-12 px-6" disabled={busy || !isDataReady || Boolean(active) || !waiting.length} onClick={() => run(() => callTicket(stage,waiting[0]?.id))}>Chamar próxima senha</Button></div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive p-4 text-destructive">{error}</p>}
    <Card className={active ? 'border-primary bg-primary/5' : ''}>
      <CardHeader><CardTitle>{inProgress ? 'Em atendimento' : 'Chamada atual'}</CardTitle></CardHeader>
      <CardContent>
        {active ? <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="status" aria-live="polite"><p className="font-mono text-4xl font-bold">{active.number}</p>{active.patientId && <p className="mt-1 font-medium">{name(active.patientId)}</p>}<p className="mt-1 text-sm text-muted-foreground">{TICKET_CATEGORIES[active.category].label}</p></div>
          <div className="flex flex-wrap gap-2">
            {!inProgress && <><Button variant="outline" className="h-12" disabled={busy} onClick={() => run(() => callTicket(stage, active.id))}>{stage==='clinico'?'Chamar novamente':'Chamar paciente'}</Button><Button variant="outline" className="h-12" disabled={busy} onClick={() => run(() => markTicketAbsent(active.id))}>Paciente não compareceu</Button></>}
            {stage === 'recepcao' ? <Button asChild className="h-12"><Link href={`/recepcao/novo?senha=${active.id}`}>Iniciar atendimento</Link></Button> : <Button className="h-12" disabled={busy} onClick={() => run(start)}>{inProgress ? 'Continuar atendimento' : 'Iniciar atendimento'}</Button>}
          </div>
        </div> : <p className="text-muted-foreground">Nenhuma senha em atendimento.</p>}
      </CardContent>
    </Card>
    {stage==='clinico'&&<div role="group" aria-label="Filtrar encaminhamento" className="flex flex-wrap gap-2">{[['todos','Todos'],['com_triagem','Com triagem'],['sem_triagem','Sem triagem · branca']].map(([value,label])=><Button key={value} variant={routeFilter===value?'default':'outline'} aria-pressed={routeFilter===value} onClick={()=>setRouteFilter(value)}>{label}</Button>)}</div>}
    <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Aguardando chamada · {waiting.length}</CardTitle><Input className="h-11 w-full sm:max-w-sm" aria-label="Buscar senha ou paciente" placeholder="Buscar senha ou paciente" value={search} onChange={event => setSearch(event.target.value)} /></CardHeader><CardContent>
      <ul className="divide-y">{waiting.filter(ticket => `${ticket.number} ${ticket.patientId ? name(ticket.patientId) : ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((ticket) => <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-4"><span className="font-mono text-2xl font-bold">{ticket.number}</span><div>{ticket.patientId && <p className="break-words font-medium">{name(ticket.patientId)}</p>}<div className="mt-1 flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-xs ${TICKET_CATEGORIES[ticket.category].className}`}>{TICKET_CATEGORIES[ticket.category].label}</span>{patients.find(p=>p.id===ticket.patientId)?.attendanceRoute==='sem_triagem'&&<span className="rounded border bg-white px-2 py-1 text-xs text-slate-900">Branca · sem triagem</span>}<span className="text-sm text-muted-foreground">Chegada: {new Date(ticket.issuedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" className="h-11" disabled={busy || !isDataReady || Boolean(inProgress)} onClick={() => run(() => callTicket(stage, ticket.id))}>{stage==='clinico'?'Chamar esta senha':'Chamar paciente'}</Button>{stage==='triagem'&&ticket.patientId&&hasPermission('cancel_triage_attendance')&&<Button variant="outline" className="h-11" disabled={busy} onClick={()=>{setCancelId(ticket.patientId!);setReason('');setError('')}}>Cancelar atendimento</Button>}</div>
      </li>)}{!waiting.length && <li className="py-6 text-center text-muted-foreground">Nenhuma senha aguardando.</li>}</ul>
    </CardContent></Card>
    {stage === 'recepcao' && <details className="rounded-xl border p-4"><summary className="cursor-pointer py-2 font-semibold">Emitir senha e acompanhar encaminhamentos</summary><div className="mt-4 flex flex-wrap gap-2">{(Object.keys(TICKET_CATEGORIES) as TicketCategory[]).map(category => <Button key={category} variant="outline" className="h-12" disabled={busy || !isDataReady} onClick={() => run(() => issueTicket(category))}>Emitir {TICKET_CATEGORIES[category].label.toLowerCase()}</Button>)}<Button asChild variant="outline" className="h-12"><Link href="/senha" target="_blank">Retirada de senhas</Link></Button></div><ul className="mt-4 divide-y">{forwarded.map(ticket => <li key={ticket.id} className="flex flex-wrap justify-between gap-3 py-3"><span><strong className="mr-3 font-mono">{ticket.number}</strong>{name(ticket.patientId)}</span><span className="text-sm text-muted-foreground">{ticket.stage === 'em_triagem' ? 'Em triagem' : ticket.stage === 'chamada_triagem' ? 'Chamado na triagem' : ticket.stage === 'ausente_triagem' ? 'Não compareceu' : 'Aguardando triagem'}</span></li>)}</ul></details>}
    {absent.length > 0 && <details className="rounded-xl border p-4"><summary className="cursor-pointer py-2 font-semibold">Não compareceram · {absent.length}</summary><ul className="divide-y">{absent.map(ticket => <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="font-mono text-xl font-bold">{ticket.number}</span><Button variant="outline" className="h-11" disabled={busy} onClick={() => run(() => markTicketAbsent(ticket.id, true))}>Retornar à fila</Button></li>)}</ul></details>}
    {stage === 'triagem' && <details className="rounded-xl border p-4"><summary className="cursor-pointer py-2 font-semibold">Últimos pacientes atendidos</summary><div className="mt-4"><RecentTriagePatients /></div></details>}
    <Dialog open={Boolean(cancelId)} onOpenChange={value=>{if(!busy&&!value)setCancelId('')}}><DialogContent><DialogHeader><DialogTitle>Cancelar atendimento na triagem</DialogTitle><DialogDescription>{name(cancelId)}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={event=>{event.preventDefault();void run(async()=>{await closeAttendance(cancelId,'cancelamento',reason);setCancelId('')})}}><Label htmlFor="triage-cancel-reason">Justificativa *</Label><Textarea id="triage-cancel-reason" required value={reason} onChange={event=>setReason(event.target.value)}/>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>setCancelId('')}>Voltar</Button><Button disabled={busy||!reason.trim()}>Confirmar cancelamento</Button></div></form></DialogContent></Dialog>
  </main>
 </>
}
