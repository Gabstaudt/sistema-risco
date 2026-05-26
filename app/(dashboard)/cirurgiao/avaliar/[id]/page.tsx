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
import { ArrowLeft, Save, User, Shield, Activity, FileText, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PatientStatusBadge, RiskLevelBadge, ASABadge, RCRIBadge } from '@/components/shared/badges'
import { EXAM_TYPES } from '@/lib/data/exams'
import type { RiskLevel } from '@/lib/types'

export default function CirurgiaoAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const { getPatientById, updatePatient, addAuditLog } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  
  const [finalRisk, setFinalRisk] = useState<RiskLevel | ''>(
    patient?.surgicalRiskAssessment?.finalRiskLevel || ''
  )
  const [recommendation, setRecommendation] = useState<'aprovar' | 'adiar' | 'contraindicar' | ''>(
    patient?.surgicalRiskAssessment?.recommendation || ''
  )
  const [notes, setNotes] = useState(patient?.surgicalRiskAssessment?.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!hasPermission('classify_risk')) {
      router.push('/cirurgiao')
    }
  }, [user, hasPermission, router])
  
  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
      </div>
    )
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
  const examResults = patient.examResults || {}
  const requestedExams = clinicalEval?.requestedExams || []
  
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'aprovar': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'adiar': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'contraindicar': return 'text-red-600 bg-red-50 border-red-200'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Avaliacao de Risco Cirurgico</h1>
          <p className="text-muted-foreground">Analise completa e parecer final</p>
        </div>
        <PatientStatusBadge status={patient.status} />
      </div>
      
      {/* Patient Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{patient.name}</CardTitle>
                <CardDescription>
                  {patient.age} anos | CPF: {patient.cpf}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {triageData?.asaClassification && (
                <ASABadge classification={triageData.asaClassification} />
              )}
              {clinicalEval?.rcriScore && (
                <RCRIBadge score={clinicalEval.rcriScore.score} />
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
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Triagem Summary */}
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
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pressao Arterial</p>
                    <p className="font-medium">{triageData.vitalSigns?.bloodPressure || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Freq. Cardiaca</p>
                    <p className="font-medium">{triageData.vitalSigns?.heartRate || '-'} bpm</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Saturacao O2</p>
                    <p className="font-medium">{triageData.vitalSigns?.oxygenSaturation || '-'}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">IMC</p>
                    <p className="font-medium">
                      {triageData.vitalSigns?.weight && triageData.vitalSigns?.height
                        ? (triageData.vitalSigns.weight / Math.pow(triageData.vitalSigns.height / 100, 2)).toFixed(1)
                        : '-'
                      } kg/m²
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Comorbidades</p>
                  <div className="flex flex-wrap gap-1">
                    {triageData.comorbidities?.diabetes && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Diabetes</span>
                    )}
                    {triageData.comorbidities?.hypertension && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Hipertensao</span>
                    )}
                    {triageData.comorbidities?.heartDisease && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Cardiopatia</span>
                    )}
                    {triageData.comorbidities?.respiratoryDisease && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Doenca Respiratoria</span>
                    )}
                    {triageData.comorbidities?.kidneyDisease && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Doenca Renal</span>
                    )}
                    {triageData.comorbidities?.smoking && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Tabagismo</span>
                    )}
                    {!Object.values(triageData.comorbidities || {}).some(v => v === true) && (
                      <span className="text-xs text-muted-foreground">Nenhuma registrada</span>
                    )}
                  </div>
                </div>
                
                {triageData.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                      <p className="text-sm">{triageData.notes}</p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Triagem nao realizada</p>
            )}
          </CardContent>
        </Card>
        
        {/* Clinical Evaluation Summary */}
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
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">RCRI Score</p>
                    <p className="font-medium text-lg">{clinicalEval.rcriScore?.score || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {clinicalEval.rcriScore?.riskPercentage}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">VSG-CRI</p>
                    <p className="font-medium text-lg">{clinicalEval.vsgcriScore?.score || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {clinicalEval.vsgcriScore?.riskClass}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {clinicalEval.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observacoes Clinicas</p>
                    <p className="text-sm">{clinicalEval.notes}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Avaliacao clinica nao realizada</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Exam Results */}
      {requestedExams.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resultados dos Exames
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {requestedExams.map(examId => {
                const exam = EXAM_TYPES.find(e => e.id === examId)
                const result = examResults[examId]
                return (
                  <div 
                    key={examId}
                    className={`rounded-lg border p-3 ${
                      result?.status === 'alterado' ? 'border-amber-200 bg-amber-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{exam?.name || examId}</span>
                      {result?.status === 'normal' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {result?.status === 'alterado' && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    {result?.value ? (
                      <p className="text-sm">
                        <span className="font-medium">{result.value}</span>
                        {exam?.unit && <span className="text-muted-foreground"> {exam.unit}</span>}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Pendente</p>
                    )}
                    {result?.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{result.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Final Assessment */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Parecer Final do Risco Cirurgico
          </CardTitle>
          <CardDescription>
            Defina a classificacao final de risco e a recomendacao para o procedimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Classificacao Final de Risco</Label>
              <Select
                value={finalRisk}
                onValueChange={value => setFinalRisk(value as RiskLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nivel de risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Baixo Risco
                    </div>
                  </SelectItem>
                  <SelectItem value="moderado">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Risco Moderado
                    </div>
                  </SelectItem>
                  <SelectItem value="alto">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      Alto Risco
                    </div>
                  </SelectItem>
                  <SelectItem value="critico">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Risco Critico
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Recomendacao</Label>
              <Select
                value={recommendation}
                onValueChange={value => setRecommendation(value as typeof recommendation)}
              >
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
              <div className="flex items-center gap-3">
                <RiskLevelBadge level={finalRisk} />
                <span className="text-lg font-medium">
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
              onChange={e => setNotes(e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            Salvar Rascunho
          </Button>
          <Button 
            onClick={() => handleSave(true)} 
            disabled={isSaving || !finalRisk || !recommendation}
          >
            <Save className="mr-2 h-4 w-4" />
            Emitir Parecer Final
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
