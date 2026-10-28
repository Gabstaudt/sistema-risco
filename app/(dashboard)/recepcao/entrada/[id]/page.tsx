'use client'
import {ReceptionTicketSelector} from '@/components/shared/reception-ticket-selector'
import { useEffect,useRef,useState } from 'react'
import { useParams,useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { CLOSED_ATTENDANCES,intakeUpdates,type IntakeDraft } from '@/lib/reception-attendance'
import { Header } from '@/components/layout/header'
import { IntakeFields,ConfirmIntake } from '@/components/shared/intake-fields'
import { PatientPhoto } from '@/components/shared/patient-photo'
import { Button } from '@/components/ui/button'
import { Card,CardHeader,CardTitle,CardContent } from '@/components/ui/card'
export default function ExistingIntake(){
 const {id}=useParams<{id:string}>();const {user,users,sectors,hasPermission}=useAuth();const {getPatientById,tickets,forwardExistingPatient,isDataReady}=useData();const router=useRouter()
 const [ticketId,setTicketId]=useState('');const [draft,setDraft]=useState<IntakeDraft>({complaint:'',notes:'',route:'com_triagem',doctorId:''});const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false)
 useEffect(()=>setTicketId(new URLSearchParams(location.search).get('senha')||tickets.find(ticket=>ticket.stage==='chamada_recepcao'&&ticket.calledBy===user?.id)?.id||''),[tickets,user?.id])
 const patient=getPatientById(id);const ticket=tickets.find(item=>item.id===ticketId);const available=Boolean(patient&&CLOSED_ATTENDANCES.includes(patient.status)&&(user?.role==='triagem'?hasPermission('create_patient')&&hasPermission('forward_to_triage'):ticket&&ticket.stage==='chamada_recepcao'&&ticket.calledBy===user?.id))
 function review(event:React.FormEvent){event.preventDefault();setError('');try{intakeUpdates(draft,users,sectors);setConfirm(true)}catch(error){setError(error instanceof Error?error.message:'Confira os campos.')}}
 async function submit(){if(lock.current||!available)return;lock.current=true;setBusy(true);setError('');try{await forwardExistingPatient(ticketId,id,draft);router.push(user?.role==='triagem'?'/triagem/fila':`/recepcao/atendimento/${id}?entrada=1`)}catch(error){setError(error instanceof Error?error.message:'Não foi possível encaminhar.')}finally{lock.current=false;setBusy(false)}}
 if(!isDataReady)return <p className="p-6">Carregando...</p>
 if(!patient)return <p className="p-6">Paciente não encontrado.</p>
 return <><Header breadcrumbs={[{label:user?.role==='triagem'?'Triagem':'Recepção',href:user?.role==='triagem'?'/triagem/fila':'/recepcao/fila'},{label:'Nova entrada'}]}/><main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Registrar entrada</h1><ReceptionTicketSelector/><Card><CardHeader><div className="flex items-center gap-4"><PatientPhoto photoId={patient.photoId}/><div><CardTitle>{patient.nomeSocial||patient.nomeCompleto}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{patient.prontuario}{patient.cpf?` · ${patient.cpf}`:''} · Senha {ticket?.number||'não chamada'}</p></div></div></CardHeader></Card>{!available&&<p role="alert">Chame uma senha e selecione um paciente com atendimento anterior encerrado.</p>}<form onSubmit={review} className="space-y-5"><Card><CardHeader><CardTitle>Atendimento inicial</CardTitle></CardHeader><CardContent><IntakeFields value={draft} onChange={setDraft} disabled={!available||busy} routeDisabled={user?.role==='triagem'}/></CardContent></Card>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex justify-end"><Button className="h-12" disabled={!available||busy}>Encaminhar paciente</Button></div></form><ConfirmIntake open={confirm} onOpenChange={setConfirm} name={patient.nomeCompleto} draft={draft} busy={busy} error={error} onConfirm={submit}/></main></>
}
