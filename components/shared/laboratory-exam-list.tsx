'use client'
import {useState} from 'react'
import {useData} from '@/lib/data-context'
import {Header} from '@/components/layout/header'
import {Input} from '@/components/ui/input'
import {PatientExamsHistory} from './patient-exams-history'
export function LaboratoryExamList({completed=false}:{completed?:boolean}){const {examRequests,patients}=useData();const [search,setSearch]=useState('');const title=completed?'Exames concluídos':'Exames aguardando';const filtered=examRequests.filter(exam=>(completed?exam.status==='concluido':!['concluido','cancelado'].includes(exam.status))&&`${exam.examTypeName} ${patients.find(patient=>patient.id===exam.patientId)?.nomeCompleto||''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));const lookup=Object.fromEntries(patients.map(patient=>[patient.id,patient]));return <><Header breadcrumbs={[{label:title}]} /><main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">{title}</h1><Input className="h-12" aria-label="Buscar exame ou paciente" placeholder="Buscar exame ou paciente" value={search} onChange={event=>setSearch(event.target.value)}/><PatientExamsHistory examRequests={filtered} patientsById={lookup} title={`${title} · ${filtered.length}`} description="" patientLinkBuilder={patientId=>`/laboratorio/registrar/${patientId}`} actionLabel="Abrir exames" /></main></>}
