'use client'

import Link from 'next/link'
import {registrationGroups} from './patient-registration-fields'
import {PatientPhoto} from './patient-photo'
import { useState } from 'react'
import { PatientBasicEditForm } from '@/components/shared/patient-basic-edit-form'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Patient } from '@/lib/types'

export function PatientBasicDetails({ patient }: { patient: Patient }) {
  const { user, hasPermission } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const canEdit = hasPermission('edit_patient_basic')
  const fields = [
    ['Prontuário',patient.prontuario],
    ...registrationGroups.flatMap(group=>group.fields.map(field=>[field.label,field.key==='nomeMae'&&patient.maeDesconhecida?'Desconhecida':field.key==='nomePai'&&patient.paiDesconhecido?'Desconhecido':String(patient[field.key]||'')])),
    ['Situação de rua',patient.situacaoRua?'Sim':'Não'],['Possui plano privado',patient.possuiPlanoPrivado?'Sim':'Não'],
  ]

  return (
    <>
      <Header breadcrumbs={[{ label: 'Pacientes', href: `/${user?.role}/pacientes` }, { label: 'Cadastro' }]} />
      <div className="min-h-[calc(100svh-4rem)] w-full flex-1 space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" className="size-11 shrink-0" asChild>
            <Link href={`/${user?.role}/pacientes`} aria-label="Voltar para a lista de pacientes"><ArrowLeft className="size-5" /></Link>
          </Button>
          <PatientPhoto photoId={patient.photoId}/><div className="min-w-0">
            <h1 className="break-words text-2xl font-bold">{patient.nomeCompleto}</h1>
            <p className="text-muted-foreground">Dados de cadastro do paciente</p>
          </div>
        </div>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{editing && canEdit ? 'Editar cadastro do paciente' : 'Dados pessoais e contato'}</CardTitle>
            {canEdit && !editing && (
              <Button variant="outline" className="h-11 px-4" onClick={() => { setSaved(false); setEditing(true) }}>
                <Pencil className="size-4" />Editar dados
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {saved && <p role="status" className="mb-5 rounded-lg bg-secondary p-3 text-secondary-foreground">Dados do paciente atualizados.</p>}
            {editing && canEdit ? (
              <PatientBasicEditForm patient={patient} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true) }} />
            ) : (<dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map(([label, value]) => (
                <div key={label} className="min-w-0 space-y-1">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="break-words text-base font-medium">{value || 'Não informado'}</dd>
                </div>
              ))}
            </dl>)}
          </CardContent>
        </Card>
        {!editing && <Card>
          <CardHeader><CardTitle>Entrada atual</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 font-medium">{patient.attendanceRoute==='sem_triagem'?'Sem triagem · classificação branca':'Com triagem'}</p>{patient.attendanceClosure&&<p className="mb-4">Atendimento encerrado: {patient.attendanceClosure.reason}</p>}{hasPermission('manage_attendance')&&<Button asChild variant="outline" className="mb-4 h-11"><Link href={`/recepcao/atendimento/${patient.id}`}>Atualizar atendimento</Link></Button>}
            <dl className="grid gap-5 sm:grid-cols-2">
              <div><dt className="text-sm text-muted-foreground">Data de entrada</dt><dd className="font-medium">{new Date(patient.dataEntrada).toLocaleString('pt-BR')}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Queixa inicial registrada</dt><dd className="break-words font-medium">{patient.queixaPrincipal || 'Não informada'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Relato inicial</dt><dd className="break-words font-medium">{patient.descricaoInicial || 'Não informado'}</dd></div>
            </dl>
          </CardContent>
        </Card>}
      </div>
    </>
  )
}
