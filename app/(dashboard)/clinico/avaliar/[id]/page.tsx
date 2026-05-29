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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { users } from '@/lib/data/users'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export default function ClinicoAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
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
  const [bloodType, setBloodType] = useState(patient?.bloodType || '')
  const [allergiesText, setAllergiesText] = useState((patient?.allergies || []).join(', '))
  const [requestSurgicalRisk, setRequestSurgicalRisk] = useState(patient?.clinicalRequestsSurgicalRisk || false)
  const [assignedSurgeonId, setAssignedSurgeonId] = useState(patient?.clinicalAssignedSurgeonId || '')
  const [isSaving, setIsSaving] = useState(false)
  const surgeons = users.filter((item) => item.role === 'cirurgiao' && item.active)
  const normalizedSurgeonId = assignedSurgeonId === 'unassigned' ? '' : assignedSurgeonId
  const assignedSurgeon = surgeons.find((item) => item.id === normalizedSurgeonId)
  const parsedAllergies = allergiesText
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  
  const rcriScore = calculateRCRI(rcriCriteria)
  const vsgcriScore = calculateVSGCRI(vsgcriFactors)
  
  useEffect(() => {
    if (isAuthLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!hasPermission('clinical_evaluation')) {
      router.replace('/clinico')
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
      bloodType: bloodType || undefined,
      allergies: parsedAllergies,
      status: complete 
        ? (selectedExams.length > 0
            ? 'aguardando_exames'
            : requestSurgicalRisk
              ? 'aguardando_cirurgiao'
              : 'aguardando_resultado')
        : 'em_avaliacao_clinica',
      clinicalRequestsSurgicalRisk: requestSurgicalRisk,
      clinicalAssignedSurgeonId: normalizedSurgeonId || undefined,
      clinicalAssignedSurgeonName: assignedSurgeon?.name || undefined,
      updatedAt: new Date().toISOString(),
    })
    
    addAuditLog({
      action: complete ? 'avaliacao_clinica_concluida' : 'avaliacao_clinica_atualizada',
      userId: user!.id,
      patientId,
      details: complete 
        ? `Avaliacao clinica concluida. RCRI: ${rcriScore.score}, VSG-CRI: ${vsgcriScore.riskClass}. Exames solicitados: ${selectedExams.length}. Risco cirurgico: ${requestSurgicalRisk ? `solicitado${assignedSurgeon ? ` para ${assignedSurgeon.name}` : ''}` : 'nao solicitado'}`
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Avaliacao Clinica</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Calculo de scores de risco e solicitacao de exames</p>
        </div>
        <div className="self-start sm:self-auto">
          <PatientStatusBadge status={patient.status} />
        </div>
      </div>
      
      {/* Patient Info Card */}
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
                  {patient.age} anos | Cirurgia: {patient.scheduledSurgery}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.triageData?.asaClassification && (
                <ASABadge classification={patient.triageData.asaClassification} />
              )}
            </div>
          </div>
        </CardHeader>
        {patient.triageData && (
          <CardContent className="pt-0">
            <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <span className="text-muted-foreground">Prontuario:</span>{' '}
                <span className="font-medium">{patient.prontuario}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">CPF:</span>{' '}
                <span className="font-medium">{patient.cpf}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Tipo sanguineo:</span>{' '}
                <span className="font-medium">{bloodType || patient.bloodType || 'Nao informado'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Telefone:</span>{' '}
                <span className="font-medium">{patient.telefone || 'Nao informado'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Unidade:</span>{' '}
                <span className="font-medium">{patient.unidade || 'Nao informada'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Pressao:</span>{' '}
                <span className="break-words font-medium">{patient.triageData.vitalSigns?.bloodPressure || '-'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">FC:</span>{' '}
                <span className="font-medium">{patient.triageData.vitalSigns?.heartRate || '-'} bpm</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">SpO2:</span>{' '}
                <span className="font-medium">{patient.triageData.vitalSigns?.oxygenSaturation || '-'}%</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">IMC:</span>{' '}
                <span className="font-medium">
                  {patient.triageData.vitalSigns?.weight && patient.triageData.vitalSigns?.height
                    ? (patient.triageData.vitalSigns.weight / Math.pow(patient.triageData.vitalSigns.height / 100, 2)).toFixed(1)
                    : '-'
                  } kg/m²
                </span>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <span className="text-muted-foreground">Entrada no sistema:</span>{' '}
              <span className="font-medium">
                {new Date(patient.dataEntrada).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Alergias:</span>{' '}
              <span className="font-medium">{parsedAllergies.length > 0 ? parsedAllergies.join(', ') : 'Nenhuma registrada'}</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados Adicionais</CardTitle>
          <CardDescription>Informacoes clinicas basicas compartilhadas com cirurgia e laboratorio.</CardDescription>
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
            <Label htmlFor="clinical-allergies">Alergias</Label>
            <Textarea
              id="clinical-allergies"
              placeholder="Ex.: dipirona, penicilina, contraste iodado"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="rcri" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
          <TabsTrigger value="rcri" className="flex h-auto items-center justify-center gap-2 rounded-md border px-3 py-2 text-center whitespace-normal">
            <Calculator className="h-4 w-4" />
            RCRI
          </TabsTrigger>
          <TabsTrigger value="vsgcri" className="flex h-auto items-center justify-center gap-2 rounded-md border px-3 py-2 text-center whitespace-normal">
            <Calculator className="h-4 w-4" />
            VSG-CRI
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex h-auto items-center justify-center gap-2 rounded-md border px-3 py-2 text-center whitespace-normal">
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
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
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
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={criteria.id} className="cursor-pointer text-sm font-medium">
                        {criteria.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{criteria.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Score RCRI</p>
                    <p className="text-3xl font-bold text-primary">{rcriScore.score}</p>
                  </div>
                  <div className="sm:text-right">
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
                    className="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
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
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={factor.id} className="cursor-pointer text-sm font-medium">
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Score VSG-CRI</p>
                    <p className="text-3xl font-bold text-primary">{vsgcriScore.score}</p>
                  </div>
                  <div className="sm:text-right">
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
                          className="flex min-w-0 items-start space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
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
                          <Label htmlFor={exam.id} className="flex-1 cursor-pointer text-sm font-normal leading-5">
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

      <Card>
        <CardHeader>
          <CardTitle>Encaminhamento para Risco Cirurgico</CardTitle>
          <CardDescription>
            O clinico pode solicitar avaliacao do cirurgiao ao final desta etapa e definir um responsavel, se desejar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg border p-3">
            <Checkbox
              id="request-surgical-risk"
              checked={requestSurgicalRisk}
              onCheckedChange={(checked) => setRequestSurgicalRisk(Boolean(checked))}
            />
            <div className="min-w-0 flex-1">
              <Label htmlFor="request-surgical-risk" className="cursor-pointer text-sm font-medium">
                Solicitar risco cirurgico ao cirurgiao
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Use esta opcao quando o caso ja deve seguir para avaliacao do cirurgiao apos a etapa clinica.
              </p>
            </div>
          </div>

          {requestSurgicalRisk && (
            <div className="space-y-2">
              <Label>Cirurgiao Responsavel</Label>
              <Select value={assignedSurgeonId} onValueChange={setAssignedSurgeonId}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Selecione um cirurgiao ou deixe em aberto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem definicao no momento</SelectItem>
                  {surgeons.map((surgeon) => (
                    <SelectItem key={surgeon.id} value={surgeon.id}>
                      {surgeon.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A selecao do medico e opcional. Se nao definir agora, o caso ainda pode seguir para a fila cirurgica.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
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
        <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {rcriScore.score > 0 && <RCRIBadge score={rcriScore.score} />}
            {patient.triageData?.asaClassification && (
              <ASABadge classification={patient.triageData.asaClassification} />
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              Salvar Rascunho
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => handleSave(true)} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Concluir Avaliacao
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
