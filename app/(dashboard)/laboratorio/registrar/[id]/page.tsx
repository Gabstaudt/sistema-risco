'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, FlaskConical, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { PatientStatusBadge } from '@/components/shared/badges'
import { EXAM_TYPES } from '@/lib/data/exams'
import type { ExamResult } from '@/lib/types'

export default function LaboratorioRegistrarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const { getPatientById, updatePatient, addAuditLog } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  
  const [examResults, setExamResults] = useState<Record<string, ExamResult>>(
    patient?.examResults || {}
  )
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    if (!user || !hasPermission('laboratorio.registrar')) {
      router.push('/login')
    }
  }, [user, hasPermission, router])
  
  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
      </div>
    )
  }
  
  const requestedExams = patient.clinicalEvaluation?.requestedExams || []
  const examDetails = EXAM_TYPES.filter(e => requestedExams.includes(e.id))
  
  const handleResultChange = (examId: string, field: keyof ExamResult, value: string) => {
    setExamResults(prev => ({
      ...prev,
      [examId]: {
        ...prev[examId],
        examId,
        [field]: value,
        registeredAt: new Date().toISOString(),
        registeredBy: user?.id || '',
      },
    }))
  }
  
  const handleSave = async (complete: boolean) => {
    setIsSaving(true)
    
    const allExamsCompleted = requestedExams.every(
      examId => examResults[examId]?.status === 'normal' || examResults[examId]?.status === 'alterado'
    )
    
    updatePatient(patientId, {
      examResults,
      status: complete && allExamsCompleted ? 'aguardando_resultado' : 'aguardando_exames',
      updatedAt: new Date().toISOString(),
    })
    
    const completedCount = Object.values(examResults).filter(
      r => r.status === 'normal' || r.status === 'alterado'
    ).length
    
    addAuditLog({
      action: complete ? 'exames_registrados' : 'exames_atualizados',
      userId: user!.id,
      patientId,
      details: `${completedCount}/${requestedExams.length} exames registrados`,
    })
    
    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/laboratorio')
      }
    }, 500)
  }
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'alterado':
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'pendente':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }
  
  const completedCount = Object.values(examResults).filter(
    r => r.status === 'normal' || r.status === 'alterado'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Registro de Exames</h1>
          <p className="text-muted-foreground">Registrar resultados dos exames solicitados</p>
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
            <div className="text-right">
              <p className="text-sm font-medium">{completedCount}/{requestedExams.length}</p>
              <p className="text-xs text-muted-foreground">exames registrados</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Progress Bar */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso</span>
          <span className="text-sm text-muted-foreground">
            {Math.round((completedCount / requestedExams.length) * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedCount / requestedExams.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Exams List */}
      <div className="space-y-4">
        {Object.entries(
          examDetails.reduce((acc, exam) => {
            if (!acc[exam.category]) acc[exam.category] = []
            acc[exam.category].push(exam)
            return acc
          }, {} as Record<string, typeof examDetails>)
        ).map(([category, exams]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exams.map(exam => (
                <div 
                  key={exam.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(examResults[exam.id]?.status)}
                      <span className="font-medium">{exam.name}</span>
                    </div>
                    <Select
                      value={examResults[exam.id]?.status || ''}
                      onValueChange={value => handleResultChange(exam.id, 'status', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alterado">Alterado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor/Resultado</Label>
                      <Input
                        placeholder={exam.unit ? `Ex: 5.5 ${exam.unit}` : 'Resultado...'}
                        value={examResults[exam.id]?.value || ''}
                        onChange={e => handleResultChange(exam.id, 'value', e.target.value)}
                      />
                    </div>
                    {exam.referenceRange && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Referencia</Label>
                        <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                          {exam.referenceRange}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Observacoes</Label>
                    <Textarea
                      placeholder="Observacoes sobre o resultado..."
                      value={examResults[exam.id]?.notes || ''}
                      onChange={e => handleResultChange(exam.id, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {requestedExams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum exame solicitado para este paciente</p>
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      <Card>
        <CardFooter className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            Salvar Parcial
          </Button>
          <Button 
            onClick={() => handleSave(true)} 
            disabled={isSaving || completedCount < requestedExams.length}
          >
            <Save className="mr-2 h-4 w-4" />
            Finalizar Registro
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
