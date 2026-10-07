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
import { ArrowLeft, Save, User, Stethoscope } from 'lucide-react'
import { PatientStatusBadge, ASABadge } from '@/components/shared/badges'
import { PatientExamsHistory } from '@/components/shared/patient-exams-history'
import { Input } from '@/components/ui/input'
import { AssessmentRequestFields } from '@/components/shared/assessment-request-fields'
import { buildAssessmentUpdates, getAssessmentDraft, nextAssessmentStatus } from '@/lib/assessment-requests'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { users } from '@/lib/data/users'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export default function ClinicoAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { getPatientById, getExamRequestsByPatient, updatePatient, addAuditLog, requestExams, examTypes } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  
  const [lesionType, setLesionType] = useState(patient?.clinicalEvaluation?.lesionType || '')
  const [assessmentDraft, setAssessmentDraft] = useState(() => getAssessmentDraft(patient))
  const [saveError, setSaveError] = useState('')
  const [selectedExams, setSelectedExams] = useState<string[]>(
    patient?.clinicalEvaluation?.requestedExams || []
  )
  const [clinicalNotes, setClinicalNotes] = useState(
    patient?.clinicalEvaluation?.notes || ''
  )
  const [bloodType, setBloodType] = useState(patient?.bloodType || '')
  const [allergiesText, setAllergiesText] = useState((patient?.allergies || []).join(', '))
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

  const patientExamRequests = getExamRequestsByPatient(patientId)
  
  const handleSave = async (complete: boolean) => {
    if (!user || !hasPermission('clinical_evaluation') || isSaving) return
    setSaveError('')
    let assessmentUpdates
    try {
      assessmentUpdates = hasPermission('request_specialist_assessment') ? buildAssessmentUpdates(patient, user, assessmentDraft, complete, users) : {}
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar as solicitações.')
      return
    }
    const newExamIds = selectedExams.filter((id) => !patientExamRequests.some((exam) => exam.examTypeId === id && exam.status !== 'cancelado'))
    if (complete && newExamIds.length > 0 && !hasPermission('request_exams')) {
      setSaveError('Sem permissão para solicitar exames.')
      return
    }
    setIsSaving(true)
    if (complete && newExamIds.length > 0) requestExams(patientId, newExamIds, clinicalNotes || 'Solicitação na avaliação clínica')
    const clinicalEvaluation = {
      ...patient.clinicalEvaluation,
      lesionType: lesionType.trim(),
      requestedExams: selectedExams,
      notes: clinicalNotes,
      completedAt: complete ? new Date().toISOString() : undefined,
      completedBy: complete ? user?.id : undefined,
    }
    
    updatePatient(patientId, {
      clinicalEvaluation,
      bloodType: bloodType || undefined,
      allergies: parsedAllergies,
      ...assessmentUpdates,
      status: complete
        ? newExamIds.length > 0 || patientExamRequests.some((exam) => !['concluido', 'cancelado'].includes(exam.status))
          ? 'aguardando_exames'
          : nextAssessmentStatus({ ...patient, ...assessmentUpdates }, 'aguardando_resultado')
        : 'em_avaliacao_clinica',
      updatedAt: new Date().toISOString(),
    })
    
    addAuditLog({
      action: complete ? 'avaliacao_clinica_concluida' : 'avaliacao_clinica_atualizada',
      userId: user!.id,
      patientId,
      details: complete 
        ? `Avaliação clínica concluída. Tipo de lesão: ${lesionType.trim() || 'Não informado'}. Exames solicitados: ${newExamIds.length}. Risco cirúrgico: ${assessmentDraft.requestRisk ? 'solicitado' : 'não solicitado'}. Avaliações: ${assessmentDraft.targets.join(', ') || 'nenhuma'}`
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
          <p className="text-sm text-muted-foreground sm:text-base">Avaliação clínica, exames e solicitações de avaliação especializada</p>
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
              {patient.anesthesiaAssessment?.asaClassification && (
                <ASABadge classification={patient.anesthesiaAssessment.asaClassification} />
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="clinical-lesion-type">Tipo de lesão</Label>
            <Input id="clinical-lesion-type" className="h-12 text-base" value={lesionType} onChange={(event) => setLesionType(event.target.value)} placeholder="Descreva o tipo de lesão, se aplicável" />
          </div>
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
                  examTypes.reduce((acc, exam) => {
                    if (!acc[exam.category]) acc[exam.category] = []
                    acc[exam.category].push(exam)
                    return acc
                  }, {} as Record<string, typeof examTypes>)
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
                            disabled={!hasPermission('request_exams')}
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


      <PatientExamsHistory
        examRequests={patientExamRequests}
        title="Historico de Exames do Paciente"
        description="Exames ja solicitados ou concluidos neste prontuario, incluindo resultados e leitura do laboratorio."
        emptyMessage="Este paciente ainda nao possui exames registrados."
      />

      {hasPermission('request_specialist_assessment') && <AssessmentRequestFields value={assessmentDraft} onChange={setAssessmentDraft} patient={patient} />}
      {saveError && <p role="alert" className="rounded-lg border border-destructive p-4 text-destructive">{saveError}</p>}
      
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
            {patient.anesthesiaAssessment?.asaClassification && (
              <ASABadge classification={patient.anesthesiaAssessment.asaClassification} />
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
