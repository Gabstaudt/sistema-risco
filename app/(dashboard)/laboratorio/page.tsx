'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowRight, Clock, FlaskConical } from 'lucide-react'
import type { ExamRequest, LabUrgency, Patient, Priority, SurgeryUrgency } from '@/lib/types'

const urgencyMeta: Record<LabUrgency, { label: string; shortLabel: string; className: string; rank: number }> = {
  emergente: { label: 'Vermelho - Emergente', shortLabel: 'Vermelho', className: 'bg-red-100 text-red-800 border-red-200', rank: 0 },
  muito_urgente: { label: 'Laranja - Muito urgente', shortLabel: 'Laranja', className: 'bg-orange-100 text-orange-800 border-orange-200', rank: 1 },
  urgente: { label: 'Amarelo - Urgente', shortLabel: 'Amarelo', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', rank: 2 },
  pouco_urgente: { label: 'Verde - Pouco urgente', shortLabel: 'Verde', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', rank: 3 },
  nao_urgente: { label: 'Azul - Nao urgente', shortLabel: 'Azul', className: 'bg-sky-100 text-sky-800 border-sky-200', rank: 4 },
}

const priorityRank: Record<Priority, number> = {
  urgente: 0,
  alta: 1,
  normal: 2,
  baixa: 3,
}

const surgeryUrgencyRank: Record<SurgeryUrgency, number> = {
  emergencia: 0,
  urgencia: 1,
  eletiva: 2,
}

type QueueStage = 'aguardando_coleta' | 'em_execucao' | 'aguardando_liberacao'

const stageMeta: Record<QueueStage, { label: string; className: string; rank: number }> = {
  aguardando_coleta: { label: 'Aguardando coleta', className: 'bg-amber-100 text-amber-800', rank: 0 },
  em_execucao: { label: 'Em coleta / execucao', className: 'bg-blue-100 text-blue-800', rank: 1 },
  aguardando_liberacao: { label: 'Aguardando liberacao', className: 'bg-rose-100 text-rose-800', rank: 2 },
}

type QueueItem = {
  patient: Patient
  exams: ExamRequest[]
  focusedExam: ExamRequest
  stage: QueueStage
  waitingSince: string
  triageUrgency: LabUrgency
  trauma: boolean
  clinicalUrgency: SurgeryUrgency | null
  clinicianName: string
  requestingSector: string
  examSummary: string
  hints: string[]
}

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

function getRiskClassification(patient: Patient): LabUrgency {
  if (patient.labRiskClassification) return patient.labRiskClassification
  if (patient.triageRiskClassification) return patient.triageRiskClassification

  if (patient.prioridade === 'urgente') return 'muito_urgente'
  if (patient.prioridade === 'alta') return 'urgente'
  if (patient.prioridade === 'normal') return 'pouco_urgente'
  return 'nao_urgente'
}

function inferTrauma(patient: Patient) {
  const source = `${patient.queixaPrincipal || ''} ${patient.descricaoInicial || ''} ${patient.avaliacaoClinica?.hipoteseDiagnostica || ''}`.toLowerCase()
  return ['trauma', 'fratura', 'acidente', 'queda', 'atropel', 'politrauma'].some((term) => source.includes(term))
}

function getRequestingSector(patient: Patient) {
  if (patient.clinicalRequestsSurgicalRisk) return 'Clinica / preparo cirurgico'
  if (patient.avaliacaoClinica) return 'Clinica medica'
  return 'Triagem / pronto atendimento'
}

function getClinicianName(patient: Patient) {
  return patient.triageAssignedClinicianName || patient.requestingPhysician || patient.avaliacaoClinica?.avaliadoPor || 'Equipe clinica'
}

function getQueueStage(exams: ExamRequest[], patient: Patient): QueueStage {
  if (exams.some((exam) => exam.status === 'solicitado')) return 'aguardando_coleta'
  if (exams.some((exam) => exam.status === 'coletado' || exam.status === 'em_analise')) return 'em_execucao'
  if (exams.some((exam) => exam.status === 'concluido' && !patient.labRiskClassification)) return 'aguardando_liberacao'
  return 'aguardando_coleta'
}

function getWaitingSince(exams: ExamRequest[], stage: QueueStage) {
  const pool = exams
    .map((exam) => {
      if (stage === 'aguardando_liberacao') return exam.concluidoEm || exam.analisadoEm || exam.coletadoEm || exam.solicitadoEm
      if (stage === 'em_execucao') return exam.analisadoEm || exam.coletadoEm || exam.solicitadoEm
      return exam.solicitadoEm
    })
    .filter(Boolean) as string[]

  return pool.sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0]
}

function buildHints(patient: Patient, triageUrgency: LabUrgency, trauma: boolean, clinicalUrgency: SurgeryUrgency | null) {
  const hints: string[] = []
  const surgery = (patient.scheduledSurgery || patient.avaliacaoClinica?.tipoCirurgia || '').toLowerCase()
  const temperature = patient.sinaisVitais?.temperatura
  const oxygen = patient.sinaisVitais?.saturacao

  if (trauma) hints.push('Trauma / mecanismo recente')
  if (surgery.includes('ortop') || surgery.includes('fratura')) hints.push('Pre-operatorio ortopedico')
  if (clinicalUrgency === 'urgencia' || clinicalUrgency === 'emergencia') hints.push('Urgencia cirurgica')
  if (triageUrgency === 'emergente' || triageUrgency === 'muito_urgente') hints.push('Paciente instavel')
  if (temperature && temperature >= 38.5) hints.push('Suspeita infecciosa / septica')
  if (oxygen && oxygen < 92) hints.push('Dessaturacao em monitoramento')
  if (patient.avaliacaoClinica?.comorbidades?.anticoagulantes) hints.push('Uso de anticoagulante')

  return hints
}

export default function LaboratorioDashboard() {
  const { examRequests, patients } = useData()

  const intelligentQueue = useMemo(() => {
    const grouped = new Map<string, ExamRequest[]>()

    examRequests.forEach((exam) => {
      const patient = patients.find((item) => item.id === exam.patientId)
      if (!patient || exam.status === 'cancelado') return

      const needsLabAction =
        exam.status === 'solicitado' ||
        exam.status === 'coletado' ||
        exam.status === 'em_analise' ||
        (exam.status === 'concluido' && !patient.labRiskClassification)

      if (!needsLabAction) return

      if (!grouped.has(exam.patientId)) grouped.set(exam.patientId, [])
      grouped.get(exam.patientId)!.push(exam)
    })

    return Array.from(grouped.entries())
      .map(([patientId, exams]) => {
        const patient = patients.find((item) => item.id === patientId)
        if (!patient) return null

        const stage = getQueueStage(exams, patient)
        const triageUrgency = getRiskClassification(patient)
        const trauma = inferTrauma(patient)
        const clinicalUrgency = patient.avaliacaoClinica?.urgencia || patient.avaliacaoCirurgica?.urgencia || null
        const waitingSince = getWaitingSince(exams, stage)
        const clinicianName = getClinicianName(patient)
        const examSummary = exams.slice(0, 3).map((exam) => exam.examTypeName).join(' + ')
        const hints = buildHints(patient, triageUrgency, trauma, clinicalUrgency)

        const focusedExam =
          exams.find((exam) => exam.status === 'solicitado') ||
          exams.find((exam) => exam.status === 'coletado') ||
          exams.find((exam) => exam.status === 'em_analise') ||
          exams[0]

        return {
          patient,
          exams,
          focusedExam,
          stage,
          waitingSince,
          triageUrgency,
          trauma,
          clinicalUrgency,
          clinicianName,
          requestingSector: getRequestingSector(patient),
          examSummary,
          hints,
        } satisfies QueueItem
      })
      .filter((item): item is QueueItem => Boolean(item))
      .sort((left, right) => {
        const urgencyDiff = urgencyMeta[left.triageUrgency].rank - urgencyMeta[right.triageUrgency].rank
        if (urgencyDiff !== 0) return urgencyDiff

        const priorityDiff = priorityRank[left.patient.prioridade] - priorityRank[right.patient.prioridade]
        if (priorityDiff !== 0) return priorityDiff

        const surgeryDiff =
          surgeryUrgencyRank[left.clinicalUrgency || 'eletiva'] - surgeryUrgencyRank[right.clinicalUrgency || 'eletiva']
        if (surgeryDiff !== 0) return surgeryDiff

        const stageDiff = stageMeta[left.stage].rank - stageMeta[right.stage].rank
        if (stageDiff !== 0) return stageDiff

        return new Date(left.waitingSince || left.patient.dataEntrada).getTime() - new Date(right.waitingSince || right.patient.dataEntrada).getTime()
      })
  }, [examRequests, patients])

  const stats = useMemo(() => {
    const critical = intelligentQueue.filter((item) => ['emergente', 'muito_urgente'].includes(item.triageUrgency)).length
    const inExecution = intelligentQueue.filter((item) => item.stage === 'em_execucao').length
    const waitingCollection = intelligentQueue.filter((item) => item.stage === 'aguardando_coleta').length
    const waitingRelease = intelligentQueue.filter((item) => item.stage === 'aguardando_liberacao').length

    return { critical, inExecution, waitingCollection, waitingRelease }
  }, [intelligentQueue])

  return (
    <>
      <Header breadcrumbs={[{ label: 'Laboratorio' }]} />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Fila Laboratorial Inteligente</h1>
            <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
              A bancada recebe a fila automaticamente por gravidade, prioridade clinica, urgencia cirurgica e tempo de espera. O laboratorio atua sobre a fila; nao precisa procurar paciente manualmente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/laboratorio/pendentes">Pendentes de liberacao</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/laboratorio/concluidos">Exames concluidos</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fila total</CardDescription>
              <CardTitle className="text-2xl">{intelligentQueue.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Pacientes com acao operacional pendente no laboratorio.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Prioridade maxima</CardDescription>
              <CardTitle className="text-2xl">{stats.critical}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Vermelho e laranja sobem para o topo, independente da ordem de chegada.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Em execucao</CardDescription>
              <CardTitle className="text-2xl">{stats.inExecution}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Exames ja coletados ou em processamento na bancada.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Aguardando coleta / liberacao</CardDescription>
              <CardTitle className="text-2xl">{stats.waitingCollection + stats.waitingRelease}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Pacientes ainda sem coleta concluida ou com resultado pronto aguardando classificacao.</CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Fila principal</CardTitle>
              <CardDescription>
                Ordenacao automatica por cor da triagem, prioridade clinica, urgencia cirurgica e tempo aguardando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {intelligentQueue.length === 0 ? (
                <div className="rounded-xl border border-dashed px-6 py-12 text-center">
                  <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Nenhum exame aguardando acao do laboratorio no momento.</p>
                </div>
              ) : (
                intelligentQueue.map((item) => (
                  <div key={item.patient.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${urgencyMeta[item.triageUrgency].className}`}>
                            {urgencyMeta[item.triageUrgency].label}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${stageMeta[item.stage].className}`}>
                            {stageMeta[item.stage].label}
                          </span>
                          {item.trauma ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
                              Trauma
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <h2 className="break-words text-lg font-semibold text-foreground">{item.patient.nomeCompleto}</h2>
                          <p className="text-sm text-muted-foreground">
                            {item.patient.idade} anos | Entrada em {formatDateTime(item.patient.dataEntrada)} | Tempo aguardando {formatWaitingTime(item.waitingSince)}
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-xl border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Exames</p>
                            <p className="mt-1 break-words font-medium">{item.examSummary}</p>
                            {item.exams.length > 3 ? <p className="mt-1 text-xs text-muted-foreground">+{item.exams.length - 3} exame(s)</p> : null}
                          </div>
                          <div className="rounded-xl border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinico responsavel</p>
                            <p className="mt-1 break-words font-medium">{item.clinicianName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.requestingSector}</p>
                          </div>
                          <div className="rounded-xl border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cirurgia / contexto</p>
                            <p className="mt-1 break-words font-medium">{item.patient.scheduledSurgery || 'Sem cirurgia definida'}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.clinicalUrgency ? `Urgencia ${item.clinicalUrgency}` : 'Sem urgencia cirurgica registrada'}
                            </p>
                          </div>
                        </div>

                        {item.hints.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.hints.map((hint) => (
                              <span key={hint} className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                                {hint}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
                        <Button asChild className="w-full sm:w-[190px]">
                          <Link href={`/laboratorio/resultado/${item.focusedExam.id}`}>
                            Abrir painel laboratorial
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                          <p className="font-medium">{item.exams.length} exame(s) em trabalho</p>
                          <p className="mt-1 text-muted-foreground">Solicitante: {item.focusedExam.solicitadoPor || 'Nao informado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Prioridade assistencial
                </CardTitle>
                <CardDescription>Regras operacionais da fila inteligente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border bg-red-50 p-3 text-red-900">Vermelho sempre sobe, mesmo que o paciente tenha chegado depois.</div>
                <div className="rounded-xl border bg-orange-50 p-3 text-orange-900">Laranja e amarelo permanecem acima das coletas eletivas e liberacoes rotineiras.</div>
                <div className="rounded-xl border bg-slate-50 p-3 text-slate-800">Empates sao resolvidos por prioridade clinica, urgencia cirurgica e tempo aguardando.</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Sinalizadores
                </CardTitle>
                <CardDescription>O que a equipe precisa bater o olho antes de abrir a ficha.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Tempo aguardando</p>
                    <p className="text-muted-foreground">Toda solicitacao exibe horario de entrada e tempo ativo de espera.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Clinico responsavel</p>
                    <p className="text-muted-foreground">A ficha ja informa para quem o laboratorio precisa devolver o caso.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border p-3">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Cirurgia e contexto</p>
                    <p className="text-muted-foreground">Urgencia cirurgica, trauma e preparo pre-operatorio entram na ordem da fila.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
