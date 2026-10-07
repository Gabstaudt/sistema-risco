'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { nextAssessmentStatus } from '@/lib/assessment-requests'
import { Header } from '@/components/layout/header'
import { ASABadge, PatientStatusBadge } from '@/components/shared/badges'
import { PatientExamsHistory } from '@/components/shared/patient-exams-history'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import type { ASAClassification } from '@/lib/types'
import { Activity, ArrowLeft, Save, ShieldPlus, Syringe, User } from 'lucide-react'

type Recommendation = 'aprovar' | 'reavaliar' | 'contraindicar'

export default function AnestesistaAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { getPatientById, getExamRequestsByPatient, updatePatient, addAuditLog } = useData()

  const patientId = params.id as string
  const patient = getPatientById(patientId)
  const anesthesiaAssessment = patient?.anesthesiaAssessment
  const clinicalEvaluation = patient?.clinicalEvaluation
  const cardiologyAssessment = patient?.cardiologyAssessment

  const [anestheticHistory, setAnestheticHistory] = useState(anesthesiaAssessment?.anestheticHistory || '')
  const [airwayAssessment, setAirwayAssessment] = useState(anesthesiaAssessment?.airwayAssessment || '')
  const [asaClassification, setAsaClassification] = useState<ASAClassification | ''>(anesthesiaAssessment?.asaClassification || '')
  const [needsAdditionalEvaluation, setNeedsAdditionalEvaluation] = useState(Boolean(anesthesiaAssessment?.requestsAdditionalEvaluation))
  const [additionalRequests, setAdditionalRequests] = useState(anesthesiaAssessment?.additionalRequests || '')
  const [fitForAnesthesia, setFitForAnesthesia] = useState<boolean | null>(
    anesthesiaAssessment?.fitForAnesthesia === undefined ? null : anesthesiaAssessment.fitForAnesthesia,
  )
  const [anesthesiaType, setAnesthesiaType] = useState(anesthesiaAssessment?.anesthesiaType || '')
  const [recommendation, setRecommendation] = useState<Recommendation | ''>(anesthesiaAssessment?.recommendation || '')
  const [notes, setNotes] = useState(anesthesiaAssessment?.notes || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!hasPermission('approve_for_anesthesia')) {
      router.replace('/anestesista')
    }
  }, [hasPermission, isAuthLoading, router, user])

  if (isAuthLoading) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">Carregando...</div>
  }

  if (!patient) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">Paciente nao encontrado</div>
  }

  const examRequests = getExamRequestsByPatient(patientId)

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
      return
    }
    router.push('/anestesista')
  }

  const handleSave = async (complete: boolean) => {
    setIsSaving(true)

    const nextStatus =
      complete
        ? needsAdditionalEvaluation
          ? 'aguardando_exames'
          : recommendation === 'aprovar' && fitForAnesthesia
            ? patient.assessmentRequests ? nextAssessmentStatus({ ...patient, anesthesiaAssessment: { ...patient.anesthesiaAssessment, completedAt: new Date().toISOString() } }, 'aguardando_resultado') : 'aguardando_cirurgiao'
            : recommendation === 'contraindicar' || fitForAnesthesia === false
              ? 'contraindicado'
              : 'alto_risco'
        : 'em_avaliacao_anestesica'

    updatePatient(patientId, {
      anesthesiaAssessment: {
        anestheticHistory,
        airwayAssessment,
        asaClassification: asaClassification || undefined,
        additionalRequests,
        requestsAdditionalEvaluation: needsAdditionalEvaluation,
        anesthesiaType,
        fitForAnesthesia: fitForAnesthesia ?? undefined,
        recommendation: recommendation || undefined,
        notes,
        completedAt: complete ? new Date().toISOString() : undefined,
        completedBy: complete ? user?.id : undefined,
      },
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })

    addAuditLog({
      action: complete ? 'avaliacao_anestesica_concluida' : 'avaliacao_anestesica_atualizada',
      patientId,
      details: complete
        ? `Avaliacao anestesica concluida. ASA: ${asaClassification || 'nao definido'}. Recomendacao: ${recommendation}. Destino: ${nextStatus}.`
        : 'Rascunho da avaliacao anestesica atualizado.',
    })

    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/anestesista')
      }
    }, 400)
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Anestesista', href: '/anestesista' }, { label: 'Avaliacao' }]} />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Avaliacao Pre-Anestesica</h1>
            <p className="text-sm text-muted-foreground sm:text-base">Etapa obrigatoria entre cardiologia e cirurgia.</p>
          </div>
          <PatientStatusBadge status={patient.status} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="break-words text-lg sm:text-xl">{patient.nomeCompleto}</CardTitle>
                  <CardDescription>{patient.idade} anos | CPF: {patient.cpf}</CardDescription>
                </div>
              </div>
              {asaClassification && <ASABadge classification={asaClassification} />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cirurgia</p>
                <p className="font-medium">{patient.scheduledSurgery || 'Nao informada'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cardiologista</p>
                <p className="font-medium">{patient.clinicalAssignedCardiologistName || 'Nao informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Risco Cardiologico</p>
                <p className="font-medium">{cardiologyAssessment?.finalRiskLevel || 'Nao definido'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Suporte pos-op</p>
                <p className="font-medium">
                  {cardiologyAssessment?.postoperativeSupport === 'com_uti'
                    ? 'C/ UTI'
                    : cardiologyAssessment?.postoperativeSupport === 'sem_uti'
                      ? 'S/ UTI'
                      : 'Nao definido'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-5">
            <TabsTrigger value="resumo" className="rounded-md border px-3 py-2">Resumo</TabsTrigger>
            <TabsTrigger value="triagem" className="rounded-md border px-3 py-2">Triagem</TabsTrigger>
            <TabsTrigger value="clinica" className="rounded-md border px-3 py-2">Clinica</TabsTrigger>
            <TabsTrigger value="cardiologia" className="rounded-md border px-3 py-2">Cardiologia</TabsTrigger>
            <TabsTrigger value="exames" className="rounded-md border px-3 py-2">Exames</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Contexto Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Queixa principal:</strong> {patient.queixaPrincipal || 'Nao informada'}</p>
                <p><strong>Hipotese clinica:</strong> {clinicalEvaluation?.hipoteseDiagnostica || 'Nao informada'}</p>
                <p><strong>Alergias:</strong> {patient.allergies?.join(', ') || 'Nenhuma registrada'}</p>
                <p><strong>Comorbidades:</strong> {clinicalEvaluation?.historicoClinico || 'Nao informado'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="triagem">
            <Card>
              <CardHeader><CardTitle className="text-base">Triagem</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Classificacao:</strong> {patient.triageRiskClassification || 'Nao classificada'}</p>
                <p><strong>Sinais vitais:</strong> {patient.visitHistory?.[0]?.triage?.vitalSignsSummary || 'Sem resumo registrado.'}</p>
                <p><strong>Observacoes:</strong> {patient.observacoesTriagem || 'Sem observacoes de triagem.'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinica">
            <Card>
              <CardHeader><CardTitle className="text-base">Avaliacao Clinica</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Motivo:</strong> {clinicalEvaluation?.motivoAvaliacao || 'Nao informado'}</p>
                <p><strong>Historico:</strong> {clinicalEvaluation?.historicoClinico || 'Nao informado'}</p>
                <p><strong>Tipo de cirurgia:</strong> {clinicalEvaluation?.tipoCirurgia || patient.scheduledSurgery || 'Nao informado'}</p>
                <p><strong>Urgencia:</strong> {clinicalEvaluation?.urgencia || 'Nao informada'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cardiologia">
            <Card>
              <CardHeader><CardTitle className="text-base">Parecer Cardiologico</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Risco final:</strong> {cardiologyAssessment?.finalRiskLevel || 'Nao informado'}</p>
                <p><strong>Recomendacao:</strong> {cardiologyAssessment?.recommendation || 'Nao informada'}</p>
                <p><strong>Controle de danos:</strong> {cardiologyAssessment?.damageControlMeasures || 'Nao informado'}</p>
                <p><strong>Observacoes:</strong> {cardiologyAssessment?.notes || 'Sem observacoes cardiologicas.'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exames">
            <PatientExamsHistory
              examRequests={examRequests}
              title="Historico Completo de Exames"
              description="Todos os exames executados ou em andamento neste paciente."
              emptyMessage="Este paciente ainda nao possui exames registrados."
            />
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-primary" />
              Parecer Pre-Anestesico
            </CardTitle>
            <CardDescription>Historico anestesico, via aerea, ASA e definicao da estrategia anestesica.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label>Historico anestesico</Label>
              <Textarea value={anestheticHistory} onChange={(e) => setAnestheticHistory(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Avaliacao da via aerea</Label>
              <Textarea value={airwayAssessment} onChange={(e) => setAirwayAssessment(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Classificacao ASA</Label>
              <Select value={asaClassification} onValueChange={(value) => setAsaClassification(value as ASAClassification)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ASA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">ASA I</SelectItem>
                  <SelectItem value="II">ASA II</SelectItem>
                  <SelectItem value="III">ASA III</SelectItem>
                  <SelectItem value="IV">ASA IV</SelectItem>
                  <SelectItem value="V">ASA V</SelectItem>
                  <SelectItem value="VI">ASA VI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de anestesia</Label>
              <Textarea value={anesthesiaType} onChange={(e) => setAnesthesiaType(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Aptidao para anestesia</Label>
              <Select value={fitForAnesthesia === null ? '' : fitForAnesthesia ? 'sim' : 'nao'} onValueChange={(value) => setFitForAnesthesia(value === 'sim')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Apto</SelectItem>
                  <SelectItem value="nao">Nao apto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="additional-evaluation"
                  checked={needsAdditionalEvaluation}
                  onCheckedChange={(checked) => setNeedsAdditionalEvaluation(Boolean(checked))}
                />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="additional-evaluation" className="cursor-pointer text-sm font-medium">
                    Necessita exames ou avaliacoes adicionais
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ao concluir com esta opcao, o caso retorna para complementacao e depois volta para a fila da anestesia.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Complementos solicitados</Label>
              <Textarea value={additionalRequests} onChange={(e) => setAdditionalRequests(e.target.value)} rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Recomendacao final</Label>
              <Select value={recommendation} onValueChange={(value) => setRecommendation(value as Recommendation)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a recomendacao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovar">Encaminhar ao cirurgiao</SelectItem>
                  <SelectItem value="reavaliar">Pedir complementacao</SelectItem>
                  <SelectItem value="contraindicar">Contraindicar anestesia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Parecer final</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>Salvar Rascunho</Button>
            <Button onClick={() => handleSave(true)} disabled={isSaving || !recommendation || !asaClassification}>
              <Save className="mr-2 h-4 w-4" />
              Emitir Parecer
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
