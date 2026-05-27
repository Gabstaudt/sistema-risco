'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, CheckCircle2, FlaskConical, Search } from 'lucide-react'
import type { LabUrgency } from '@/lib/types'

const urgencyMeta: Record<LabUrgency, { label: string; className: string }> = {
  emergente: { label: 'Vermelho - Emergente', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja - Muito urgente', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo - Urgente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde - Pouco urgente', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul - Nao urgente', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

export default function LaboratorioConcluidosPage() {
  const { examRequests, patients } = useData()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const concludedItems = useMemo(() => {
    return examRequests
      .filter((exam) => exam.status === 'concluido')
      .map((exam) => ({
        exam,
        patient: patients.find((patient) => patient.id === exam.patientId),
      }))
      .filter((item) => item.patient && item.patient.labRiskClassification)
      .filter((item) => item.patient)
      .filter(({ exam, patient }) => {
        const term = search.trim().toLowerCase()
        return (
          term === '' ||
          exam.examTypeName.toLowerCase().includes(term) ||
          patient!.nomeCompleto.toLowerCase().includes(term) ||
          patient!.prontuario.toLowerCase().includes(term) ||
          (patient!.scheduledSurgery || '').toLowerCase().includes(term)
        )
      })
      .sort((a, b) => {
        const left = a.exam.concluidoEm || a.exam.analisadoEm || a.exam.solicitadoEm
        const right = b.exam.concluidoEm || b.exam.analisadoEm || b.exam.solicitadoEm
        return new Date(right).getTime() - new Date(left).getTime()
      })
  }, [examRequests, patients, search])

  const formatDateTime = (value?: string) => {
    if (!value) return 'Nao informado'
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Exames Concluidos' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Exames Concluidos</h1>
          <p className="max-w-3xl text-muted-foreground">
            Lista com paciente, exame concluido e status atribuido pelo laboratorio. Clique para expandir e ver os
            detalhes registrados.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Exames Concluidos</CardTitle>
            <CardDescription>{concludedItems.length} exame(s) concluidos com classificacao registrada.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, exame, prontuario ou cirurgia..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>

            {concludedItems.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum exame concluido encontrado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {concludedItems.map(({ exam, patient }) => {
                  const isExpanded = expandedId === exam.id

                  return (
                    <div key={exam.id} className="rounded-xl border bg-card p-4 transition-colors hover:bg-accent/20">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <FlaskConical className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-medium">{patient!.nomeCompleto}</p>
                            <p className="text-sm text-muted-foreground">
                              {exam.examTypeName} | {patient!.prontuario}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${urgencyMeta[patient!.labRiskClassification as LabUrgency].className}`}
                          >
                            {urgencyMeta[patient!.labRiskClassification as LabUrgency].label}
                          </span>
                          <Button variant="outline" onClick={() => setExpandedId(isExpanded ? null : exam.id)}>
                            {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                            {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 grid gap-4 rounded-xl border border-dashed bg-muted/10 p-4 text-sm xl:grid-cols-2">
                          <div className="space-y-3">
                            <div className="rounded-lg border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Resultado do exame</p>
                              <p className="mt-1 break-words font-medium">{exam.resultado || 'Nao informado'}</p>
                            </div>
                            <div className="rounded-lg border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Analise de risco do laboratorio</p>
                              <p className="mt-1 break-words">{patient!.labRiskNotes || 'Nao informada'}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-lg border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Observacao do enfermeiro do laboratorio</p>
                              <p className="mt-1 break-words">{patient!.labNurseObservation || 'Nao informada'}</p>
                            </div>
                            <div className="rounded-lg border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Informacoes complementares</p>
                              <div className="mt-1 space-y-1 text-muted-foreground">
                                <p>Concluido em {formatDateTime(exam.concluidoEm)}</p>
                                <p>Paciente {patient!.nomeCompleto}</p>
                                <p>Cirurgia {patient!.scheduledSurgery || 'Em definicao'}</p>
                                <p>Unidade {patient!.unidade}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
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
