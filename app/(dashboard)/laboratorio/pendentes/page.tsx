'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, ChevronDown, ChevronUp, FlaskConical, Save, Search } from 'lucide-react'
import type { ExamRequest, LabUrgency } from '@/lib/types'

const urgencyMeta: Record<LabUrgency, { label: string; className: string }> = {
  emergente: { label: 'Vermelho - Emergente', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja - Muito urgente', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo - Urgente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde - Pouco urgente', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul - Nao urgente', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

type DraftState = {
  labUrgency: LabUrgency | ''
  labAnalysis: string
  observacoesLab: string
}

function getEffectiveRiskClassification(triageRisk?: LabUrgency, updatedRisk?: LabUrgency) {
  return updatedRisk || triageRisk || ''
}

export default function LaboratorioPendentesPage() {
  const { user } = useAuth()
  const { examRequests, patients, updatePatient, addAuditLog } = useData()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})

  const pendingReleaseItems = useMemo(() => {
    return examRequests
      .filter((exam) => exam.status === 'concluido')
      .map((exam) => ({
        exam,
        patient: patients.find((patient) => patient.id === exam.patientId),
      }))
      .filter((item) => item.patient && !item.patient.labRiskClassification)
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

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }

      pendingReleaseItems.forEach(({ exam }) => {
        const patient = patients.find((item) => item.id === exam.patientId)
        if (!next[exam.id]) {
          next[exam.id] = {
            labUrgency: getEffectiveRiskClassification(patient?.triageRiskClassification, patient?.labRiskClassification),
            labAnalysis: '',
            observacoesLab: '',
          }
        }
      })

      return next
    })
  }, [pendingReleaseItems, patients])

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

  const updateDraft = <K extends keyof DraftState>(examId: string, field: K, value: DraftState[K]) => {
    setDrafts((prev) => ({
      ...prev,
      [examId]: {
        ...prev[examId],
        [field]: value,
      },
    }))
  }

  const handleSave = (exam: ExamRequest) => {
    const draft = drafts[exam.id]
    if (!draft?.labUrgency || !draft.observacoesLab.trim()) return

    setSavingId(exam.id)

    updatePatient(exam.patientId, {
      labRiskClassification: draft.labUrgency,
      labRiskNotes: draft.labAnalysis.trim(),
      labNurseObservation: draft.observacoesLab.trim(),
    })

    addAuditLog({
      action: 'resultado_exame',
      patientId: exam.patientId,
      userId: user?.id,
      details: `Paciente recebeu classificacao laboratorial ${draft.labUrgency} a partir do exame ${exam.examTypeName}`,
    })

    setTimeout(() => {
      setSavingId(null)
      setExpandedId(null)
    }, 250)
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Exames Pendentes' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Exames Pendentes</h1>
          <p className="max-w-3xl text-muted-foreground">
            Lista de exames aguardando liberacao e atribuicao do laboratorio. Nesta tela a equipe classifica a cor
            do exame e registra a observacao do enfermeiro do laboratorio.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fila de Liberacao e Atribuicao</CardTitle>
            <CardDescription>{pendingReleaseItems.length} exame(s) aguardando classificacao do laboratorio.</CardDescription>
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

            {pendingReleaseItems.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum exame aguardando liberacao no momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReleaseItems.map(({ exam, patient }) => {
                  const isExpanded = expandedId === exam.id
                  const draft = drafts[exam.id] || {
                    labUrgency: getEffectiveRiskClassification(patient?.triageRiskClassification, patient?.labRiskClassification),
                    labAnalysis: '',
                    observacoesLab: '',
                  }

                  return (
                    <div key={exam.id} className="rounded-xl border bg-card p-4 transition-colors hover:bg-accent/20">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <Link
                          href={`/laboratorio/resultado/${exam.id}`}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg outline-none transition-colors hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <FlaskConical className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-medium">{exam.examTypeName}</p>
                            <p className="text-sm text-muted-foreground">
                              {patient!.nomeCompleto} | {patient!.prontuario} | {patient!.scheduledSurgery || 'Cirurgia em definicao'}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Resultado concluido em {formatDateTime(exam.concluidoEm)}</span>
                              <span>Unidade {patient!.unidade}</span>
                              <span>{patient!.idade} anos</span>
                              <span>
                                Risco atual {getEffectiveRiskClassification(patient!.triageRiskClassification, patient!.labRiskClassification)
                                  ? urgencyMeta[getEffectiveRiskClassification(patient!.triageRiskClassification, patient!.labRiskClassification) as LabUrgency].label
                                  : 'nao definido'}
                              </span>
                            </div>
                          </div>
                        </Link>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
                            Aguardando liberacao e atribuicao
                          </span>
                          <Button asChild variant="secondary">
                            <Link href={`/laboratorio/resultado/${exam.id}`}>Abrir ficha completa</Link>
                          </Button>
                          <Button variant="outline" onClick={() => setExpandedId(isExpanded ? null : exam.id)}>
                            {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                            {isExpanded ? 'Fechar' : 'Classificar'}
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 grid gap-4 rounded-xl border border-dashed bg-muted/10 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                          <div className="space-y-4">
                            <div className="grid gap-3 text-sm md:grid-cols-2">
                              <div className="rounded-lg border bg-card p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</p>
                                <p className="mt-1 break-words font-medium">{patient!.nomeCompleto}</p>
                                <p className="mt-1 text-muted-foreground">
                                  {patient!.idade} anos | Prontuario {patient!.prontuario}
                                </p>
                              </div>
                              <div className="rounded-lg border bg-card p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Procedimento</p>
                                <p className="mt-1 break-words font-medium">{patient!.scheduledSurgery || 'Em definicao'}</p>
                                <p className="mt-1 text-muted-foreground">Unidade {patient!.unidade}</p>
                              </div>
                            </div>

                            <div className="rounded-lg border bg-card p-3 text-sm">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Resultado do exame</p>
                              <p className="mt-1 break-words font-medium">{exam.resultado || 'Nao informado'}</p>
                            </div>

                            <div className="rounded-lg border bg-card p-3 text-sm">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Solicitacao e historico</p>
                              <div className="mt-2 space-y-1 text-muted-foreground">
                                <p>Justificativa: {exam.justificativa || 'Rotina laboratorial'}</p>
                                <p>Solicitado em: {formatDateTime(exam.solicitadoEm)}</p>
                                <p>Ultimo movimento: {formatDateTime(exam.analisadoEm || exam.coletadoEm || exam.concluidoEm)}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`analysis-${exam.id}`}>Analise complementar do laboratorio</Label>
                              <Textarea
                                id={`analysis-${exam.id}`}
                                rows={4}
                                placeholder="Descreva a leitura tecnica, contexto do exame e impacto assistencial."
                                value={draft.labAnalysis}
                                onChange={(e) => updateDraft(exam.id, 'labAnalysis', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Classificacao por cor</Label>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(Object.entries(urgencyMeta) as Array<[LabUrgency, { label: string; className: string }]>).map(
                                  ([urgency, meta]) => (
                                    <button
                                      key={urgency}
                                      type="button"
                                      onClick={() => updateDraft(exam.id, 'labUrgency', urgency)}
                                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${meta.className} ${draft.labUrgency === urgency ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                    >
                                      {meta.label}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`obs-${exam.id}`}>Observacao do enfermeiro do laboratorio</Label>
                              <Textarea
                                id={`obs-${exam.id}`}
                                rows={4}
                                placeholder="Registre a observacao da equipe do laboratorio para este exame."
                                value={draft.observacoesLab}
                                onChange={(e) => updateDraft(exam.id, 'observacoesLab', e.target.value)}
                              />
                            </div>

                            <Button
                              className="w-full"
                              onClick={() => handleSave(exam)}
                              disabled={savingId === exam.id || !draft.labUrgency || !draft.observacoesLab.trim()}
                            >
                              <Save className="mr-2 h-4 w-4" />
                              {savingId === exam.id ? 'Salvando...' : 'Salvar classificacao'}
                            </Button>
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
