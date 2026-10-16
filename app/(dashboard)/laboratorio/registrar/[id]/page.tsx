'use client'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {useData} from '@/lib/data-context'
import {Header} from '@/components/layout/header'
import {Button} from '@/components/ui/button'
import {ExamOperations} from '@/components/shared/exam-operations'
import {MedicationOrders} from '@/components/shared/medication-orders'
import {examActivityTime} from '@/lib/lab-operations'
export default function LaboratoryPatient(){const {id}=useParams<{id:string}>();const {examRequests,getPatientById,isDataReady}=useData();const selected=examRequests.find(exam=>exam.id===id);const patientId=selected?.patientId||id;const patient=getPatientById(patientId);const exams=examRequests.filter(exam=>exam.patientId===patientId).sort((a,b)=>examActivityTime(b)-examActivityTime(a))
if(!isDataReady)return <p className="p-6" role="status">Carregando...</p>
if(!patient)return <p className="p-6">Paciente não encontrado.</p>
return <><Header breadcrumbs={[{label:'Laboratório',href:'/laboratorio/fila'},{label:patient.nomeCompleto}]} /><main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-6 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Exames e medicações</h1><p className="mt-1">{patient.nomeCompleto} · {patient.prontuario}{patient.ticketNumber?` · Senha ${patient.ticketNumber}`:''}</p></div><Button asChild variant="outline" className="h-12"><Link href="/laboratorio/fila">Voltar à fila</Link></Button></div><div className="space-y-4">{!exams.length&&<p>Nenhum exame solicitado.</p>}{exams.map(exam=><ExamOperations key={exam.id} exam={exam}/>)}</div><MedicationOrders patientId={patientId} showAllInitially/></main></>}
