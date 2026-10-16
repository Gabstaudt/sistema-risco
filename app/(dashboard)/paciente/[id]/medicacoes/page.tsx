'use client'
import { useParams } from 'next/navigation'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { MedicationOrders } from '@/components/shared/medication-orders'
import { PatientPrintActions } from '@/components/shared/patient-print-actions'
export default function Page() {
 const { id } = useParams<{id:string}>(); const { getPatientById, isDataReady } = useData(); const patient = getPatientById(id)
 if (!isDataReady) return <p className="p-6">Carregando...</p>
 if (!patient) return <p className="p-6">Paciente indisponível.</p>
 return <><Header breadcrumbs={[{label:'Paciente',href:`/paciente/${id}`},{label:'Ficha de medicação'}]} /><main className="min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Ficha de medicação</h1><p className="font-semibold">{patient.nomeCompleto} · {patient.prontuario}</p><PatientPrintActions patientId={id} /><MedicationOrders patientId={id} showAllInitially /></main></>
}
