'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/badges'
import { ArrowRight, Clock, FileText, Stethoscope, User } from 'lucide-react'
import type { LabUrgency, Patient } from '@/lib/types'

const urgencyMeta: Record<
  LabUrgency,
  {
    label: string
    shortLabel: string
    badgeClassName: string
    accentClassName: string
    rank: number
  }
> = {
  emergente: {
    label: 'Vermelho - Emergente',
    shortLabel: 'Vermelho',
    badgeClassName: 'bg-red-100 text-red-800 border-red-200',
    accentClassName: 'border-l-red-500',
    rank: 0,
  },
  muito_urgente: {
    label: 'Laranja - Muito urgente',
    shortLabel: 'Laranja',
    badgeClassName: 'bg-orange-100 text-orange-800 border-orange-200',
    accentClassName: 'border-l-orange-500',
    rank: 1,
  },
  urgente: {
    label: 'Amarelo - Urgente',
    shortLabel: 'Amarelo',
    badgeClassName: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accentClassName: 'border-l-yellow-500',
    rank: 2,
  },
  pouco_urgente: {
    label: 'Verde - Pouco urgente',
    shortLabel: 'Verde',
    badgeClassName: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentClassName: 'border-l-emerald-500',
    rank: 3,
  },
  nao_urgente: {
    label: 'Azul - Nao urgente',
    shortLabel: 'Azul',
    badgeClassName: 'bg-sky-100 text-sky-800 border-sky-200',
    accentClassName: 'border-l-sky-500',
    rank: 4,
  },
}

type QueueItem = {
  patient: Patient
  urgency: LabUrgency
  visitType: 'Entrada clinica' | 'Retorno clinico'
}

function getPatientUrgency(patient: Patient): LabUrgency {
  return patient.triageRiskClassification || 'nao_urgente'
}

export default function ClinicoDashboard() {
  const { getPatientsByStatus } = useData()

  const awaitingClinical = getPatientsByStatus(['aguardando_clinico', 'em_avaliacao_clinica', 'exames_concluidos'])

  const queue: QueueItem[] = awaitingClinical
    .map((patient): QueueItem => ({
      patient,
      urgency: getPatientUrgency(patient),
      visitType:
        patient.status === 'exames_concluidos' || patient.status === 'em_avaliacao_clinica' || !!patient.clinicalEvaluation
          ? 'Retorno clinico'
          : 'Entrada clinica',
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

  const entryCount = queue.filter((item) => item.visitType === 'Entrada clinica').length
  const returnCount = queue.filter((item) => item.visitType === 'Retorno clinico').length
  const highPriorityCount = queue.filter((item) => urgencyMeta[item.urgency].rank <= 1).length

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

  const getWaitingMinutes = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

    if (diffMinutes < 60) {
      return `${diffMinutes} min`
    }

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}min`
  }

  const getAction = (item: QueueItem) => {
    if (item.visitType === 'Retorno clinico') {
      return {
        href: `/clinico/revisar/${item.patient.id}`,
        label: 'Revisar',
        icon: FileText,
      }
    }

    return {
      href: `/clinico/avaliar/${item.patient.id}`,
      label: 'Avaliar',
      icon: Stethoscope,
    }
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Aguardando Avaliacao' }]} />
      <div className="flex-1 w-full min-w-0 space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fila de Aguardando Avaliacao</h1>

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
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-400">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Entrada / Retorno</p>
              <p className="mt-1 text-2xl font-semibold">
                {entryCount} / {returnCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum paciente aguardando atendimento clinico.
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
                      </div>
                      <span className="text-sm text-muted-foreground">{items.length} paciente(s) neste nivel</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => {
                        const action = getAction(item)
                        const ActionIcon = action.icon

                        return (
                          <div
                            key={item.patient.id}
                            className={`flex flex-col gap-4 rounded-xl border border-l-4 bg-card p-4 transition-colors hover:bg-accent/20 lg:flex-row lg:items-center lg:justify-between ${meta.accentClassName}`}
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge status={item.patient.status} />
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${meta.badgeClassName}`}
                                  >
                                    {meta.shortLabel}
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                    {item.visitType}
                                  </span>
                                </div>
                                <p className="mt-2 break-words font-medium">{item.patient.nomeCompleto}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                  <span>{item.patient.idade} anos</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    Entrada as {formatTime(item.patient.dataEntrada)}
                                  </span>
                                  <span>Tempo em espera: {getWaitingMinutes(item.patient.dataEntrada)}</span>
                                  <span>Clinico: {item.patient.triageAssignedClinicianName || 'Nao definido'}</span>
                                </div>
                              </div>
                            </div>

                            <Button asChild className="w-full lg:w-auto">
                              <Link href={action.href}>
                                <ActionIcon className="mr-2 h-4 w-4" />
                                {action.label}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        )
                      })}
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
