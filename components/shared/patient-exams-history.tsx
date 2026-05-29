'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/badges'
import type { ExamRequest, Patient } from '@/lib/types'
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, FileText, FlaskConical } from 'lucide-react'
import { users } from '@/lib/data/users'

type PatientLookup = Pick<Patient, 'id' | 'nomeCompleto' | 'prontuario' | 'status'>

interface PatientExamsHistoryProps {
  examRequests: ExamRequest[]
  patientsById?: Record<string, PatientLookup>
  title?: string
  description?: string
  emptyMessage?: string
  patientLinkBuilder?: (patientId: string) => string
  actionLabel?: string
  maxItems?: number
}

const examStatusMeta: Record<ExamRequest['status'], { label: string; className: string }> = {
  solicitado: { label: 'Solicitado', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  coletado: { label: 'Coletado', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  em_analise: { label: 'Em analise', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  concluido: { label: 'Concluido', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const urgencyMeta: Record<NonNullable<ExamRequest['labUrgency']>, { label: string; className: string }> = {
  emergente: { label: 'Vermelho', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

function getRelevantTimestamp(exam: ExamRequest) {
  return exam.concluidoEm || exam.analisadoEm || exam.coletadoEm || exam.solicitadoEm
}

function formatDate(dateString?: string) {
  if (!dateString) return 'Sem data'

  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getUserName(userId?: string) {
  if (!userId) return 'Nao informado'

  return users.find((user) => user.id === userId)?.name || userId
}

function getResultTone(exam: ExamRequest) {
  const text = `${exam.resultado || ''} ${exam.observacoesLab || ''} ${exam.labAnalysis || ''}`.toLowerCase()

  if (exam.status === 'concluido' && /(alter|anemia|reduzid|elevad|critic|insuficiencia|hiperglic)/.test(text)) {
    return 'border-amber-200 bg-amber-50/60'
  }

  if (exam.status === 'concluido') {
    return 'border-emerald-200 bg-emerald-50/40'
  }

  return 'border-border bg-card'
}

export function PatientExamsHistory({
  examRequests,
  patientsById,
  title = 'Historico de Exames',
  description = 'Todos os exames vinculados ao paciente ou aos pacientes filtrados.',
  emptyMessage = 'Nenhum exame encontrado.',
  patientLinkBuilder,
  actionLabel = 'Abrir paciente',
  maxItems,
}: PatientExamsHistoryProps) {
  const sortedExams = [...examRequests]
    .sort((a, b) => new Date(getRelevantTimestamp(b)).getTime() - new Date(getRelevantTimestamp(a)).getTime())
    .slice(0, maxItems ?? examRequests.length)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedExams.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedExams.map((exam) => {
              const patient = patientsById?.[exam.patientId]
              const status = examStatusMeta[exam.status]
              const urgency = exam.labUrgency ? urgencyMeta[exam.labUrgency] : undefined

              return (
                <div key={exam.id} className={`rounded-xl border p-4 ${getResultTone(exam)}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <span className="break-words font-semibold">{exam.examTypeName}</span>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                        {urgency && (
                          <Badge variant="outline" className={urgency.className}>
                            Prioridade {urgency.label}
                          </Badge>
                        )}
                      </div>

                      {patient && (
                        <div className="flex flex-col gap-2 rounded-lg border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{patient.nomeCompleto}</p>
                            <p className="text-xs text-muted-foreground">{patient.prontuario}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={patient.status} />
                            {patientLinkBuilder && (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={patientLinkBuilder(patient.id)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  {actionLabel}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Solicitado em</p>
                          <p className="text-sm">{formatDate(exam.solicitadoEm)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultima movimentacao</p>
                          <p className="text-sm">{formatDate(getRelevantTimestamp(exam))}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Justificativa</p>
                          <p className="break-words text-sm">{exam.justificativa || 'Nao informada'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Referencia</p>
                          <p className="break-words text-sm">{exam.valorReferencia || 'Nao informada'}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-background/70 p-3">
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Responsaveis</p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Solicitou</p>
                            <p className="break-words text-sm font-medium">{getUserName(exam.solicitadoPor)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Coletou</p>
                            <p className="break-words text-sm font-medium">{getUserName(exam.coletadoPor)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Analisou</p>
                            <p className="break-words text-sm font-medium">{getUserName(exam.analisadoPor)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Concluiu</p>
                            <p className="break-words text-sm font-medium">{getUserName(exam.concluidoPor)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-2">
                        <div className="rounded-lg border bg-background/70 p-3">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            {exam.status === 'concluido' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : exam.status === 'em_analise' || exam.status === 'coletado' ? (
                              <Clock3 className="h-4 w-4 text-blue-600" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            Resultado
                          </div>
                          <p className="break-words text-sm text-muted-foreground">
                            {exam.resultado || 'Resultado ainda nao liberado.'}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-background/70 p-3">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Leitura do laboratorio
                          </div>
                          <p className="break-words text-sm text-muted-foreground">
                            {exam.labAnalysis || exam.observacoesLab || 'Sem interpretacao adicional.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
