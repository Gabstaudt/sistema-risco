'use client'
import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { PatientExamList } from '@/components/shared/patient-exam-list'
import { ExamOperations } from '@/components/shared/exam-operations'
function PatientExamsPage() {
 const {id} = useParams<{id:string}>(); const search = useSearchParams()
 const {getPatientById,getExamRequestsByPatient,isDataReady} = useData(); const patient = getPatientById(id)
 const exams = getExamRequestsByPatient(id); const requested = search.get('exame'); const exam = exams.find(exam=>exam.id===requested)
 if (!isDataReady) return <p className="p-6">Carregando...</p>
 if (!patient) return <p className="p-6">Paciente indisponível.</p>
 return <><Header breadcrumbs={[{label:'Paciente',href:`/paciente/${id}`},{label:'Exames',href:`/paciente/${id}/exames`},...(exam?[{label:exam.examTypeName}]:[])]} /><main className="min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">{exam?.examTypeName || 'Exames do paciente'}</h1><p className="font-medium">{patient.nomeCompleto} · {patient.prontuario}</p>{requested ? exam ? <ExamOperations exam={exam} /> : <p>Exame não encontrado.</p> : <PatientExamList examRequests={exams} />}</main></>
}
export default function Page() { return <Suspense fallback={<p className="p-6">Carregando...</p>}><PatientExamsPage /></Suspense> }
