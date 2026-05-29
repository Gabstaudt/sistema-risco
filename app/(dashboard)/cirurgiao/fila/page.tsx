'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/badges'
import { ArrowRight, Clock, FileText, ShieldAlert, Syringe, User } from 'lucide-react'
import type { LabUrgency, Patient } from '@/lib/types'

const urgencyMeta: Record<
  LabUrgency,
  {
    label: string
    shortLabel: string
    description: string
    cardClassName: string
    badgeClassName: string
    accentClassName: string
    rank: number
  }
> = {
  emergente: {
    label: 'Vermelho - Emergente',
    shortLabel: 'Vermelho',
    description: 'Prioridade maxima para avaliacao cirurgica.',
    cardClassName: 'border-red-200 bg-red-50/60',
    badgeClassName: 'bg-red-100 text-red-800 border-red-200',
    accentClassName: 'border-l-red-500',
    rank: 0,
  },
  muito_urgente: {
    label: 'Laranja - Muito urgente',
    shortLabel: 'Laranja',
    description: 'Atender logo apos os emergentes.',
    cardClassName: 'border-orange-200 bg-orange-50/60',
    badgeClassName: 'bg-orange-100 text-orange-800 border-orange-200',
    accentClassName: 'border-l-orange-500',
    rank: 1,
  },
  urgente: {
    label: 'Amarelo - Urgente',
    shortLabel: 'Amarelo',
    description: 'Avaliacao prioritaria, com risco relevante.',
    cardClassName: 'border-yellow-200 bg-yellow-50/60',
    badgeClassName: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accentClassName: 'border-l-yellow-500',
    rank: 2,
  },
  pouco_urgente: {
    label: 'Verde - Pouco urgente',
    shortLabel: 'Verde',
    description: 'Paciente estavel, podendo aguardar.',
    cardClassName: 'border-emerald-200 bg-emerald-50/60',
    badgeClassName: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentClassName: 'border-l-emerald-500',
    rank: 3,
  },
  nao_urgente: {
    label: 'Azul - Nao urgente',
    shortLabel: 'Azul',
    description: 'Menor gravidade na escala hospitalar classica.',
    cardClassName: 'border-sky-200 bg-sky-50/60',
    badgeClassName: 'bg-sky-100 text-sky-800 border-sky-200',
    accentClassName: 'border-l-sky-500',
    rank: 4,
  },
}

type QueueItem = {
  patient: Patient
  urgency: LabUrgency
}

function getSurgeryUrgency(patient: Patient): LabUrgency {
  return patient.labRiskClassification || patient.triageRiskClassification || 'nao_urgente'
}

export default function CirurgiaoFilaPage() {
  const { getPatientsByStatus } = useData()

  const waitingPatients = getPatientsByStatus(['aguardando_cirurgiao', 'em_avaliacao_cirurgica'])

  const queue: QueueItem[] = waitingPatients
    .map((patient) => ({
      patient,
      urgency: getSurgeryUrgency(patient),
    }))
    .sort((a, b) => {
      const urgencyDiff = urgencyMeta[a.urgency].rank - urgencyMeta[b.urgency].rank

      if (urgencyDiff !== 0) {
        return urgencyDiff
      }

      return new Date(a.patient.dataEntrada).getTime() - new Date(b.patient.dataEntrada).getTime()
    })

  const groupedQueue = (Object.keys(urgencyMeta) as LabUrgency[])
    .sort((left, right) => urgencyMeta[left].rank - urgencyMeta[right].rank)
    .map((urgency) => ({
      urgency,
      meta: urgencyMeta[urgency],
      items: queue.filter((item) => item.urgency === urgency),
    }))

  const highPriorityCount = queue.filter((item) => urgencyMeta[item.urgency].rank <= 1).length
  const inProgressCount = queue.filter((item) => item.patient.status === 'em_avaliacao_cirurgica').length

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

  const getWaitingTime = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

    if (diffMinutes < 60) {
      return `${diffMinutes} min`
    }

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}min`
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Aguardando Avaliacao' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fila de Aguardando Avaliacao Cirurgica</h1>
          <p className="max-w-4xl text-muted-foreground">
            Ordenacao do mais grave para o menos grave seguindo a escala hospitalar classica: vermelho, laranja,
            amarelo, verde e azul. Quando houver classificacao do laboratorio, ela prevalece sobre a cor da triagem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Na fila</p>
              <p className="mt-1 text-2xl font-semibold">{queue.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vermelho e laranja</p>
              <p className="mt-1 text-2xl font-semibold">{highPriorityCount}</p>
              <p className="text-sm text-muted-foreground">prioridade maxima do setor</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-400">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Em avaliacao agora</p>
              <p className="mt-1 text-2xl font-semibold">{inProgressCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Regra de Priorizacao
            </CardTitle>
            <CardDescription>O cirurgiao enxerga a fila em ordem assistencial, nao alfabetica.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {groupedQueue.map(({ urgency, meta, items }) => (
              <div key={urgency} className={`rounded-xl border p-4 ${meta.cardClassName}`}>
                <p className="font-medium">{meta.shortLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
                <p className="mt-3 text-2xl font-semibold">{items.length}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum paciente aguardando avaliacao cirurgica.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {groupedQueue
              .filter(({ items }) => items.length > 0)
              .map(({ urgency, meta, items }) => (
                <Card key={urgency}>
                  <CardHeader>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${meta.badgeClassName}`}>
                            {meta.label}
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-2">{meta.description}</CardDescription>
                      </div>
                      <span className="text-sm text-muted-foreground">{items.length} paciente(s) neste nivel</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map(({ patient, urgency }) => (
                        <div
                          key={patient.id}
                          className={`flex flex-col gap-4 rounded-xl border border-l-4 bg-card p-4 transition-colors hover:bg-accent/20 lg:flex-row lg:items-center lg:justify-between ${urgencyMeta[urgency].accentClassName}`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={patient.status} />
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${urgencyMeta[urgency].badgeClassName}`}
                                >
                                  {urgencyMeta[urgency].shortLabel}
                                </span>
                                {patient.labRiskClassification && (
                                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                    Cor validada pelo laboratorio
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 break-words font-medium">{patient.nomeCompleto}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span>{patient.idade} anos</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  Entrada as {formatTime(patient.dataEntrada)}
                                </span>
                                <span>Tempo em espera: {getWaitingTime(patient.dataEntrada)}</span>
                                <span>Clinico: {patient.clinicalAssignedSurgeonName || patient.triageAssignedClinicianName || 'Nao definido'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                            <Button asChild className="w-full lg:w-auto">
                              <Link href={`/cirurgiao/avaliacao/${patient.id}`}>
                                <Syringe className="mr-2 h-4 w-4" />
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
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </>
  )
}
