'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, CheckCircle2, Clock, FileText, FlaskConical, Save, User } from 'lucide-react'
import { PatientStatusBadge } from '@/components/shared/badges'
import { EXAM_TYPES } from '@/lib/data/exams'
import type { ExamResult, ExamRequest, LabUrgency } from '@/lib/types'

type LocalExamStatus = 'pendente' | 'normal' | 'alterado'

type LabExamDraft = {
  observacoesLab: string
}

type PatientLabDraft = {
  labUrgency: LabUrgency | ''
  labAnalysis: string
  labNurseObservation: string
}

const urgencyMeta: Record<LabUrgency, { label: string; className: string }> = {
  emergente: { label: 'Vermelho - Emergente', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja - Muito urgente', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo - Urgente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde - Pouco urgente', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul - Nao urgente', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

export default function LaboratorioRegistrarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const {
    examRequests,
    getPatientById,
    updatePatient,
    updateExamStatus,
    addAuditLog,
  } = useData()

  const resourceId = params.id as string
  const matchedExamRequest = examRequests.find((exam) => exam.id === resourceId)
  const patientId = matchedExamRequest?.patientId || resourceId
  const patient = getPatientById(patientId)

  const patientExamRequests = useMemo(() => {
    return examRequests.filter((exam) => exam.patientId === patientId && exam.status !== 'cancelado')
  }, [examRequests, patientId])

  const examCatalog = useMemo(() => {
    return patientExamRequests
      .map((request) => {
        const examType = EXAM_TYPES.find((exam) => exam.id === request.examTypeId)
        return {
          request,
          examType,
        }
      })
      .filter((item) => item.examType)
      .sort((a, b) => {
        if (a.request.id === resourceId) return -1
        if (b.request.id === resourceId) return 1
        return a.examType!.category.localeCompare(b.examType!.category)
      })
  }, [patientExamRequests, resourceId])

  const [examResults, setExamResults] = useState<Record<string, ExamResult>>(() => patient?.examResults || {})
  const [labDrafts, setLabDrafts] = useState<Record<string, LabExamDraft>>({})
  const [patientLabDraft, setPatientLabDraft] = useState<PatientLabDraft>({
    labUrgency: patient?.labRiskClassification || '',
    labAnalysis: patient?.labRiskNotes || '',
    labNurseObservation: patient?.labNurseObservation || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!hasPermission('register_exam_result')) {
      router.push('/laboratorio')
    }
  }, [user, hasPermission, router])

  useEffect(() => {
    if (patient?.examResults) {
      setExamResults(patient.examResults)
    }
  }, [patient])

  useEffect(() => {
    setPatientLabDraft({
      labUrgency: patient?.labRiskClassification || '',
      labAnalysis: patient?.labRiskNotes || '',
      labNurseObservation: patient?.labNurseObservation || '',
    })
  }, [patient])

  useEffect(() => {
    setLabDrafts((prev) => {
      const next = { ...prev }

      patientExamRequests.forEach((request) => {
        if (!next[request.id]) {
          next[request.id] = {
            observacoesLab: request.observacoesLab || '',
          }
        }
      })

      return next
    })
  }, [patientExamRequests])

  if (!patient) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
      </div>
    )
  }

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

  const getLocalStatus = (examTypeId: string): LocalExamStatus => {
    return (examResults[examTypeId]?.status as LocalExamStatus | undefined) || 'pendente'
  }

  const handleResultChange = (examTypeId: string, field: keyof ExamResult, value: string) => {
    setExamResults((prev) => ({
      ...prev,
      [examTypeId]: {
        ...prev[examTypeId],
        [field]: value,
      },
    }))
  }

  const handleLabDraftChange = <K extends keyof LabExamDraft>(requestId: string, field: K, value: LabExamDraft[K]) => {
    setLabDrafts((prev) => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value,
      },
    }))
  }

  const completedCount = examCatalog.filter(({ request }) => {
    const status = getLocalStatus(request.examTypeId)
    return status === 'normal' || status === 'alterado'
  }).length

  const progress = examCatalog.length === 0 ? 0 : Math.round((completedCount / examCatalog.length) * 100)

  const handleSave = async (complete: boolean) => {
    setIsSaving(true)

    const allExamsCompleted = examCatalog.every(({ request }) => {
      const status = getLocalStatus(request.examTypeId)
      return status === 'normal' || status === 'alterado'
    })

    examCatalog.forEach(({ request }) => {
      const result = examResults[request.examTypeId]
      const localStatus = getLocalStatus(request.examTypeId)
      const labDraft = labDrafts[request.id]

      if (localStatus === 'normal' || localStatus === 'alterado') {
        updateExamStatus(request.id, 'concluido', {
          resultado: result?.value || '',
          observacoesLab: labDraft?.observacoesLab?.trim() || result?.notes || '',
        })
        return
      }

      if (complete || result?.value || result?.notes || labDraft?.observacoesLab) {
        updateExamStatus(request.id, 'em_analise', {
          observacoesLab: labDraft?.observacoesLab?.trim() || result?.notes || request.observacoesLab,
        })
      }
    })

    updatePatient(patientId, {
      examResults,
      status: complete && allExamsCompleted ? 'exames_concluidos' : 'exames_em_analise',
      labRiskClassification: patientLabDraft.labUrgency || undefined,
      labRiskNotes: patientLabDraft.labAnalysis.trim(),
      labNurseObservation: patientLabDraft.labNurseObservation.trim(),
      updatedAt: new Date().toISOString(),
    })

    addAuditLog({
      action: complete ? 'exames_registrados' : 'exames_atualizados',
      userId: user!.id,
      patientId,
      details: `${completedCount}/${examCatalog.length} exames com resultado registrado`,
    })

    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/laboratorio/pendentes')
      }
    }, 300)
  }

  const focusedRequest = matchedExamRequest || patientExamRequests[0]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Registro de Exames</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Ambiente de bancada para coleta, analise e liberacao de resultados laboratoriais.
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <PatientStatusBadge status={patient.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="break-words text-lg">{patient.name}</CardTitle>
                    <CardDescription className="break-words">
                      {patient.age} anos | Prontuario {patient.prontuario} | CPF {patient.cpf}
                    </CardDescription>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                  <p className="font-medium">{completedCount}/{examCatalog.length} exames</p>
                  <p className="text-muted-foreground">com registro concluido</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <span className="text-muted-foreground">Cirurgia:</span>{' '}
                <span className="font-medium">{patient.scheduledSurgery}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Telefone:</span>{' '}
                <span className="font-medium">{patient.telefone || 'Nao informado'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Unidade:</span>{' '}
                <span className="font-medium">{patient.unidade}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Entrada:</span>{' '}
                <span className="font-medium">{formatDateTime(patient.dataEntrada)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Painel de Progresso</CardTitle>
              <CardDescription>Acompanhe o status do lote de exames vinculado a este paciente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Andamento do registro</p>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} de {examCatalog.length} exames finalizados
                  </p>
                </div>
                <div className="rounded-full border px-3 py-1 text-sm font-medium">{progress}%</div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {Object.entries(
              examCatalog.reduce((acc, item) => {
                const category = item.examType!.category
                if (!acc[category]) acc[category] = []
                acc[category].push(item)
                return acc
              }, {} as Record<string, typeof examCatalog>)
            ).map(([category, exams]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    {category}
                  </CardTitle>
                  <CardDescription>{exams.length} exame(s) neste grupo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exams.map(({ request, examType }) => {
                    const localStatus = getLocalStatus(request.examTypeId)
                    const labDraft = labDrafts[request.id] || {
                      observacoesLab: request.observacoesLab || '',
                    }

                    return (
                      <div key={request.id} className="rounded-xl border p-4">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              {localStatus === 'pendente' && <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              {localStatus === 'normal' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                              {localStatus === 'alterado' && <FileText className="h-4 w-4 shrink-0 text-amber-500" />}
                              <p className="break-words font-medium">{examType!.name}</p>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Solicitação: {request.justificativa || 'Rotina laboratorial'}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Solicitado em {formatDateTime(request.solicitadoEm)}</span>
                              <span>Status atual: {request.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <Select
                            value={localStatus}
                            onValueChange={(value) => handleResultChange(request.examTypeId, 'status', value)}
                          >
                            <SelectTrigger className="w-full sm:w-[160px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="alterado">Alterado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                          <div className="space-y-2">
                            <Label>Resultado / valor encontrado</Label>
                            <Input
                              placeholder={examType!.unit ? `Ex: 5.5 ${examType!.unit}` : 'Descreva o resultado'}
                              value={examResults[request.examTypeId]?.value || ''}
                              onChange={(e) => handleResultChange(request.examTypeId, 'value', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Valor de referencia</Label>
                            <div className="flex min-h-10 items-center rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                              {examType!.referenceRange || examType!.valueReference || 'Nao informado'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Label>Observacoes laboratoriais</Label>
                          <Textarea
                            placeholder="Ex.: amostra adequada, resultado confirmado em duplicata, necessidade de recoleta..."
                            value={labDraft.observacoesLab}
                            onChange={(e) => handleLabDraftChange(request.id, 'observacoesLab', e.target.value)}
                            rows={3}
                          />
                        </div>

                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          {examCatalog.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum exame solicitado para este paciente.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ficha da Solicitação</CardTitle>
              <CardDescription>Informacoes do exame selecionado ao entrar na tela.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Exame em foco</p>
                <p className="font-medium">{matchedExamRequest?.examTypeName || focusedRequest?.examTypeName || 'Nao informado'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Solicitado por</p>
                <p className="font-medium">{focusedRequest?.solicitadoPor || 'Nao informado'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data da solicitacao</p>
                <p className="font-medium">{formatDateTime(focusedRequest?.solicitadoEm)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ultimo movimento</p>
                <p className="font-medium">
                  {formatDateTime(
                    focusedRequest?.concluidoEm ||
                    focusedRequest?.analisadoEm ||
                    focusedRequest?.coletadoEm ||
                    focusedRequest?.solicitadoEm
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classificacao de Risco do Paciente</CardTitle>
              <CardDescription>A cor de risco e a observacao do laboratorio sao definidas no nivel do paciente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria de risco por paciente</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.entries(urgencyMeta) as Array<[LabUrgency, { label: string; className: string }]>).map(
                    ([urgency, meta]) => (
                      <button
                        key={urgency}
                        type="button"
                        onClick={() => setPatientLabDraft((prev) => ({ ...prev, labUrgency: urgency }))}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${meta.className} ${patientLabDraft.labUrgency === urgency ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      >
                        {meta.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Analise de risco do laboratorio</Label>
                <Textarea
                  placeholder="Descreva a interpretacao global do laboratorio para este paciente."
                  value={patientLabDraft.labAnalysis}
                  onChange={(e) => setPatientLabDraft((prev) => ({ ...prev, labAnalysis: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Observacao do enfermeiro do laboratorio</Label>
                <Textarea
                  placeholder="Registre a observacao assistencial do laboratorio para o paciente."
                  value={patientLabDraft.labNurseObservation}
                  onChange={(e) => setPatientLabDraft((prev) => ({ ...prev, labNurseObservation: e.target.value }))}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="flex flex-col gap-3 pt-6">
              <Button className="w-full" variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                Salvar Parcial
              </Button>
              <Button className="w-full" onClick={() => handleSave(true)} disabled={isSaving || completedCount < examCatalog.length}>
                <Save className="mr-2 h-4 w-4" />
                Finalizar Registro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
