'use client'

import Link from 'next/link'
import { hasPendingAssessment } from '@/lib/assessment-requests'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { ArrowRight, Clock, FileText, Heart, User } from 'lucide-react'
import type { LabUrgency, Patient } from '@/lib/types'

const urgencyMeta: Record<LabUrgency, { label: string; className: string; rank: number }> = {
  emergente: { label: 'Vermelho', className: 'bg-red-100 text-red-800 border-red-200', rank: 0 },
  muito_urgente: { label: 'Laranja', className: 'bg-orange-100 text-orange-800 border-orange-200', rank: 1 },
  urgente: { label: 'Amarelo', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', rank: 2 },
  pouco_urgente: { label: 'Verde', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', rank: 3 },
  nao_urgente: { label: 'Azul', className: 'bg-sky-100 text-sky-800 border-sky-200', rank: 4 },
}

function getUrgency(patient: Patient): LabUrgency {
  return patient.labRiskClassification || patient.triageRiskClassification || 'nao_urgente'
}

export default function CardiologistaFilaPage() {
  const { patients } = useData()

  const queue = patients.filter((patient) => ['aguardando_cardiologista', 'em_avaliacao_cardiologica'].includes(patient.status) || hasPendingAssessment(patient, 'cardiologista'))
    .map((patient) => ({ patient, urgency: getUrgency(patient) }))
    .sort((left, right) => {
      const urgencyDiff = urgencyMeta[left.urgency].rank - urgencyMeta[right.urgency].rank
      if (urgencyDiff !== 0) return urgencyDiff
      return new Date(left.patient.dataEntrada).getTime() - new Date(right.patient.dataEntrada).getTime()
    })

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const getWaitingTime = (value: string) => {
    const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
    if (diffMinutes < 60) return `${diffMinutes} min`
    return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}min`
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Aguardando Avaliacao' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fila da Cardiologia</h1>
          <p className="text-muted-foreground">
            Pacientes aguardando liberacao cardiologica pre-operatoria antes do encaminhamento ao anestesista.
          </p>
        </div>

        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum paciente aguardando avaliacao cardiologica.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Fila Prioritaria</CardTitle>
              <CardDescription>Ordem do mais urgente ao menos urgente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.map(({ patient, urgency }) => (
                <div key={patient.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={patient.status} />
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${urgencyMeta[urgency].className}`}>
                          {urgencyMeta[urgency].label}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{patient.nomeCompleto}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{patient.idade} anos</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Entrada as {formatTime(patient.dataEntrada)}
                        </span>
                        <span>Tempo em espera: {getWaitingTime(patient.dataEntrada)}</span>
                        <span>Clinico: {patient.requestingPhysician || 'Nao informado'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                    <Button asChild className="w-full lg:w-auto">
                      <Link href={`/cardiologista/avaliacao/${patient.id}`}>
                        <Heart className="mr-2 h-4 w-4" />
                        Avaliar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full lg:w-auto">
                      <Link href={`/paciente/${patient.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Abrir prontuario
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
