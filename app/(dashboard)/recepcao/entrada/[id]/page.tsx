'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
export default function ExistingPatientIntake() {
 const {id}=useParams<{id:string}>();const router=useRouter();const {user}=useAuth()
 const {getPatientById,tickets,forwardExistingPatient,isDataReady}=useData()
 const [ticketId,setTicketId]=useState('');const [complaint,setComplaint]=useState('');const [notes,setNotes]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
 useEffect(()=>{setTicketId(new URLSearchParams(window.location.search).get('senha') || '')},[])
 const patient=getPatientById(id);const ticket=tickets.find(item=>item.id===ticketId)
 const available=Boolean(patient && ticket && ticket.stage==='chamada_recepcao' && ticket.calledBy===user?.id && ['concluido','liberado','contraindicado'].includes(patient.status))
 async function submit(event:React.FormEvent){event.preventDefault();if(!available || busy)return;setBusy(true);setError('');try{await forwardExistingPatient(ticketId,id,{complaint,notes});router.push('/recepcao/fila')}catch(error){setError(error instanceof Error?error.message:'Não foi possível registrar a entrada.');setBusy(false)}}
 if(!isDataReady)return <p className="p-6" role="status">Carregando cadastro...</p>
 return <><Header breadcrumbs={[{label:'Senhas da recepção',href:'/recepcao/fila'},{label:'Nova entrada'}]} /><main className="flex min-h-[calc(100svh-4rem)] w-full flex-1 flex-col gap-6 p-4 sm:p-6">
  <div><h1 className="text-2xl font-bold">Registrar entrada</h1><p className="mt-1 text-muted-foreground">Paciente já cadastrado</p></div>
  {patient?<Card><CardHeader><CardTitle>{patient.nomeCompleto}</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Prontuário</dt><dd className="font-semibold">{patient.prontuario}</dd></div><div><dt className="text-sm text-muted-foreground">CPF</dt><dd className="font-semibold">{patient.cpf}</dd></div><div><dt className="text-sm text-muted-foreground">Senha chamada</dt><dd className="font-mono text-xl font-bold">{ticket?.number || 'Não informada'}</dd></div></dl></CardContent></Card>:<p role="alert">Paciente não encontrado.</p>}
  {!available && <p role="alert" className="rounded-lg border p-4">Chame uma senha na recepção e selecione um paciente com atendimento anterior encerrado.</p>}
  <form onSubmit={submit} className="flex flex-1 flex-col gap-5"><Card className="flex-1"><CardHeader><CardTitle>Queixas desta entrada</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="intake-complaint" className="text-base">Queixas / motivo do atendimento *</Label><Textarea id="intake-complaint" className="min-h-40 text-base md:text-base" value={complaint} onChange={event=>setComplaint(event.target.value)} placeholder="Descreva o motivo da vinda ao hospital" required disabled={!available||busy} /></div><div className="space-y-2"><Label htmlFor="intake-notes" className="text-base">Observações da entrada (opcional)</Label><Textarea id="intake-notes" className="min-h-28 text-base md:text-base" value={notes} onChange={event=>setNotes(event.target.value)} disabled={!available||busy} /></div></CardContent></Card>
  {error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button asChild variant="outline" className="h-14 text-base"><Link href="/recepcao/fila">Voltar à fila</Link></Button><Button type="submit" className="h-14 text-base" disabled={!available||busy||!complaint.trim()}>{busy?'Registrando...':'Dar entrada e enviar à triagem'}</Button></div></form>
 </main></>
}
