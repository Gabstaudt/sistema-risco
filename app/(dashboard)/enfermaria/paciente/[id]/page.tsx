'use client'
import {useParams} from 'next/navigation'
import {useData} from '@/lib/data-context'
import {WardPatient} from '@/components/shared/ward-patient'
export default function Page(){const {id}=useParams<{id:string}>();const {getPatientById,isDataReady}=useData();const patient=getPatientById(id);if(!isDataReady)return <p className="p-6">Carregando...</p>;if(!patient)return <p className="p-6">Paciente indisponível neste setor da enfermaria.</p>;return <WardPatient key={id+'-'+patient.dataEntrada} patient={patient}/>}
