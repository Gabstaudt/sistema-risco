'use client'
import { useEffect,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { registrationDraft,cleanRegistration } from '@/lib/patient-registration'
import { intakeUpdates,type IntakeDraft } from '@/lib/reception-attendance'
import { Header } from '@/components/layout/header'
import { PatientRegistrationFields } from '@/components/shared/patient-registration-fields'
import { ReceptionPatientSearch } from '@/components/shared/reception-patient-search'
import { IntakeFields,ConfirmIntake } from '@/components/shared/intake-fields'
import { Button } from '@/components/ui/button'
import { Card,CardHeader,CardTitle,CardContent } from '@/components/ui/card'
export default function RegistrationPage(){
 const {user,users,hasPermission}=useAuth();const {patients,tickets,createPatient,isDataReady}=useData();const router=useRouter()
 const [ticketId,setTicketId]=useState('');const [step,setStep]=useState<'search'|'register'>('search');const [draft,setDraft]=useState(registrationDraft());const [intake,setIntake]=useState<IntakeDraft>({complaint:'',notes:'',route:'com_triagem',doctorId:''});const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false)
 useEffect(()=>{setTicketId(new URLSearchParams(location.search).get('senha')||tickets.find(ticket=>ticket.stage==='chamada_recepcao'&&ticket.calledBy===user?.id)?.id||'')},[tickets,user?.id])
 const ticket=tickets.find(item=>item.id===ticketId)
 const canRegister=hasPermission('create_patient')&&(user?.role!=='recepcao'||Boolean(ticket&&ticket.stage==='chamada_recepcao'&&ticket.calledBy===user.id))
 const showSearch=user?.role==='recepcao'&&step==='search'
 function review(event:React.FormEvent){event.preventDefault();setError('');try{cleanRegistration(draft,patients);intakeUpdates(intake,users);setConfirm(true)}catch(error){setError(error instanceof Error?error.message:'Confira os campos.') }}
 async function submit(){if(lock.current||!canRegister||!user)return;lock.current=true;setBusy(true);setError('');try{const clean=cleanRegistration(draft,patients);await createPatient({...clean,sexo:clean.sexo,unidade:draft.unidade,dataEntrada:new Date().toISOString(),status:intake.route==='sem_triagem'?'aguardando_clinico':'aguardando_triagem',prioridade:'normal',examesSolicitados:[],cadastradoPor:user.id,queixaPrincipal:intake.complaint,descricaoInicial:intake.notes,attendanceRoute:intake.route,triageAssignedClinicianId:intake.doctorId,ticketId:ticketId||undefined});router.push(user.role==='triagem'?'/triagem/fila':'/recepcao/atendimentos')}catch(error){setError(error instanceof Error?error.message:'Não foi possível cadastrar.')}finally{lock.current=false;setBusy(false)}}
 if(!isDataReady)return <p className="p-6">Carregando...</p>
 return <><Header breadcrumbs={[{label:user?.role==='triagem'?'Triagem':'Recepção',href:user?.role==='triagem'?'/triagem':'/recepcao/fila'},{label:'Novo atendimento'}]}/><main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{showSearch?'Novo atendimento':'Cadastro do paciente'}</h1>{hasPermission('print_blank_attendance')&&<Button asChild variant="outline" className="h-12"><Link href="/recepcao/ficha-em-branco" target="_blank">Imprimir ficha em branco</Link></Button>}</div>{ticket&&<p className="font-mono text-xl font-semibold">Senha {ticket.number}</p>}{showSearch?<ReceptionPatientSearch ticketId={ticketId} canRegister={canRegister} onNew={()=>setStep('register')}/>:<form className="space-y-5" onSubmit={review}>{user?.role==='recepcao'&&<Button type="button" variant="outline" onClick={()=>setStep('search')}>Voltar à pesquisa</Button>}<PatientRegistrationFields draft={draft} onChange={setDraft} disabled={busy||!canRegister}/><Card><CardHeader><CardTitle>Atendimento inicial</CardTitle></CardHeader><CardContent><IntakeFields value={intake} onChange={setIntake} disabled={busy||!canRegister} routeDisabled={user?.role==='triagem'}/></CardContent></Card>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><Button asChild variant="outline" className="h-12"><Link href={user?.role==='triagem'?'/triagem/fila':'/recepcao/fila'}>Voltar</Link></Button><Button className="h-12" disabled={busy||!canRegister}>Salvar e encaminhar</Button></div></form>}<ConfirmIntake open={confirm} onOpenChange={setConfirm} name={draft.nomeCompleto} draft={intake} busy={busy} error={error} onConfirm={submit}/></main></>
}
