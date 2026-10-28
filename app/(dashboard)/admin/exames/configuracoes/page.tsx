'use client'
import {Header} from '@/components/layout/header'
import {ExamTypeCatalog} from '@/components/shared/exam-type-catalog'
export default function LaboratorySettingsPage(){return <><Header breadcrumbs={[{label:'Exames',href:'/admin/exames'},{label:'Configurações do laboratório'}]}/><main className="min-h-[calc(100svh-4rem)] w-full min-w-0 flex-1 space-y-6 p-4 sm:p-6"><h1 className="text-2xl font-bold">Configurações de Exames — Laboratório</h1><ExamTypeCatalog embedded/></main></>}
