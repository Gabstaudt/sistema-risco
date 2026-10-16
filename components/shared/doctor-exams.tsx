'use client'
import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { Input } from '@/components/ui/input'
import { PatientExamList } from './patient-exam-list'
export function DoctorExams() {
 const {examRequests,patients} = useData(); const [search,setSearch] = useState('')
 return <><Header breadcrumbs={[{label:'Exames dos meus pacientes'}]} /><main className="min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Exames dos meus pacientes</h1><Input className="h-12" aria-label="Buscar exame ou paciente" placeholder="Buscar exame ou paciente" value={search} onChange={event=>setSearch(event.target.value)} /><PatientExamList showPatient examRequests={examRequests.filter(exam=>`${exam.examTypeName} ${patients.find(patient=>patient.id===exam.patientId)?.nomeCompleto || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))} /></main></>
}
