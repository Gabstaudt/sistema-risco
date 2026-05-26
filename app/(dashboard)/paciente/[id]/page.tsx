'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, Activity, Calculator, FileText, Shield, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PatientStatusBadge, RiskLevelBadge, ASABadge, RCRIBadge } from '@/components/shared/badges'
import { EXAM_TYPES } from '@/lib/data/exams'
import { users } from '@/lib/data/users'

export default function PatientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { getPatientById, getPatientAuditLogs } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  const auditLogs = getPatientAuditLogs(patientId)
  
  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
      </div>
    )
  }
  
  const triageData = patient.triageData
  const clinicalEval = patient.clinicalEvaluation
  const examResults = patient.examResults || {}
  const surgicalAssessment = patient.surgicalRiskAssessment
  const requestedExams = clinicalEval?.requestedExams || []
  
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
  
  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser?.name || 'Usuario desconhecido'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Detalhes do Paciente</h1>
          <p className="text-muted-foreground">Visualizacao completa do prontuario</p>
        </div>
        <PatientStatusBadge status={patient.status} />
      </div>
      
      {/* Patient Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{patient.name}</CardTitle>
                <CardDescription className="text-base">
                  {patient.age} anos | CPF: {patient.cpf}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {patient.riskLevel && <RiskLevelBadge level={patient.riskLevel} />}
              {triageData?.asaClassification && (
                <ASABadge classification={triageData.asaClassification} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cirurgia</p>
              <p className="font-medium">{patient.scheduledSurgery}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Data Prevista</p>
              <p className="font-medium">
                {patient.scheduledDate 
                  ? new Date(patient.scheduledDate).toLocaleDateString('pt-BR')
                  : 'A definir'
                }
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Medico Solicitante</p>
              <p className="font-medium">{patient.requestingPhysician || 'Nao informado'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Convenio</p>
              <p className="font-medium">{patient.healthInsurance || 'Particular'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="triage">Triagem</TabsTrigger>
          <TabsTrigger value="clinical">Avaliacao Clinica</TabsTrigger>
          <TabsTrigger value="exams">Exames</TabsTrigger>
          <TabsTrigger value="audit">Historico</TabsTrigger>
        </TabsList>
        
        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Risk Summary */}
            {surgicalAssessment && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Parecer Final
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    {surgicalAssessment.finalRiskLevel && (
                      <RiskLevelBadge level={surgicalAssessment.finalRiskLevel} />
                    )}
                    <span className="text-lg font-medium">
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
            
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scores de Risco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ASA</span>
                  {triageData?.asaClassification ? (
                    <ASABadge classification={triageData.asaClassification} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">RCRI</span>
                  {clinicalEval?.rcriScore ? (
                    <div className="text-right">
                      <RCRIBadge score={clinicalEval.rcriScore.score} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {clinicalEval.rcriScore.riskPercentage}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">VSG-CRI</span>
                  {clinicalEval?.vsgcriScore ? (
                    <div className="text-right">
                      <span className="font-medium">{clinicalEval.vsgcriScore.score} pts</span>
                      <p className="text-xs text-muted-foreground">
                        {clinicalEval.vsgcriScore.riskClass}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sinais Vitais</CardTitle>
              </CardHeader>
              <CardContent>
                {triageData?.vitalSigns ? (
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Pressao</p>
                      <p className="font-medium">{triageData.vitalSigns.bloodPressure || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">FC</p>
                      <p className="font-medium">{triageData.vitalSigns.heartRate || '-'} bpm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SpO2</p>
                      <p className="font-medium">{triageData.vitalSigns.oxygenSaturation || '-'}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Temp</p>
                      <p className="font-medium">{triageData.vitalSigns.temperature || '-'}°C</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="font-medium">{triageData.vitalSigns.weight || '-'} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IMC</p>
                      <p className="font-medium">
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
          </div>
        </TabsContent>
        
        {/* Triage Tab */}
        <TabsContent value="triage">
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
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Pressao Arterial</p>
                        <p className="text-lg font-medium">{triageData.vitalSigns?.bloodPressure || '-'}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Freq. Cardiaca</p>
                        <p className="text-lg font-medium">{triageData.vitalSigns?.heartRate || '-'} bpm</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Saturacao O2</p>
                        <p className="text-lg font-medium">{triageData.vitalSigns?.oxygenSaturation || '-'}%</p>
                      </div>
                      <div className="rounded-lg border p-3">
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
                  
                  {triageData.asaClassification && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Classificacao ASA</h4>
                        <ASABadge classification={triageData.asaClassification} />
                      </div>
                    </>
                  )}
                  
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
        </TabsContent>
        
        {/* Clinical Tab */}
        <TabsContent value="clinical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Avaliacao Clinica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {clinicalEval ? (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium mb-2">RCRI Score</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-primary">
                          {clinicalEval.rcriScore?.score || 0}
                        </span>
                        <div>
                          <RCRIBadge score={clinicalEval.rcriScore?.score || 0} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {clinicalEval.rcriScore?.riskPercentage}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium mb-2">VSG-CRI Score</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-primary">
                          {clinicalEval.vsgcriScore?.score || 0}
                        </span>
                        <div>
                          <span className="text-sm">{clinicalEval.vsgcriScore?.riskClass}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {clinicalEval.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Observacoes Clinicas</h4>
                        <p className="text-muted-foreground">{clinicalEval.notes}</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Avaliacao clinica nao realizada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Exams Tab */}
        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Resultados dos Exames
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestedExams.length > 0 ? (
                <div className="space-y-4">
                  {requestedExams.map(examId => {
                    const exam = EXAM_TYPES.find(e => e.id === examId)
                    const result = examResults[examId]
                    return (
                      <div 
                        key={examId}
                        className={`rounded-lg border p-4 ${
                          result?.status === 'alterado' ? 'border-amber-200 bg-amber-50/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {result?.status === 'normal' && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                            {result?.status === 'alterado' && (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                            {(!result?.status || result?.status === 'pendente') && (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="font-medium">{exam?.name || examId}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{exam?.category}</span>
                        </div>
                        {result?.value ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-medium">{result.value}</span>
                            {exam?.unit && (
                              <span className="text-muted-foreground">{exam.unit}</span>
                            )}
                            {exam?.referenceRange && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Ref: {exam.referenceRange})
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Resultado pendente</p>
                        )}
                        {result?.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{result.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum exame solicitado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Audit Tab */}
        <TabsContent value="audit">
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
                  {auditLogs.map((log, index) => (
                    <div key={log.id} className="relative pl-10">
                      <div className="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{getActionLabel(log.action)}</span>
                          <span className="text-xs text-muted-foreground">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
