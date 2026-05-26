'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, User, FileText, Calculator, Stethoscope } from 'lucide-react'
import { PatientStatusBadge, RiskLevelBadge, ASABadge, RCRIBadge } from '@/components/shared/badges'
import { RCRI_CRITERIA, calculateRCRI, VSGCRI_FACTORS, calculateVSGCRI, EXAM_TYPES } from '@/lib/data/exams'

export default function ClinicoAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const { getPatientById, updatePatient, addAuditLog } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  
  const [rcriCriteria, setRcriCriteria] = useState<string[]>(
    patient?.clinicalEvaluation?.rcriScore?.criteria || []
  )
  const [vsgcriFactors, setVsgcriFactors] = useState<string[]>(
    patient?.clinicalEvaluation?.vsgcriScore?.factors || []
  )
  const [selectedExams, setSelectedExams] = useState<string[]>(
    patient?.clinicalEvaluation?.requestedExams || []
  )
  const [clinicalNotes, setClinicalNotes] = useState(
    patient?.clinicalEvaluation?.notes || ''
  )
  const [isSaving, setIsSaving] = useState(false)
  
  const rcriScore = calculateRCRI(rcriCriteria)
  const vsgcriScore = calculateVSGCRI(vsgcriFactors)
  
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!hasPermission('clinical_evaluation')) {
      router.push('/clinico')
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
    
    const clinicalEvaluation = {
      rcriScore: {
        score: rcriScore.score,
        riskPercentage: rcriScore.riskPercentage,
        criteria: rcriCriteria,
      },
      vsgcriScore: {
        score: vsgcriScore.score,
        riskClass: vsgcriScore.riskClass,
        factors: vsgcriFactors,
      },
      requestedExams: selectedExams,
      notes: clinicalNotes,
      completedAt: complete ? new Date().toISOString() : undefined,
      completedBy: complete ? user?.id : undefined,
    }
    
    updatePatient(patientId, {
      clinicalEvaluation,
      status: complete 
        ? (selectedExams.length > 0 ? 'aguardando_exames' : 'aguardando_resultado') 
        : 'em_avaliacao_clinica',
      updatedAt: new Date().toISOString(),
    })
    
    addAuditLog({
      action: complete ? 'avaliacao_clinica_concluida' : 'avaliacao_clinica_atualizada',
      userId: user!.id,
      patientId,
      details: complete 
        ? `Avaliacao clinica concluida. RCRI: ${rcriScore.score}, VSG-CRI: ${vsgcriScore.riskClass}. Exames solicitados: ${selectedExams.length}`
        : 'Dados de avaliacao clinica atualizados',
    })
    
    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/clinico')
      }
    }, 500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Avaliacao Clinica</h1>
          <p className="text-muted-foreground">Calculo de scores de risco e solicitacao de exames</p>
        </div>
        <PatientStatusBadge status={patient.status} />
      </div>
      
      {/* Patient Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{patient.name}</CardTitle>
                <CardDescription>
                  {patient.age} anos | Cirurgia: {patient.scheduledSurgery}
                </CardDescription>
              </div>
            </div>
            {patient.triageData?.asaClassification && (
              <ASABadge classification={patient.triageData.asaClassification} />
            )}
          </div>
        </CardHeader>
        {patient.triageData && (
          <CardContent className="pt-0">
            <div className="grid gap-4 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Pressao:</span>{' '}
                <span className="font-medium">{patient.triageData.vitalSigns?.bloodPressure || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">FC:</span>{' '}
                <span className="font-medium">{patient.triageData.vitalSigns?.heartRate || '-'} bpm</span>
              </div>
              <div>
                <span className="text-muted-foreground">SpO2:</span>{' '}
                <span className="font-medium">{patient.triageData.vitalSigns?.oxygenSaturation || '-'}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">IMC:</span>{' '}
                <span className="font-medium">
                  {patient.triageData.vitalSigns?.weight && patient.triageData.vitalSigns?.height
                    ? (patient.triageData.vitalSigns.weight / Math.pow(patient.triageData.vitalSigns.height / 100, 2)).toFixed(1)
                    : '-'
                  } kg/m²
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      <Tabs defaultValue="rcri" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rcri" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            RCRI
          </TabsTrigger>
          <TabsTrigger value="vsgcri" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            VSG-CRI
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Exames
          </TabsTrigger>
        </TabsList>
        
        {/* RCRI Tab */}
        <TabsContent value="rcri">
          <Card>
            <CardHeader>
              <CardTitle>RCRI - Revised Cardiac Risk Index</CardTitle>
              <CardDescription>
                Indice de risco cardiaco revisado de Lee. Selecione os criterios presentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {RCRI_CRITERIA.map(criteria => (
                  <div 
                    key={criteria.id} 
                    className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={criteria.id}
                      checked={rcriCriteria.includes(criteria.id)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setRcriCriteria([...rcriCriteria, criteria.id])
                        } else {
                          setRcriCriteria(rcriCriteria.filter(c => c !== criteria.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={criteria.id} className="text-sm font-medium cursor-pointer">
                        {criteria.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{criteria.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Score RCRI</p>
                    <p className="text-3xl font-bold text-primary">{rcriScore.score}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Risco de Evento Cardiaco</p>
                    <RCRIBadge score={rcriScore.score} />
                    <p className="text-sm text-muted-foreground mt-1">{rcriScore.riskPercentage}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* VSG-CRI Tab */}
        <TabsContent value="vsgcri">
          <Card>
            <CardHeader>
              <CardTitle>VSG-CRI - Vascular Surgery Group Cardiac Risk Index</CardTitle>
              <CardDescription>
                Indice de risco cardiaco para cirurgia vascular. Selecione os fatores presentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {VSGCRI_FACTORS.map(factor => (
                  <div 
                    key={factor.id} 
                    className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={factor.id}
                      checked={vsgcriFactors.includes(factor.id)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setVsgcriFactors([...vsgcriFactors, factor.id])
                        } else {
                          setVsgcriFactors(vsgcriFactors.filter(f => f !== factor.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={factor.id} className="text-sm font-medium cursor-pointer">
                        {factor.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                    </div>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {factor.points} pts
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Score VSG-CRI</p>
                    <p className="text-3xl font-bold text-primary">{vsgcriScore.score}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Classificacao de Risco</p>
                    <div className="mt-1">
                      <RiskLevelBadge level={
                        vsgcriScore.riskClass === 'Classe I' ? 'baixo' :
                        vsgcriScore.riskClass === 'Classe II' ? 'moderado' :
                        vsgcriScore.riskClass === 'Classe III' ? 'alto' : 'critico'
                      } />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{vsgcriScore.riskClass}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Exams Tab */}
        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle>Solicitacao de Exames</CardTitle>
              <CardDescription>
                Selecione os exames complementares necessarios para a avaliacao
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  EXAM_TYPES.reduce((acc, exam) => {
                    if (!acc[exam.category]) acc[exam.category] = []
                    acc[exam.category].push(exam)
                    return acc
                  }, {} as Record<string, typeof EXAM_TYPES>)
                ).map(([category, exams]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {exams.map(exam => (
                        <div 
                          key={exam.id}
                          className="flex items-center space-x-2 rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={exam.id}
                            checked={selectedExams.includes(exam.id)}
                            onCheckedChange={checked => {
                              if (checked) {
                                setSelectedExams([...selectedExams, exam.id])
                              } else {
                                setSelectedExams(selectedExams.filter(e => e !== exam.id))
                              }
                            }}
                          />
                          <Label htmlFor={exam.id} className="text-sm font-normal cursor-pointer flex-1">
                            {exam.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedExams.length > 0 && (
                <div className="mt-4 rounded-lg bg-primary/10 p-3">
                  <p className="text-sm font-medium text-primary">
                    {selectedExams.length} exame(s) selecionado(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Observacoes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Observacoes Clinicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observacoes clinicas relevantes, recomendacoes e consideracoes..."
            value={clinicalNotes}
            onChange={e => setClinicalNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            {rcriScore.score > 0 && <RCRIBadge score={rcriScore.score} />}
            {patient.triageData?.asaClassification && (
              <ASABadge classification={patient.triageData.asaClassification} />
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              Salvar Rascunho
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Concluir Avaliacao
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
