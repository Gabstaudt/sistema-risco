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
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Heart, Activity, AlertTriangle } from 'lucide-react'
import { PatientStatusBadge, ASABadge } from '@/components/shared/badges'
import { ASA_CLASSIFICATIONS, calculateASA } from '@/lib/data/exams'
import { users } from '@/lib/data/users'
import type { ASAClassification, LabUrgency } from '@/lib/types'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const urgencyMeta: Record<LabUrgency, { label: string; className: string }> = {
  emergente: { label: 'Vermelho - Emergente', className: 'bg-red-100 text-red-800 border-red-200' },
  muito_urgente: { label: 'Laranja - Muito urgente', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgente: { label: 'Amarelo - Urgente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pouco_urgente: { label: 'Verde - Pouco urgente', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  nao_urgente: { label: 'Azul - Nao urgente', className: 'bg-sky-100 text-sky-800 border-sky-200' },
}

export default function TriagemAvaliarPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { getPatientById, updatePatient, addAuditLog } = useData()
  
  const patientId = params.id as string
  const patient = getPatientById(patientId)
  const clinicians = users.filter((item) => item.role === 'clinico' && item.active)
  
  const [vitalSigns, setVitalSigns] = useState({
    bloodPressure: patient?.triageData?.vitalSigns?.bloodPressure || '',
    heartRate: patient?.triageData?.vitalSigns?.heartRate || 0,
    temperature: patient?.triageData?.vitalSigns?.temperature || 0,
    oxygenSaturation: patient?.triageData?.vitalSigns?.oxygenSaturation || 0,
    respiratoryRate: patient?.triageData?.vitalSigns?.respiratoryRate || 0,
    weight: patient?.triageData?.vitalSigns?.weight || 0,
    height: patient?.triageData?.vitalSigns?.height || 0,
  })
  
  const [conditions, setConditions] = useState({
    diabetes: patient?.triageData?.comorbidities?.diabetes || false,
    hypertension: patient?.triageData?.comorbidities?.hypertension || false,
    heartDisease: patient?.triageData?.comorbidities?.heartDisease || false,
    respiratoryDisease: patient?.triageData?.comorbidities?.respiratoryDisease || false,
    kidneyDisease: patient?.triageData?.comorbidities?.kidneyDisease || false,
    liverDisease: patient?.triageData?.comorbidities?.liverDisease || false,
    neurologicalDisease: patient?.triageData?.comorbidities?.neurologicalDisease || false,
    obesity: patient?.triageData?.comorbidities?.obesity || false,
    smoking: patient?.triageData?.comorbidities?.smoking || false,
    alcoholism: patient?.triageData?.comorbidities?.alcoholism || false,
    other: patient?.triageData?.comorbidities?.other || '',
  })
  
  const [selectedASA, setSelectedASA] = useState<ASAClassification | ''>(
    patient?.triageData?.asaClassification || ''
  )
  const [bloodType, setBloodType] = useState(patient?.bloodType || '')
  const [allergiesText, setAllergiesText] = useState((patient?.allergies || []).join(', '))
  const [assignedClinicianId, setAssignedClinicianId] = useState(patient?.triageAssignedClinicianId || '')
  const [triageRiskClassification, setTriageRiskClassification] = useState<LabUrgency | ''>(
    patient?.triageRiskClassification || ''
  )
  const [notes, setNotes] = useState(patient?.triageData?.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  
  const suggestedASA = calculateASA(conditions)
  const assignedClinician = clinicians.find((item) => item.id === assignedClinicianId)
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

    if (!hasPermission('register_vital_signs')) {
      router.replace('/triagem')
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
    
    const triageData = {
      vitalSigns,
      comorbidities: conditions,
      asaClassification: selectedASA || undefined,
      notes,
      completedAt: complete ? new Date().toISOString() : undefined,
      completedBy: complete ? user?.id : undefined,
    }
    
    updatePatient(patientId, {
      triageData,
      bloodType: bloodType || undefined,
      allergies: parsedAllergies,
      triageAssignedClinicianId: assignedClinicianId || undefined,
      triageAssignedClinicianName: assignedClinician?.name || undefined,
      triageRiskClassification: triageRiskClassification || undefined,
      requestingPhysician: assignedClinician?.name || patient.requestingPhysician,
      prioridade:
        triageRiskClassification === 'emergente' || triageRiskClassification === 'muito_urgente'
          ? 'urgente'
          : triageRiskClassification === 'urgente'
            ? 'alta'
            : 'normal',
      status: complete ? 'aguardando_clinico' : 'em_triagem',
      updatedAt: new Date().toISOString(),
    })
    
    addAuditLog({
      action: complete ? 'triagem_concluida' : 'triagem_atualizada',
      userId: user!.id,
      patientId,
      details: complete 
        ? `Triagem concluida. ASA: ${selectedASA} | Clinico: ${assignedClinician?.name || 'Nao definido'} | Classificacao: ${triageRiskClassification || 'Nao definida'}`
        : 'Dados de triagem atualizados',
    })
    
    setTimeout(() => {
      setIsSaving(false)
      if (complete) {
        router.push('/triagem')
      }
    }, 500)
  }
  
  const calculateBMI = () => {
    if (vitalSigns.weight && vitalSigns.height) {
      const heightInMeters = vitalSigns.height / 100
      return (vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1)
    }
    return '-'
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Triagem do Paciente</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Coleta de sinais vitais e historico medico</p>
        </div>
        <div className="self-start sm:self-auto">
          <PatientStatusBadge status={patient.status} />
        </div>
      </div>
      
      {/* Patient Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="break-words text-lg">{patient.name}</CardTitle>
              <CardDescription className="break-words">
                {patient.age} anos | CPF: {patient.cpf} | Cirurgia: {patient.scheduledSurgery}
              </CardDescription>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>Queixa inicial: {patient.queixaPrincipal || 'Nao informada'}</p>
                <p>Relato da recepcao: {patient.descricaoInicial || 'Nao informado'}</p>
                <p>Tipo sanguineo: {bloodType || patient.bloodType || 'Nao informado'}</p>
                <p>Alergias: {parsedAllergies.length > 0 ? parsedAllergies.join(', ') : 'Nenhuma registrada'}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sinais Vitais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Sinais Vitais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bp">Pressao Arterial</Label>
                <Input
                  id="bp"
                  placeholder="120/80"
                  value={vitalSigns.bloodPressure}
                  onChange={e => setVitalSigns(v => ({ ...v, bloodPressure: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr">Freq. Cardiaca (bpm)</Label>
                <Input
                  id="hr"
                  type="number"
                  placeholder="72"
                  value={vitalSigns.heartRate || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, heartRate: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp">Temperatura (C)</Label>
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={vitalSigns.temperature || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, temperature: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spo2">Saturacao O2 (%)</Label>
                <Input
                  id="spo2"
                  type="number"
                  placeholder="98"
                  value={vitalSigns.oxygenSaturation || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, oxygenSaturation: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rr">Freq. Respiratoria</Label>
                <Input
                  id="rr"
                  type="number"
                  placeholder="16"
                  value={vitalSigns.respiratoryRate || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, respiratoryRate: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={vitalSigns.weight || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, weight: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={vitalSigns.height || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, height: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>IMC Calculado</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                  {calculateBMI()} kg/m²
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Dados Adicionais
            </CardTitle>
            <CardDescription>Informacoes clinicas basicas que acompanham o paciente nas proximas etapas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="triage-allergies">Alergias</Label>
              <Textarea
                id="triage-allergies"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="Ex.: dipirona, penicilina, contraste iodado"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Comorbidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              Comorbidades e Historico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: 'diabetes', label: 'Diabetes' },
                { key: 'hypertension', label: 'Hipertensao' },
                { key: 'heartDisease', label: 'Cardiopatia' },
                { key: 'respiratoryDisease', label: 'Doenca Respiratoria' },
                { key: 'kidneyDisease', label: 'Doenca Renal' },
                { key: 'liverDisease', label: 'Doenca Hepatica' },
                { key: 'neurologicalDisease', label: 'Doenca Neurologica' },
                { key: 'obesity', label: 'Obesidade' },
                { key: 'smoking', label: 'Tabagismo' },
                { key: 'alcoholism', label: 'Etilismo' },
              ].map(({ key, label }) => (
                <div key={key} className="flex min-w-0 items-start space-x-2 rounded-lg border p-3">
                  <Checkbox
                    id={key}
                    checked={conditions[key as keyof typeof conditions] as boolean}
                    onCheckedChange={checked => 
                      setConditions(c => ({ ...c, [key]: checked }))
                    }
                  />
                  <Label htmlFor={key} className="cursor-pointer text-sm font-normal leading-5">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="other">Outras Condicoes</Label>
              <Textarea
                id="other"
                placeholder="Descreva outras condicoes relevantes..."
                value={conditions.other}
                onChange={e => setConditions(c => ({ ...c, other: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encaminhamento da Triagem</CardTitle>
          <CardDescription>
            Defina o clinico responsavel e a classificacao de risco inicial do paciente antes do encaminhamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Clinico Responsavel</Label>
            <Select value={assignedClinicianId} onValueChange={setAssignedClinicianId}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Selecione quem atendera este paciente" />
              </SelectTrigger>
              <SelectContent>
                {clinicians.map((clinician) => (
                  <SelectItem key={clinician.id} value={clinician.id}>
                    {clinician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Classificacao de Risco Inicial</Label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.entries(urgencyMeta) as Array<[LabUrgency, { label: string; className: string }]>).map(
                ([urgency, meta]) => (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() => setTriageRiskClassification(urgency)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${meta.className} ${triageRiskClassification === urgency ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  >
                    {meta.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Classificacao ASA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Classificacao ASA
          </CardTitle>
          <CardDescription>
            Classificacao do estado fisico do paciente segundo a American Society of Anesthesiologists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestedASA && (
            <div className="flex flex-col gap-2 rounded-lg bg-primary/10 p-3 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">Sugestao baseada nas comorbidades:</span>
              <ASABadge classification={suggestedASA} />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Selecione a Classificacao ASA</Label>
            <Select
              value={selectedASA}
              onValueChange={value => setSelectedASA(value as ASAClassification)}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Selecione a classificacao ASA" />
              </SelectTrigger>
              <SelectContent>
                {ASA_CLASSIFICATIONS.map(asa => (
                  <SelectItem key={asa.code} value={asa.code}>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-medium">{asa.code}</span>
                      <span className="text-muted-foreground">- {asa.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedASA && (
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <ASABadge classification={selectedASA} />
                <span className="font-medium">
                  {ASA_CLASSIFICATIONS.find(a => a.code === selectedASA)?.description}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {ASA_CLASSIFICATIONS.find(a => a.code === selectedASA)?.examples}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Observacoes */}
      <Card>
        <CardHeader>
          <CardTitle>Observacoes da Triagem</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observacoes relevantes sobre a triagem do paciente..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            Salvar Rascunho
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => handleSave(true)}
            disabled={isSaving || !selectedASA || !assignedClinicianId || !triageRiskClassification}
          >
            <Save className="mr-2 h-4 w-4" />
            Concluir Triagem
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
