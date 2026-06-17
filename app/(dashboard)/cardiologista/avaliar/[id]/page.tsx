'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PatientExamsHistory } from '@/components/shared/patient-exams-history'
import { PatientStatusBadge, RiskLevelBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { users } from '@/lib/data/users'
import { useData } from '@/lib/data-context'
import type { RiskLevel, SurgeryUrgency } from '@/lib/types'
import { Activity, ArrowLeft, Heart, Save, ShieldCheck, User } from 'lucide-react'

type ReleaseProfile = 'eletiva' | 'emergencia'
type PostoperativeSupport = 'sem_uti' | 'com_uti'
type Recommendation = 'aprovar' | 'adiar' | 'contraindicar'

export default function CardiologistaAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { getPatientById, getExamRequestsByPatient, updatePatient, addAuditLog } = useData()

  const patientId = params.id as string
  const patient = getPatientById(patientId)
  const cardiologyAssessment = patient?.cardiologyAssessment
  const clinicalEvaluation = patient?.clinicalEvaluation

  const [surgeryType, setSurgeryType] = useState(cardiologyAssessment?.surgeryType || clinicalEvaluation?.tipoCirurgia || patient?.scheduledSurgery || '')
  const [urgency, setUrgency] = useState<SurgeryUrgency>(cardiologyAssessment?.urgency || clinicalEvaluation?.urgencia || 'eletiva')
  const [releaseProfile, setReleaseProfile] = useState<ReleaseProfile>(cardiologyAssessment?.releaseProfile || 'eletiva')
  const [postoperativeSupport, setPostoperativeSupport] = useState<PostoperativeSupport>(cardiologyAssessment?.postoperativeSupport || 'sem_uti')
  const [finalRisk, setFinalRisk] = useState<RiskLevel | ''>(cardiologyAssessment?.finalRiskLevel || '')
  const [recommendation, setRecommendation] = useState<Recommendation | ''>(cardiologyAssessment?.recommendation || '')
  const [damageControlMeasures, setDamageControlMeasures] = useState(cardiologyAssessment?.damageControlMeasures || '')
  const [notes, setNotes] = useState(cardiologyAssessment?.notes || '')
  const [assignedAnesthesiologistId, setAssignedAnesthesiologistId] = useState(patient?.cardiologyAssignedAnesthesiologistId || '')
  const [isSaving, setIsSaving] = useState(false)
  const anesthesiologists = users.filter((item) => item.role === 'anestesista' && item.active)
  const normalizedAnesthesiologistId = assignedAnesthesiologistId === 'unassigned' ? '' : assignedAnesthesiologistId
  const assignedAnesthesiologist = anesthesiologists.find((item) => item.id === normalizedAnesthesiologistId)

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!hasPermission('classify_cardiac_risk')) {
      router.replace('/cardiologista')
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
    router.push('/cardiologista')
  }

  const handleSave = async (complete: boolean) => {
    setIsSaving(true)

    const nextStatus =
      complete
        ? recommendation === 'aprovar'
          ? 'aguardando_anestesista'
          : recommendation === 'contraindicar'
            ? 'contraindicado'
            : 'alto_risco'
        : 'em_avaliacao_cardiologica'

    updatePatient(patientId, {
      cardiologyAssessment: {
        surgeryType: surgeryType || patient.scheduledSurgery,
        urgency,
        releaseProfile,
        damageControlMeasures,
        postoperativeSupport,
        finalRiskLevel: finalRisk || undefined,
        recommendation: recommendation || undefined,
        notes,
        completedAt: complete ? new Date().toISOString() : undefined,
        completedBy: complete ? user?.id : undefined,
      },
      cardiologyAssignedAnesthesiologistId: normalizedAnesthesiologistId || undefined,
      cardiologyAssignedAnesthesiologistName: assignedAnesthesiologist?.name || undefined,
      status: nextStatus,
      riskLevel: finalRisk || patient.riskLevel,
      updatedAt: new Date().toISOString(),
    })

    addAuditLog({
      action: complete ? 'avaliacao_cardiologica_concluida' : 'avaliacao_cardiologica_atualizada',
      patientId,
      details: complete
        ? `Avaliacao cardiologica concluida. Risco: ${finalRisk}. Recomendacao: ${recommendation}. Destino: ${nextStatus}.`
        : 'Rascunho da avaliacao cardiologica atualizado.',
    })

    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/cardiologista')
      }
    }, 400)
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Cardiologista', href: '/cardiologista' }, { label: 'Avaliacao' }]} />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Avaliacao Cardiologica Pre-Operatoria</h1>
            <p className="text-sm text-muted-foreground sm:text-base">Etapa obrigatoria antes do fluxo da anestesia.</p>
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
              {finalRisk && <RiskLevelBadge level={finalRisk} />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cirurgia</p>
                <p className="font-medium">{patient.scheduledSurgery || 'Nao informada'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinico Solicitante</p>
                <p className="font-medium">{patient.requestingPhysician || 'Nao informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">RCRI</p>
                <p className="font-medium">{clinicalEvaluation?.rcriScore?.score ?? 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">VSG-CRI</p>
                <p className="font-medium">{clinicalEvaluation?.vsgcriScore?.riskClass || 'Nao calculado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4">
            <TabsTrigger value="resumo" className="rounded-md border px-3 py-2">Resumo</TabsTrigger>
            <TabsTrigger value="triagem" className="rounded-md border px-3 py-2">Triagem</TabsTrigger>
            <TabsTrigger value="clinica" className="rounded-md border px-3 py-2">Avaliacao Clinica</TabsTrigger>
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
                <p><strong>Descricao inicial:</strong> {patient.descricaoInicial || 'Nao informada'}</p>
                <p><strong>Hipotese clinica:</strong> {clinicalEvaluation?.hipoteseDiagnostica || 'Nao informada'}</p>
                <p><strong>Observacoes clinicas:</strong> {clinicalEvaluation?.notes || 'Sem observacoes clinicas.'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="triagem">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Triagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Classificacao:</strong> {patient.triageRiskClassification || 'Nao classificada'}</p>
                <p><strong>Sinais vitais:</strong> {patient.visitHistory?.[0]?.triage?.vitalSignsSummary || 'Sem resumo registrado.'}</p>
                <p><strong>Observacoes:</strong> {patient.observacoesTriagem || 'Sem observacoes de triagem.'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinica">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Avaliacao Clinica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Motivo:</strong> {clinicalEvaluation?.motivoAvaliacao || 'Nao informado'}</p>
                <p><strong>Historico:</strong> {clinicalEvaluation?.historicoClinico || 'Nao informado'}</p>
                <p><strong>Tipo de cirurgia:</strong> {clinicalEvaluation?.tipoCirurgia || patient.scheduledSurgery || 'Nao informado'}</p>
                <p><strong>Urgencia:</strong> {clinicalEvaluation?.urgencia || 'Nao informada'}</p>
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
              <Heart className="h-5 w-5 text-primary" />
              Parecer Cardiologico
            </CardTitle>
            <CardDescription>Fluxo baseado no tipo de cirurgia, urgencia, controle de danos e necessidade de UTI.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de cirurgia</Label>
              <Textarea value={surgeryType} onChange={(event) => setSurgeryType(event.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Urgencia</Label>
              <Select value={urgency} onValueChange={(value) => setUrgency(value as SurgeryUrgency)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a urgencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eletiva">Eletiva</SelectItem>
                  <SelectItem value="urgencia">Urgencia</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Perfil da liberacao</Label>
              <Select value={releaseProfile} onValueChange={(value) => setReleaseProfile(value as ReleaseProfile)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eletiva">Eletiva</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Suporte pos-operatorio</Label>
              <Select value={postoperativeSupport} onValueChange={(value) => setPostoperativeSupport(value as PostoperativeSupport)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o suporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_uti">S/ UTI</SelectItem>
                  <SelectItem value="com_uti">C/ UTI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Medidas de controle de danos</Label>
              <Textarea
                placeholder="Descreva monitorizacao, ajuste hemodinamico, manejo de anticoagulantes, acesso a UTI e outras medidas."
                value={damageControlMeasures}
                onChange={(event) => setDamageControlMeasures(event.target.value)}
                rows={4}
              />
            </div>

            <Separator className="lg:col-span-2" />

            <div className="space-y-2">
              <Label>Classificacao final de risco</Label>
              <Select value={finalRisk} onValueChange={(value) => setFinalRisk(value as RiskLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="critico">Critico</SelectItem>
                  <SelectItem value="contraindicado">Contraindicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recomendacao</Label>
              <Select value={recommendation} onValueChange={(value) => setRecommendation(value as Recommendation)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a recomendacao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovar">Liberar para anestesista</SelectItem>
                  <SelectItem value="adiar">Adiar e reavaliar</SelectItem>
                  <SelectItem value="contraindicar">Contraindicar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Anestesista Responsavel</Label>
              <Select value={assignedAnesthesiologistId} onValueChange={setAssignedAnesthesiologistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um anestesista ou deixe em aberto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem definicao no momento</SelectItem>
                  {anesthesiologists.map((anesthesiologist) => (
                    <SelectItem key={anesthesiologist.id} value={anesthesiologist.id}>
                      {anesthesiologist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Parecer final</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              Salvar Rascunho
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isSaving || !finalRisk || !recommendation}>
              <Save className="mr-2 h-4 w-4" />
              Emitir Parecer
            </Button>
          </CardFooter>
        </Card>

        {recommendation && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Destino Previsto
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {recommendation === 'aprovar' && 'Paciente segue para a fila do anestesista apos a conclusao deste parecer.'}
              {recommendation === 'adiar' && 'Paciente permanece fora da fila cirurgica ate estabilizacao e nova reavaliacao.'}
              {recommendation === 'contraindicar' && 'Paciente nao deve seguir ao cirurgiao neste momento.'}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
