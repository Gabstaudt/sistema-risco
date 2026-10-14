'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, User, Activity, Stethoscope, Shield, Clock, AlertTriangle, ChevronDown } from 'lucide-react'
import { PatientStatusBadge, RiskLevelBadge, ASABadge } from '@/components/shared/badges'
import { PatientBasicDetails } from '@/components/shared/patient-basic-details'
import { PatientExamsHistory } from '@/components/shared/patient-exams-history'
import { CardiologyRiskScores, getCardiologyScores } from '@/components/shared/cardiology-risk-scores'
import { users } from '@/lib/data/users'
import { STATUS_LABELS } from '@/lib/types'
import { getPatientManchesterPriority, MANCHESTER_PRIORITIES } from '@/lib/manchester'

export default function PatientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const canViewTriage = hasPermission('view_triage_data')
  const canViewClinical = hasPermission('view_clinical_data')
  const canViewScores = canViewClinical && user?.role !== 'clinico'
  const canViewExams = hasPermission('view_exam_results')
  const canViewHistory = hasPermission('view_patient_history')
  const canViewAudit = hasPermission('view_patient_audit')
  const canViewVisits = canViewHistory && canViewTriage && canViewClinical && canViewExams
  const { getPatientById, getPatientAuditLogs, getExamRequestsByPatient } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  const auditLogs = canViewAudit ? getPatientAuditLogs(patientId) : []
  
  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
      </div>
    )
  }
  
  if (!canViewTriage && !canViewClinical && !canViewExams && !canViewHistory) {
    return <PatientBasicDetails key={patient.id} patient={patient} />
  }

  const priority = canViewTriage ? getPatientManchesterPriority(patient) : undefined
  const triageData = patient.triageData
  const clinicalEval = patient.clinicalEvaluation
  const surgicalAssessment = patient.surgicalRiskAssessment
  const patientExamRequests = getExamRequestsByPatient(patientId)
  const visitHistory = [...(patient.visitHistory || [])].sort((a, b) => Date.parse(b.entryAt) - Date.parse(a.entryAt))
  const closedVisits = visitHistory.filter((visit) => visit.dischargeAt).length
  const getOutcomeLabel = (outcome?: string) => outcome && outcome in STATUS_LABELS
    ? STATUS_LABELS[outcome as keyof typeof STATUS_LABELS] : outcome || 'Desfecho ainda não registrado'
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'paciente_cadastrado': 'Paciente Cadastrado',
      'triagem_concluida': 'Triagem Concluida',
      'triagem_atualizada': 'Triagem Atualizada',
      'avaliacao_clinica_concluida': 'Avaliacao Clinica Concluida',
      'avaliacao_clinica_atualizada': 'Avaliacao Clinica Atualizada',
      'exames_registrados': 'Exames Registrados',
      'exames_atualizados': 'Exames Atualizados',
      'avaliacao_cirurgica_concluida': 'Avaliacao Cirurgica Concluida',
      'avaliacao_cirurgica_atualizada': 'Avaliacao Cirurgica Atualizada',
    }
    return labels[action] || action
  }
  
  const getUserName = (userId?: string) => {
    if (!userId) {
      return 'Nao informado'
    }

    const foundUser = users.find(u => u.id === userId)
    return foundUser?.name || userId
  }

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="outline" className="h-12 px-4" onClick={() => router.back()} aria-label="Voltar para a tela anterior">
          <ArrowLeft className="h-5 w-5" />Voltar
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Prontuário do paciente</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Dados do paciente e registros de atendimento</p>
        </div>
        <div className="self-start sm:self-auto">
          <PatientStatusBadge status={patient.status} />
        </div>
      </div>
      
      {/* Patient Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="break-words text-xl sm:text-2xl">{patient.nomeCompleto}</CardTitle>
                <CardDescription className="mt-1 break-words text-sm sm:text-base">
                  {patient.idade} anos · Prontuário: {patient.prontuario}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {priority && <span className={`rounded-lg border px-3 py-2 text-sm font-semibold ${MANCHESTER_PRIORITIES[priority].className}`}>{MANCHESTER_PRIORITIES[priority].label}</span>}
              {canViewScores && patient.riskLevel && <RiskLevelBadge level={patient.riskLevel} />}
              {canViewScores && patient.anesthesiaAssessment?.asaClassification && (
                <ASABadge classification={patient.anesthesiaAssessment!.asaClassification!} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['CPF', patient.cpf],
              ['Nascimento', new Date(`${patient.dataNascimento.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')],
              ['Unidade', patient.unidade],
              ['Entrada no hospital', formatDate(patient.dataEntrada)],
            ].map(([label, value]) => <div key={label} className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value || 'Não informado'}</dd></div>)}
          </dl>
          {canViewClinical && <details className="group mt-5 rounded-lg border px-4">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 font-medium">Informações do procedimento<ChevronDown className="size-5 shrink-0 group-open:rotate-180" aria-hidden="true" /></summary>
            <dl className="grid gap-4 pb-4 sm:grid-cols-3">
              <div><dt className="text-sm text-muted-foreground">Procedimento / motivo</dt><dd className="mt-1 break-words font-medium">{patient.scheduledSurgery || 'Não informado'}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Data prevista</dt><dd className="mt-1 font-medium">{patient.scheduledDate ? new Date(patient.scheduledDate).toLocaleDateString('pt-BR') : 'A definir'}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Médico solicitante</dt><dd className="mt-1 break-words font-medium">{patient.requestingPhysician ? getUserName(patient.requestingPhysician) : 'Não informado'}</dd></div>
            </dl>
          </details>}
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className={`rounded-xl border p-4 ${patient.allergies?.length ? 'border-amber-300 bg-amber-50 text-amber-950' : 'bg-card'}`}>
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5" aria-hidden="true" />Alergias registradas</p>
          <p className="mt-2 break-words">{patient.allergies?.length ? patient.allergies.join(', ') : 'Nenhuma alergia registrada'}</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4">
          <div><dt className="text-sm text-muted-foreground">Tipo sanguíneo</dt><dd className="mt-1 font-semibold">{patient.bloodType || 'Não informado'}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Convênio</dt><dd className="mt-1 break-words font-semibold">{patient.healthInsurance || 'Não informado'}</dd></div>
        </dl>
      </div>

      <Tabs defaultValue={canViewClinical || canViewTriage ? "summary" : canViewExams ? "exams" : "visits"} className="flex-1 space-y-4">
        <TabsList aria-label="Seções do prontuário" className="sticky top-0 z-20 grid h-auto w-full grid-cols-2 gap-2 rounded-xl border bg-background p-2 shadow-sm sm:flex sm:flex-wrap">
          {(canViewClinical || canViewTriage) && (<TabsTrigger value="summary" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Resumo
          </TabsTrigger>)}
          {(canViewTriage) && (<TabsTrigger value="triage" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Triagem
          </TabsTrigger>)}
          {(canViewClinical) && (<TabsTrigger value="clinical" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Avaliação clínica
          </TabsTrigger>)}
          {(canViewExams) && (<TabsTrigger value="exams" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Exames
          </TabsTrigger>)}
          {(canViewVisits) && (<TabsTrigger value="visits" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Entradas no hospital
          </TabsTrigger>)}
          {canViewClinical && <TabsTrigger value="surgery" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Cirurgia e pós-operatório</TabsTrigger>}
          {(canViewAudit) && (<TabsTrigger value="audit" className="min-h-12 flex-1 whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Histórico de execução
          </TabsTrigger>)}
        </TabsList>
        
        {/* Summary Tab */}
        {(canViewClinical || canViewTriage) && (<TabsContent value="summary">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Risk Summary */}
            {canViewClinical && surgicalAssessment && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Parecer Final
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {surgicalAssessment.finalRiskLevel && (
                      <RiskLevelBadge level={surgicalAssessment.finalRiskLevel} />
                    )}
                    <span className="text-base font-medium sm:text-lg">
                      {surgicalAssessment.recommendation === 'aprovar' && 'Aprovado para Cirurgia'}
                      {surgicalAssessment.recommendation === 'adiar' && 'Procedimento Adiado'}
                      {surgicalAssessment.recommendation === 'contraindicar' && 'Cirurgia Contraindicada'}
                    </span>
                  </div>
                  {surgicalAssessment.notes && (
                    <p className="text-muted-foreground">{surgicalAssessment.notes}</p>
                  )}
                </CardContent>
              </Card>
            )}
            
            {canViewClinical && clinicalEval && <Card>
              <CardHeader><CardTitle className="text-lg">Atendimento clínico</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-sm text-muted-foreground">Tipo de lesão</dt><dd className="mt-1 break-words font-medium">{clinicalEval.lesionType || 'Não informado'}</dd></div>
                  <div><dt className="text-sm text-muted-foreground">Hipótese diagnóstica</dt><dd className="mt-1 break-words font-medium">{clinicalEval.hipoteseDiagnostica || 'Não registrada'}</dd></div>
                </dl>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{clinicalEval.notes || 'Sem observações clínicas registradas.'}</p>
              </CardContent>
            </Card>}
            {canViewScores && (patient.anesthesiaAssessment?.asaClassification || Object.keys(getCardiologyScores(patient)).length > 0) && (<>
            <CardiologyRiskScores value={getCardiologyScores(patient)} />
            {patient.anesthesiaAssessment?.asaClassification && <Card><CardHeader><CardTitle>ASA — Anestesia</CardTitle></CardHeader><CardContent><ASABadge classification={patient.anesthesiaAssessment.asaClassification} /></CardContent></Card>}
            </>)}
            {canViewTriage && (<>
            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sinais vitais</CardTitle>
              </CardHeader>
              <CardContent>
                {triageData?.vitalSigns ? (
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">Pressao</p>
                      <p className="break-words text-lg font-semibold">{triageData.vitalSigns.bloodPressure || '-'}</p>
                    </div>
                    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">FC</p>
                      <p className="text-lg font-semibold">{triageData.vitalSigns.heartRate || '-'} bpm</p>
                    </div>
                    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">SpO2</p>
                      <p className="text-lg font-semibold">{triageData.vitalSigns.oxygenSaturation || '-'}%</p>
                    </div>
                    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">Temp</p>
                      <p className="text-lg font-semibold">{triageData.vitalSigns.temperature || '-'}°C</p>
                    </div>
                    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">Peso</p>
                      <p className="text-lg font-semibold">{triageData.vitalSigns.weight || '-'} kg</p>
                    </div>
                    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">IMC</p>
                      <p className="text-lg font-semibold">
                        {triageData.vitalSigns.weight && triageData.vitalSigns.height
                          ? (triageData.vitalSigns.weight / Math.pow(triageData.vitalSigns.height / 100, 2)).toFixed(1)
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Dados nao disponiveis</p>
                )}
              </CardContent>
            </Card>
            </>)}
          </div>
        </TabsContent>)}
        
        {/* Triage Tab */}
        {(canViewTriage) && (<TabsContent value="triage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Dados da Triagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {triageData ? (
                <>
                  <div>
                    <h4 className="font-medium mb-3">Sinais Vitais</h4>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="min-w-0 rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Pressao Arterial</p>
                        <p className="break-words text-lg font-medium">{triageData.vitalSigns?.bloodPressure || '-'}</p>
                      </div>
                      <div className="min-w-0 rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Freq. Cardiaca</p>
                        <p className="text-lg font-medium">{triageData.vitalSigns?.heartRate || '-'} bpm</p>
                      </div>
                      <div className="min-w-0 rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Saturacao O2</p>
                        <p className="text-lg font-medium">{triageData.vitalSigns?.oxygenSaturation || '-'}%</p>
                      </div>
                      <div className="min-w-0 rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Temperatura</p>
                        <p className="text-lg font-medium">{triageData.vitalSigns?.temperature || '-'}°C</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-3">Comorbidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {triageData.comorbidities?.diabetes && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Diabetes</span>
                      )}
                      {triageData.comorbidities?.hypertension && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Hipertensao</span>
                      )}
                      {triageData.comorbidities?.heartDisease && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Cardiopatia</span>
                      )}
                      {triageData.comorbidities?.respiratoryDisease && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Doenca Respiratoria</span>
                      )}
                      {triageData.comorbidities?.kidneyDisease && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Doenca Renal</span>
                      )}
                      {triageData.comorbidities?.liverDisease && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Doenca Hepatica</span>
                      )}
                      {triageData.comorbidities?.neurologicalDisease && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Doenca Neurologica</span>
                      )}
                      {triageData.comorbidities?.obesity && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Obesidade</span>
                      )}
                      {triageData.comorbidities?.smoking && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Tabagismo</span>
                      )}
                      {triageData.comorbidities?.alcoholism && (
                        <span className="bg-muted px-3 py-1 rounded-full text-sm">Etilismo</span>
                      )}
                    </div>
                    {triageData.comorbidities?.other && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Outras: {triageData.comorbidities.other}
                      </p>
                    )}
                  </div>
                  
                  {triageData.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Observacoes</h4>
                        <p className="text-muted-foreground">{triageData.notes}</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Triagem nao realizada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>)}
        
        {/* Clinical Tab */}
        {(canViewClinical) && (<TabsContent value="clinical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Avaliação clínica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {clinicalEval ? (
                <>
                  {clinicalEval.lesionType && (
                    <div>
                      <h4 className="mb-2 font-medium">Tipo de lesão</h4>
                      <p className="break-words text-muted-foreground">{clinicalEval.lesionType}</p>
                    </div>
                  )}
                  {clinicalEval.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Observacoes Clinicas</h4>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{clinicalEval.notes}</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Avaliacao clinica nao realizada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>)}
        
        {/* Exams Tab */}
        {(canViewExams) && (<TabsContent value="exams">
          <PatientExamsHistory
            examRequests={patientExamRequests}
            description="Historico completo de exames deste prontuario, com resultados, prioridade e leitura do laboratorio."
            emptyMessage="Nenhum exame solicitado para este paciente."
          />
        </TabsContent>)}

        {(canViewVisits) && (<TabsContent value="visits">
          <Card>
            <CardHeader>
              <CardTitle>Entradas no Hospital</CardTitle>
              <CardDescription>
                {visitHistory.length} entrada(s) · {closedVisits} atendimento(s) finalizado(s). Do mais recente ao mais antigo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visitHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma entrada anterior registrada.
                </div>
              ) : (
                <Accordion type="single" collapsible defaultValue={visitHistory[0]?.id} className="w-full rounded-xl border px-4">
                  {visitHistory.map((visit) => (
                    <AccordionItem key={visit.id} value={visit.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex min-w-0 flex-1 flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium">{formatDate(visit.entryAt)}</p>
                            <p className="break-words text-sm text-muted-foreground">{visit.reason}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{visit.unit}</Badge>
                            <Badge variant={visit.dischargeAt ? 'secondary' : 'outline'}>{visit.dischargeAt ? 'Atendimento finalizado' : 'Em atendimento'}</Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <p className="text-sm font-medium">{visit.dischargeAt ? 'Desfecho do atendimento' : 'Situação atual'}</p>
                          <p className="mt-1 break-words text-sm text-muted-foreground">{getOutcomeLabel(visit.outcome)}</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Entrada</p>
                            <p className="text-sm">{formatDate(visit.entryAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Alta / Encerramento</p>
                            <p className="text-sm">{visit.dischargeAt ? formatDate(visit.dischargeAt) : 'Em acompanhamento'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recepcao</p>
                            <p className="text-sm">{visit.receptionNotes || 'Sem observacoes adicionais.'}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                          <div className="rounded-lg border p-4">
                            <p className="mb-2 font-medium">Triagem</p>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <p>Responsavel: {getUserName(visit.triage?.performedBy || '')}</p>
                              <p>Clinico direcionado: {visit.triage?.assignedClinicianName || 'Nao definido'}</p>
                              <p>Prioridade: {visit.triage?.riskClassification ? MANCHESTER_PRIORITIES[visit.triage.riskClassification].label : 'Não classificada'}</p>
                              <p>{visit.triage?.vitalSignsSummary || 'Sem sinais vitais consolidados.'}</p>
                              <p>{visit.triage?.notes || 'Sem observacoes de triagem.'}</p>
                            </div>
                          </div>

                          <div className="rounded-lg border p-4">
                            <p className="mb-2 font-medium">Atendimento Medico</p>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <p>Clinico: {visit.clinical?.physicianName ? getUserName(visit.clinical.physicianName) : 'Nao informado'}</p>
                              <p>Hipotese: {visit.clinical?.hypothesis || 'Nao registrada'}</p>
                              <p>Conduta: {visit.clinical?.conduct || 'Nao registrada'}</p>
                              <p>{visit.clinical?.notes || 'Sem observacoes clinicas adicionais.'}</p>
                            </div>
                          </div>

                          <div className="rounded-lg border p-4">
                            <p className="mb-2 font-medium">Cirurgia / Desfecho</p>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <p>Cirurgiao: {visit.surgery?.surgeonName ? getUserName(visit.surgery.surgeonName) : 'Nao aplicavel'}</p>
                              <p>Decisao: {visit.surgery?.decision || 'Sem parecer cirurgico nesta entrada.'}</p>
                              <p>{visit.surgery?.notes || visit.outcome || 'Sem observacoes cirurgicas.'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="rounded-lg border p-4">
                            <p className="mb-2 font-medium">Medicacoes e Intervencoes</p>
                            {visit.medicationsAdministered && visit.medicationsAdministered.length > 0 ? (
                              <div className="space-y-3">
                                {visit.medicationsAdministered.map((medication, index) => (
                                  <div key={`${visit.id}-med-${index}`} className="rounded-md border bg-muted/30 p-3 text-sm">
                                    <p className="font-medium">{medication.name}</p>
                                    <p className="text-muted-foreground">
                                      {medication.dose || 'Dose nao informada'} {medication.route ? `| ${medication.route}` : ''}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {medication.administeredAt ? formatDate(medication.administeredAt) : 'Horario nao informado'}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Prescrito por: {medication.prescribedBy ? getUserName(medication.prescribedBy) : 'Nao informado'}
                                    </p>
                                    {medication.notes && <p className="text-muted-foreground">{medication.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Nenhuma medicacao registrada nesta passagem.</p>
                            )}
                          </div>

                          <div className="rounded-lg border p-4">
                            <p className="mb-2 font-medium">Exames e Encaminhamentos</p>
                            {visit.examsSummary && visit.examsSummary.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {visit.examsSummary.map((exam, index) => (
                                  <Badge key={`${visit.id}-exam-${index}`} variant="outline">
                                    {exam}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Nenhum exame destacado nesta entrada.</p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>)}
        
        {canViewClinical && <TabsContent value="surgery" className="space-y-5">
          <CardiologyRiskScores value={getCardiologyScores(patient)} />
          <Card><CardHeader><CardTitle>Cirurgia e pós-operatório</CardTitle></CardHeader><CardContent className="space-y-4">
            {!patient.surgeryRecords?.length && <p className="text-muted-foreground">Nenhuma cirurgia registrada.</p>}
            {patient.surgeryRecords?.map(record => <div key={record.id} className="space-y-2 rounded-lg border p-4">
              <p className="font-semibold">{record.procedureType} · {record.status}</p>
              <p className="text-sm text-muted-foreground">{record.segment || 'Segmento não informado'} {record.performedAt ? `· ${new Date(`${record.performedAt}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</p>
              <p className="whitespace-pre-wrap break-words">{record.notes || 'Sem observações cirúrgicas.'}</p>
              {record.status === 'realizada' && <><p className="font-medium">Pós-operatório</p><p className="whitespace-pre-wrap break-words">{record.postoperativeNotes || 'Evolução ainda não registrada.'}</p><p className="text-sm">Desfecho: { {em_acompanhamento:'Em acompanhamento',alta:'Alta',retorno:'Retorno agendado',internacao:'Em internação'}[record.postoperativeOutcome] }</p></>}
            </div>)}
          </CardContent></Card>
        </TabsContent>}

        {/* Audit Tab */}
        {(canViewAudit) && (<TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Historico de Acoes
              </CardTitle>
              <CardDescription>
                Registro de todas as acoes realizadas neste prontuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-6">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative pl-10">
                      <div className="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                      <div className="rounded-lg border p-4">
                        <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <span className="break-words font-medium">{getActionLabel(log.action)}</span>
                          <span className="text-xs text-muted-foreground sm:text-right">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Por: {getUserName(log.userId)}
                        </p>
                        {log.details && (
                          <p className="text-sm">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>)}
      </Tabs>
    </div>
  )
}
