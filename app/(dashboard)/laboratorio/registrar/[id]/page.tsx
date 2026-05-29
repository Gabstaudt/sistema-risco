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
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, FlaskConical, Save, User } from 'lucide-react'
import { PatientStatusBadge } from '@/components/shared/badges'
import { EXAM_TYPES } from '@/lib/data/exams'
import type { ExamResult, LabUrgency, PatientStatus } from '@/lib/types'

type LocalExamStatus = 'pendente' | 'normal' | 'alterado'

type LabExamDraft = {
  observacoesLab: string
}

type PatientLabDraft = {
  labUrgency: LabUrgency | ''
  labAnalysis: string
  labNurseObservation: string
}

function getEffectiveRiskClassification(triageRisk?: LabUrgency, updatedRisk?: LabUrgency) {
  return updatedRisk || triageRisk || ''
}

const urgencyMeta: Record<LabUrgency, { label: string; className: string; rank: number }> = {
  emergente: { label: 'Vermelho - Emergente', className: 'bg-red-100 text-red-800 border-red-200', rank: 0 },
  muito_urgente: { label: 'Laranja - Muito urgente', className: 'bg-orange-100 text-orange-800 border-orange-200', rank: 1 },
  urgente: { label: 'Amarelo - Urgente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', rank: 2 },
  pouco_urgente: { label: 'Verde - Pouco urgente', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', rank: 3 },
  nao_urgente: { label: 'Azul - Nao urgente', className: 'bg-sky-100 text-sky-800 border-sky-200', rank: 4 },
}

const examWorkflowMeta = {
  solicitado: { label: 'Aguardando coleta', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  coletado: { label: 'Em execucao', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  em_analise: { label: 'Em execucao', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  concluido: { label: 'Concluido', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-slate-100 text-slate-700 border-slate-200' },
} as const

function formatDateTime(value?: string) {
  if (!value) return 'Nao informado'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatWaitingTime(value?: string) {
  if (!value) return 'Tempo nao informado'

  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}min`

  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function inferTraumaText(patientComplaint?: string, patientDescription?: string, diagnosis?: string) {
  const source = `${patientComplaint || ''} ${patientDescription || ''} ${diagnosis || ''}`.toLowerCase()
  return ['trauma', 'fratura', 'acidente', 'queda', 'atropel', 'politrauma'].some((term) => source.includes(term))
}

export default function LaboratorioRegistrarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { examRequests, getPatientById, updatePatient, updateExamStatus, addAuditLog } = useData()

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
        return { request, examType }
      })
      .filter((item) => item.examType)
      .sort((a, b) => {
        if (a.request.id === resourceId) return -1
        if (b.request.id === resourceId) return 1
        return new Date(a.request.solicitadoEm).getTime() - new Date(b.request.solicitadoEm).getTime()
      })
  }, [patientExamRequests, resourceId])

  const [examResults, setExamResults] = useState<Record<string, ExamResult>>(() => patient?.examResults || {})
  const [labDrafts, setLabDrafts] = useState<Record<string, LabExamDraft>>({})
  const [patientLabDraft, setPatientLabDraft] = useState<PatientLabDraft>({
    labUrgency: getEffectiveRiskClassification(patient?.triageRiskClassification, patient?.labRiskClassification),
    labAnalysis: patient?.labRiskNotes || '',
    labNurseObservation: patient?.labNurseObservation || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isAuthLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!hasPermission('register_exam_result')) {
      router.replace('/laboratorio')
    }
  }, [user, hasPermission, router, isAuthLoading])

  if (isAuthLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  useEffect(() => {
    if (patient?.examResults) {
      setExamResults(patient.examResults)
    }
  }, [patient])

  useEffect(() => {
    setPatientLabDraft({
      labUrgency: getEffectiveRiskClassification(patient?.triageRiskClassification, patient?.labRiskClassification),
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
  const allExamsCompleted = examCatalog.every(({ request }) => {
    const status = getLocalStatus(request.examTypeId)
    return status === 'normal' || status === 'alterado'
  })

  const waitingSince = examCatalog
    .map(({ request }) => request.solicitadoEm)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0]

  const trauma = inferTraumaText(patient.queixaPrincipal, patient.descricaoInicial, patient.avaliacaoClinica?.hipoteseDiagnostica)
  const clinicalOwner = patient.triageAssignedClinicianName || patient.requestingPhysician || patient.avaliacaoClinica?.avaliadoPor || 'Equipe clinica'
  const surgicalOwner = patient.clinicalAssignedSurgeonName || 'Nao atribuido'
  const nextDestination: PatientStatus =
    allExamsCompleted && patient.clinicalRequestsSurgicalRisk ? 'aguardando_cirurgiao' : 'aguardando_clinico'

  const criticalAlerts = useMemo(() => {
    const alerts: string[] = []

    if (patient.avaliacaoClinica?.comorbidades?.anticoagulantes) {
      alerts.push('Paciente em uso de anticoagulante.')
    }

    if ((patient.avaliacaoClinica?.comorbidades?.alergias || []).length > 0) {
      alerts.push(`Alergias registradas: ${(patient.avaliacaoClinica?.comorbidades?.alergias || []).join(', ')}.`)
    }

    if (patient.avaliacaoClinica?.comorbidades?.anticoagulantes || examCatalog.some(({ request }) => request.examTypeName.toLowerCase().includes('coag'))) {
      alerts.push('Risco hemorragico exige leitura prioritaria dos exames de coagulação.')
    }

    if ((patient.sinaisVitais?.temperatura || 0) >= 38.5 || (patient.descricaoInicial || '').toLowerCase().includes('infecc') || (patient.descricaoInicial || '').toLowerCase().includes('sep')) {
      alerts.push('Suspeita infecciosa / septica. Avaliar resultados com leitura assistencial rapida.')
    }

    const alteredExamCount = examCatalog.filter(({ request }) => getLocalStatus(request.examTypeId) === 'alterado').length
    if (alteredExamCount > 0) {
      alerts.push(`${alteredExamCount} exame(s) com resultado alterado.`)
    }

    if (patientLabDraft.labUrgency === 'emergente' || patientLabDraft.labUrgency === 'muito_urgente') {
      alerts.push('Classificacao laboratorial alta. Medico deve ser alertado imediatamente apos a liberacao.')
    }

    return alerts
  }, [examCatalog, patient, patientLabDraft.labUrgency])

  const focusedRequest = matchedExamRequest || patientExamRequests[0]

  const handleSave = async (complete: boolean) => {
    setIsSaving(true)

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
      status: complete && allExamsCompleted ? nextDestination : 'exames_em_analise',
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

    if (complete && allExamsCompleted) {
      const alertRecipients = [
        `Clinico responsavel: ${clinicalOwner}`,
        patient.clinicalRequestsSurgicalRisk ? `Cirurgiao de risco: ${surgicalOwner}` : null,
      ].filter(Boolean)

      addAuditLog({
        action: 'resultado_exame',
        userId: user!.id,
        patientId,
        details: `Encaminhamento automatico do laboratorio para ${alertRecipients.join(' | ')}. Destino do fluxo: ${nextDestination}.`,
      })

      if (criticalAlerts.length > 0) {
        addAuditLog({
          action: 'resultado_exame',
          userId: user!.id,
          patientId,
          details: `Alertas criticos laboratoriais: ${criticalAlerts.join(' ')}`,
        })
      }
    }

    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/laboratorio')
      }
    }, 300)
  }

  const canFinalize =
    allExamsCompleted &&
    !!patientLabDraft.labUrgency &&
    patientLabDraft.labAnalysis.trim().length > 0 &&
    patientLabDraft.labNurseObservation.trim().length > 0

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Painel Laboratorial</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Ambiente operacional para executar exames, registrar resultados estruturados, classificar criticidade e devolver o caso automaticamente ao medico responsavel.
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
                    <CardTitle className="break-words text-lg">{patient.nomeCompleto}</CardTitle>
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
            <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Prioridade e tempo</p>
                <p className="mt-1 font-medium">
                  {getEffectiveRiskClassification(patient.triageRiskClassification, patient.labRiskClassification)
                    ? urgencyMeta[getEffectiveRiskClassification(patient.triageRiskClassification, patient.labRiskClassification) as LabUrgency].label
                    : 'Sem cor registrada'}
                </p>
                <p className="mt-1 text-muted-foreground">Aguardando ha {formatWaitingTime(waitingSince || patient.dataEntrada)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinico responsavel</p>
                <p className="mt-1 break-words font-medium">{clinicalOwner}</p>
                <p className="mt-1 text-muted-foreground">{patient.unidade}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cirurgia / contexto</p>
                <p className="mt-1 break-words font-medium">{patient.scheduledSurgery || 'Sem cirurgia definida'}</p>
                <p className="mt-1 text-muted-foreground">
                  {patient.avaliacaoClinica?.urgencia ? `Urgencia ${patient.avaliacaoClinica.urgencia}` : 'Sem urgencia cirurgica registrada'}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sinal rapido</p>
                <p className="mt-1 font-medium">{trauma ? 'Trauma / evento agudo' : 'Fluxo clinico habitual'}</p>
                <p className="mt-1 text-muted-foreground">Entrada em {formatDateTime(patient.dataEntrada)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Controle Operacional</CardTitle>
              <CardDescription>Progresso do lote de exames e status do trabalho de bancada.</CardDescription>
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
              }, {} as Record<string, typeof examCatalog>),
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
                    const labDraft = labDrafts[request.id] || { observacoesLab: request.observacoesLab || '' }
                    const workflow = examWorkflowMeta[request.status]

                    return (
                      <div key={request.id} className="rounded-xl border p-4">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {localStatus === 'pendente' && <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                {localStatus === 'normal' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                                {localStatus === 'alterado' && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
                                <p className="break-words font-medium">{examType!.name}</p>
                              </div>
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${workflow.className}`}>
                                {workflow.label}
                              </span>
                              {localStatus === 'alterado' ? (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                  Resultado critico / alterado
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Solicitacao: {request.justificativa || 'Rotina laboratorial'}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Solicitado em {formatDateTime(request.solicitadoEm)}</span>
                              <span>Ultimo movimento {formatDateTime(request.concluidoEm || request.analisadoEm || request.coletadoEm || request.solicitadoEm)}</span>
                            </div>
                          </div>
                          <Select
                            value={localStatus}
                            onValueChange={(value) => handleResultChange(request.examTypeId, 'status', value)}
                          >
                            <SelectTrigger className="w-full sm:w-[170px]">
                              <SelectValue placeholder="Resultado" />
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

          {examCatalog.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum exame solicitado para este paciente.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Painel Operacional do Paciente</CardTitle>
              <CardDescription>Somente o necessario para a execucao assistencial do laboratorio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Exame em foco</p>
                <p className="font-medium">{matchedExamRequest?.examTypeName || focusedRequest?.examTypeName || 'Nao informado'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Queixa inicial</p>
                <p className="break-words font-medium">{patient.queixaPrincipal || 'Nao informada'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clinico responsavel</p>
                <p className="break-words font-medium">{clinicalOwner}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tempo aguardando</p>
                <p className="font-medium">{formatWaitingTime(waitingSince || patient.dataEntrada)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Solicitacao original</p>
                <p className="font-medium">{formatDateTime(focusedRequest?.solicitadoEm)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertas Criticos</CardTitle>
              <CardDescription>Leitura rapida antes de liberar resultado ou classificar risco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalAlerts.length === 0 ? (
                <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Nenhum alerta critico automatico detectado neste momento.
                </div>
              ) : (
                criticalAlerts.map((alert) => (
                  <div key={alert} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    {alert}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classificacao de Risco do Paciente</CardTitle>
              <CardDescription>A cor de risco e as observacoes sao definidas no nivel do paciente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria de risco por paciente</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.entries(urgencyMeta) as Array<[LabUrgency, { label: string; className: string; rank: number }]>).sort((left, right) => left[1].rank - right[1].rank).map(
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
                  placeholder="Descreva a interpretacao global dos exames e o impacto assistencial para o caso."
                  value={patientLabDraft.labAnalysis}
                  onChange={(e) => setPatientLabDraft((prev) => ({ ...prev, labAnalysis: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Observacao do enfermeiro do laboratorio</Label>
                <Textarea
                  placeholder="Registre a observacao assistencial da equipe do laboratorio para o paciente."
                  value={patientLabDraft.labNurseObservation}
                  onChange={(e) => setPatientLabDraft((prev) => ({ ...prev, labNurseObservation: e.target.value }))}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Encaminhamento Automatico</CardTitle>
              <CardDescription>O laboratorio devolve o caso automaticamente para o proximo responsavel assistencial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-muted-foreground">Clinico de retorno</p>
                <p className="mt-1 break-words font-medium">{clinicalOwner}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-muted-foreground">Cirurgiao para risco cirurgico</p>
                <p className="mt-1 break-words font-medium">
                  {patient.clinicalRequestsSurgicalRisk ? surgicalOwner : 'Nao solicitado pelo clinico'}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-muted-foreground">Destino ao finalizar</p>
                <p className="mt-1 font-medium">
                  {patient.clinicalRequestsSurgicalRisk ? 'Encaminhar para risco cirurgico' : 'Retornar para revisao clinica'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="flex flex-col gap-3 pt-6">
              <Button className="w-full" variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                Salvar Parcial
              </Button>
              <Button className="w-full" onClick={() => handleSave(true)} disabled={isSaving || !canFinalize}>
                <Save className="mr-2 h-4 w-4" />
                Finalizar e Encaminhar
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
