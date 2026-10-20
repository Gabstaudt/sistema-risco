'use client'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {useAuth} from '@/lib/auth'
import {useData} from '@/lib/data-context'
import {MedicalWorkspace} from '@/components/shared/medical-workspace'
import {Header} from '@/components/layout/header'
import {Button} from '@/components/ui/button'
export default function Page(){const {id}=useParams<{id:string}>();const {user}=useAuth();const {getPatientById,isDataReady}=useData();const patient=getPatientById(id);if(!isDataReady)return <p className="p-6">Carregando...</p>;if(!patient)return <p className="p-6">Paciente não direcionado para este médico.</p>;return <><Header breadcrumbs={[{label:'Atendimento médico'}]}/><main className="w-full min-w-0 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">{patient.nomeSocial||patient.nomeCompleto}</h1><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/${user?.role}/avaliar/${id}`}>Avaliação da especialidade</Link></Button><Button asChild variant="outline"><Link href={`/paciente/${id}`}>Prontuário e relatórios do paciente</Link></Button></div><MedicalWorkspace key={id+'-'+patient.dataEntrada} patientId={id}/></main></>}
