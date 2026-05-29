'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/badges'
import { ArrowRight, Clock, FileText, Stethoscope, User } from 'lucide-react'
import type { LabUrgency, Patient } from '@/lib/types'

const urgencyMeta: Record<LabUrgency, { label: string; className: string; rank: number }> = {
  emergente: { label: 'Vermelho - Emergente', className: 'bg-red-100 text-red-800 border-red-200', rank: 0 },
  muito_urgente: { label: 'Laranja - Muito urgente', className: 'bg-orange-100 text-orange-800 border-orange-200', rank: 1 },
  urgente: { label: 'Amarelo - Urgente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', rank: 2 },
  pouco_urgente: { label: 'Verde - Pouco urgente', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', rank: 3 },
  nao_urgente: { label: 'Azul - Nao urgente', className: 'bg-sky-100 text-sky-800 border-sky-200', rank: 4 },
}

type QueueItem = {
  patient: Patient
  visitType: 'Entrada clinica' | 'Retorno clinico'
}

export default function ClinicoDashboard() {
  const { patients, getPatientsByStatus } = useData()

  const awaitingClinical = getPatientsByStatus(['aguardando_clinico', 'em_avaliacao_clinica', 'exames_concluidos'])

  const queue: QueueItem[] = awaitingClinical
    .filter((patient) => !!patient.triageRiskClassification)
    .map((patient) => ({
      patient,
      visitType:
        patient.status === 'exames_concluidos' || patient.status === 'em_avaliacao_clinica' || !!patient.clinicalEvaluation
          ? 'Retorno clinico'
          : 'Entrada clinica',
    }))
    .sort((a, b) => {
      const leftRank = a.patient.triageRiskClassification ? urgencyMeta[a.patient.triageRiskClassification].rank : 99
      const rightRank = b.patient.triageRiskClassification ? urgencyMeta[b.patient.triageRiskClassification].rank : 99

      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return new Date(a.patient.dataEntrada).getTime() - new Date(b.patient.dataEntrada).getTime()
    })

  const entryCount = queue.filter((item) => item.visitType === 'Entrada clinica').length
  const returnCount = queue.filter((item) => item.visitType === 'Retorno clinico').length
  const highPriorityCount = queue.filter(
    (item) =>
      item.patient.triageRiskClassification === 'emergente' ||
      item.patient.triageRiskClassification === 'muito_urgente',
  ).length

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
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
      <Header breadcrumbs={[{ label: 'Fila Clinica' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fila do Clinico</h1>
          <p className="max-w-3xl text-muted-foreground">
            Pacientes ordenados pela prioridade de risco da triagem, do vermelho ao azul, mantendo a ordem de entrada
            dentro de cada nivel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Na fila</p>
              <p className="mt-1 text-2xl font-semibold">{queue.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Alta prioridade</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Pacientes a Serem Atendidos</CardTitle>
            <CardDescription>
              Nome, prioridade, horario de entrada e tipo de atendimento do fluxo clinico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Nenhum paciente aguardando atendimento clinico.</div>
            ) : (
              <div className="space-y-3">
                {queue.map((item, index) => {
                  const { patient, visitType } = item
                  const action = getAction(item)
                  const ActionIcon = action.icon
                  const urgency = patient.triageRiskClassification

                  return (
                    <div
                      key={patient.id}
                      className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/20 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                              {index + 1}º da fila
                            </span>
                            <StatusBadge status={patient.status} />
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${urgencyMeta[urgency!].className}`}
                            >
                              {urgencyMeta[urgency!].label}
                            </span>
                          </div>
                          <p className="mt-2 break-words font-medium">{patient.nomeCompleto}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{visitType}</span>
                            <span>{patient.idade} anos</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Entrada as {formatTime(patient.dataEntrada)}
                            </span>
                            <span>Clinico: {patient.triageAssignedClinicianName || 'Nao definido'}</span>
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
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
