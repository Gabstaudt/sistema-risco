'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, User, Shield, Activity, Calculator } from 'lucide-react'
import { PatientStatusBadge, RiskLevelBadge, ASABadge, RCRIBadge } from '@/components/shared/badges'
import { PatientExamsHistory } from '@/components/shared/patient-exams-history'
import type { RiskLevel } from '@/lib/types'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export default function CirurgiaoAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { getPatientById, getExamRequestsByPatient, updatePatient, addAuditLog } = useData()

  const patientId = params.id as string
  const patient = getPatientById(patientId)

  const [finalRisk, setFinalRisk] = useState<RiskLevel | ''>(patient?.surgicalRiskAssessment?.finalRiskLevel || '')
  const [recommendation, setRecommendation] = useState<'aprovar' | 'adiar' | 'contraindicar' | ''>(
    patient?.surgicalRiskAssessment?.recommendation || '',
  )
  const [bloodType, setBloodType] = useState(patient?.bloodType || '')
  const [allergiesText, setAllergiesText] = useState((patient?.allergies || []).join(', '))
  const [notes, setNotes] = useState(patient?.surgicalRiskAssessment?.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const parsedAllergies = allergiesText
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  useEffect(() => {
    if (isAuthLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!hasPermission('classify_risk')) {
      router.replace('/cirurgiao')
    }
  }, [user, hasPermission, router, isAuthLoading])

  if (isAuthLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
      </div>
    )
  }

  const patientExamRequests = getExamRequestsByPatient(patientId)

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
      return
    }

    router.push('/cirurgiao')
  }

  const handleSave = async (complete: boolean) => {
    setIsSaving(true)

    const surgicalRiskAssessment = {
      finalRiskLevel: finalRisk || undefined,
      recommendation: recommendation || undefined,
      notes,
      completedAt: complete ? new Date().toISOString() : undefined,
      completedBy: complete ? user?.id : undefined,
    }

    updatePatient(patientId, {
      surgicalRiskAssessment,
      bloodType: bloodType || undefined,
      allergies: parsedAllergies,
      status: complete ? 'concluido' : 'em_avaliacao_cirurgica',
      riskLevel: finalRisk || patient.riskLevel,
      updatedAt: new Date().toISOString(),
    })

    addAuditLog({
      action: complete ? 'avaliacao_cirurgica_concluida' : 'avaliacao_cirurgica_atualizada',
      userId: user!.id,
      patientId,
      details: complete
        ? `Avaliacao cirurgica concluida. Risco Final: ${finalRisk}. Recomendacao: ${recommendation}`
        : 'Dados de avaliacao cirurgica atualizados',
    })

    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/cirurgiao')
      }
    }, 500)
  }

  const triageData = patient.triageData
  const clinicalEval = patient.clinicalEvaluation
  const cardiologyAssessment = patient.cardiologyAssessment
  const anesthesiaAssessment = patient.anesthesiaAssessment

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'aprovar':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'adiar':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'contraindicar':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return ''
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Avaliacao de Risco Cirurgico</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Analise completa e parecer final</p>
        </div>
        <div className="self-start sm:self-auto">
          <PatientStatusBadge status={patient.status} />
        </div>
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
                <CardDescription className="break-words">{patient.idade} anos | CPF: {patient.cpf}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {patient.anesthesiaAssessment?.asaClassification && <ASABadge classification={patient.anesthesiaAssessment.asaClassification} />}
              {clinicalEval?.rcriScore && <RCRIBadge score={clinicalEval.rcriScore.score} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cirurgia</p>
              <p className="break-words font-medium">{patient.scheduledSurgery}</p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Data Prevista</p>
              <p className="font-medium">
                {patient.scheduledDate ? new Date(patient.scheduledDate).toLocaleDateString('pt-BR') : 'A definir'}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Medico Solicitante</p>
              <p className="break-words font-medium">{patient.requestingPhysician || 'Nao informado'}</p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo Sanguineo</p>
              <p className="font-medium">{bloodType || patient.bloodType || 'Nao informado'}</p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Convenio</p>
              <p className="break-words font-medium">{patient.healthInsurance || 'Particular'}</p>
            </div>
            <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Alergias</p>
              <p className="break-words font-medium">{parsedAllergies.length > 0 ? parsedAllergies.join(', ') : 'Nenhuma registrada'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-6">
          <TabsTrigger value="summary" className="h-auto whitespace-normal rounded-md border px-3 py-2 text-center">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="triage" className="h-auto whitespace-normal rounded-md border px-3 py-2 text-center">
            Triagem
          </TabsTrigger>
          <TabsTrigger value="clinical" className="h-auto whitespace-normal rounded-md border px-3 py-2 text-center">
            Avaliacao Clinica
          </TabsTrigger>
          <TabsTrigger value="cardiology" className="h-auto whitespace-normal rounded-md border px-3 py-2 text-center">
            Cardiologia
          </TabsTrigger>
          <TabsTrigger value="anesthesia" className="h-auto whitespace-normal rounded-md border px-3 py-2 text-center">
            Anestesia
          </TabsTrigger>
          <TabsTrigger value="exams" className="h-auto whitespace-normal rounded-md border px-3 py-2 text-center">
            Exames
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Dados da Triagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {triageData ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">Pressao Arterial</p>
                        <p className="break-words font-medium">{triageData.vitalSigns?.bloodPressure || '-'}</p>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">Freq. Cardiaca</p>
                        <p className="font-medium">{triageData.vitalSigns?.heartRate || '-'} bpm</p>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">Saturacao O2</p>
                        <p className="font-medium">{triageData.vitalSigns?.oxygenSaturation || '-'}%</p>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">IMC</p>
                        <p className="font-medium">
                          {triageData.vitalSigns?.weight && triageData.vitalSigns?.height
                            ? (triageData.vitalSigns.weight / Math.pow(triageData.vitalSigns.height / 100, 2)).toFixed(1)
                            : '-'}{' '}
                          kg/mÂ²
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                      <p className="break-words text-sm">{triageData.notes || 'Sem observacoes de triagem.'}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Triagem nao realizada</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Avaliacao Clinica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clinicalEval ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">RCRI Score</p>
                        <p className="font-medium text-lg">{clinicalEval.rcriScore?.score || 0}</p>
                        <p className="text-xs text-muted-foreground">{clinicalEval.rcriScore?.riskPercentage}</p>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">VSG-CRI</p>
                        <p className="font-medium text-lg">{clinicalEval.vsgcriScore?.score || 0}</p>
                        <p className="text-xs text-muted-foreground">{clinicalEval.vsgcriScore?.riskClass}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observacoes Clinicas</p>
                      <p className="break-words text-sm">{clinicalEval.notes || 'Sem observacoes clinicas.'}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Avaliacao clinica nao realizada</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="triage">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Dados da Triagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {triageData ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Pressao Arterial</p>
                      <p className="break-words font-medium">{triageData.vitalSigns?.bloodPressure || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Freq. Cardiaca</p>
                      <p className="font-medium">{triageData.vitalSigns?.heartRate || '-'} bpm</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Saturacao O2</p>
                      <p className="font-medium">{triageData.vitalSigns?.oxygenSaturation || '-'}%</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">IMC</p>
                      <p className="font-medium">
                        {triageData.vitalSigns?.weight && triageData.vitalSigns?.height
                          ? (triageData.vitalSigns.weight / Math.pow(triageData.vitalSigns.height / 100, 2)).toFixed(1)
                          : '-'}{' '}
                        kg/mÂ²
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Comorbidades</p>
                    <div className="flex flex-wrap gap-1">
                      {triageData.comorbidities?.diabetes && <span className="text-xs bg-muted px-2 py-1 rounded">Diabetes</span>}
                      {triageData.comorbidities?.hypertension && <span className="text-xs bg-muted px-2 py-1 rounded">Hipertensao</span>}
                      {triageData.comorbidities?.heartDisease && <span className="text-xs bg-muted px-2 py-1 rounded">Cardiopatia</span>}
                      {triageData.comorbidities?.respiratoryDisease && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Doenca Respiratoria</span>
                      )}
                      {triageData.comorbidities?.kidneyDisease && <span className="text-xs bg-muted px-2 py-1 rounded">Doenca Renal</span>}
                      {triageData.comorbidities?.smoking && <span className="text-xs bg-muted px-2 py-1 rounded">Tabagismo</span>}
                      {!Object.values(triageData.comorbidities || {}).some((v) => v === true) && (
                        <span className="text-xs text-muted-foreground">Nenhuma registrada</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                    <p className="break-words text-sm">{triageData.notes || 'Sem observacoes de triagem.'}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Triagem nao realizada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Avaliacao Clinica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clinicalEval ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">RCRI Score</p>
                      <p className="font-medium text-lg">{clinicalEval.rcriScore?.score || 0}</p>
                      <p className="text-xs text-muted-foreground">{clinicalEval.rcriScore?.riskPercentage}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">VSG-CRI</p>
                      <p className="font-medium text-lg">{clinicalEval.vsgcriScore?.score || 0}</p>
                      <p className="text-xs text-muted-foreground">{clinicalEval.vsgcriScore?.riskClass}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observacoes Clinicas</p>
                    <p className="break-words text-sm">{clinicalEval.notes || 'Sem observacoes clinicas.'}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Avaliacao clinica nao realizada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cardiology">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Parecer Cardiologico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cardiologyAssessment ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Tipo de Cirurgia</p>
                      <p className="font-medium">{cardiologyAssessment.surgeryType || patient.scheduledSurgery || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Urgencia</p>
                      <p className="font-medium">{cardiologyAssessment.urgency || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Suporte Pos-Operatorio</p>
                      <p className="font-medium">{cardiologyAssessment.postoperativeSupport === 'com_uti' ? 'C/ UTI' : cardiologyAssessment.postoperativeSupport === 'sem_uti' ? 'S/ UTI' : '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Risco Final</p>
                      <p className="font-medium">{cardiologyAssessment.finalRiskLevel || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Recomendacao</p>
                      <p className="font-medium">{cardiologyAssessment.recommendation || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Liberacao</p>
                      <p className="font-medium">{cardiologyAssessment.releaseProfile || '-'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Medidas de Controle de Danos</p>
                    <p className="break-words text-sm">{cardiologyAssessment.damageControlMeasures || 'Sem medidas adicionais registradas.'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                    <p className="break-words text-sm">{cardiologyAssessment.notes || 'Sem observacoes cardiologicas.'}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Parecer cardiologico ainda nao registrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anesthesia">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Parecer Anestesico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {anesthesiaAssessment ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Historico Anestesico</p>
                      <p className="font-medium">{anesthesiaAssessment.anestheticHistory || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Via Aerea</p>
                      <p className="font-medium">{anesthesiaAssessment.airwayAssessment || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">ASA</p>
                      <p className="font-medium">{anesthesiaAssessment.asaClassification || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Tipo de Anestesia</p>
                      <p className="font-medium">{anesthesiaAssessment.anesthesiaType || '-'}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Apto para Anestesia</p>
                      <p className="font-medium">
                        {anesthesiaAssessment.fitForAnesthesia === true
                          ? 'Sim'
                          : anesthesiaAssessment.fitForAnesthesia === false
                            ? 'Nao'
                            : '-'}
                      </p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Recomendacao</p>
                      <p className="font-medium">{anesthesiaAssessment.recommendation || '-'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Complementos Solicitados</p>
                    <p className="break-words text-sm">{anesthesiaAssessment.additionalRequests || 'Nenhum complemento solicitado.'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                    <p className="break-words text-sm">{anesthesiaAssessment.notes || 'Sem observacoes anestesicas.'}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Parecer anestesico ainda nao registrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams">
          <PatientExamsHistory
            examRequests={patientExamRequests}
            title="Historico Completo de Exames"
            description="Todos os exames ja executados ou em andamento neste paciente, incluindo leitura do laboratorio."
            emptyMessage="Este paciente ainda nao possui exames registrados."
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Dados Adicionais</CardTitle>
          <CardDescription>Informacoes basicas que impactam a decisao cirurgica e anestesica.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo Sanguineo</Label>
            <Select value={bloodType} onValueChange={setBloodType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo sanguineo" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="surgery-allergies">Alergias</Label>
            <Textarea
              id="surgery-allergies"
              placeholder="Ex.: dipirona, penicilina, contraste iodado"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Parecer Final do Risco Cirurgico
          </CardTitle>
          <CardDescription>Defina a classificacao final de risco e a recomendacao para o procedimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Classificacao Final de Risco</Label>
              <Select value={finalRisk} onValueChange={(value) => setFinalRisk(value as RiskLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nivel de risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo Risco</SelectItem>
                  <SelectItem value="moderado">Risco Moderado</SelectItem>
                  <SelectItem value="alto">Alto Risco</SelectItem>
                  <SelectItem value="critico">Risco Critico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recomendacao</Label>
              <Select value={recommendation} onValueChange={(value) => setRecommendation(value as typeof recommendation)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a recomendacao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovar">Aprovar para Cirurgia</SelectItem>
                  <SelectItem value="adiar">Adiar Procedimento</SelectItem>
                  <SelectItem value="contraindicar">Contraindicar Cirurgia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {finalRisk && recommendation && (
            <div className={`rounded-lg border p-4 ${getRecommendationColor(recommendation)}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <RiskLevelBadge level={finalRisk} />
                <span className="break-words text-base font-medium sm:text-lg">
                  {recommendation === 'aprovar' && 'Paciente Aprovado para Cirurgia'}
                  {recommendation === 'adiar' && 'Procedimento Adiado'}
                  {recommendation === 'contraindicar' && 'Cirurgia Contraindicada'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Parecer e Observacoes</Label>
            <Textarea
              placeholder="Descreva o parecer clinico, justificativas e recomendacoes especiais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            Salvar Rascunho
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => handleSave(true)} disabled={isSaving || !finalRisk || !recommendation}>
            <Save className="mr-2 h-4 w-4" />
            Emitir Parecer Final
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
