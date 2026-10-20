'use client'
import {triageIntake,validateTriageIntake,TRIAGE_SECTORS} from '@/lib/triage-intake'
import {TriageIntakeFields,TriageDestination} from '@/components/shared/triage-intake-fields'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Heart, Activity, AlertTriangle } from 'lucide-react'
import { PatientStatusBadge } from '@/components/shared/badges'
import { MANCHESTER_PRIORITIES, createManchesterRecord } from '@/lib/manchester'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { LabUrgency } from '@/lib/types'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

function TriageForm({patientId}:{patientId:string}) {
  const router = useRouter()
  const { sectors,users, user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const { getPatientById, updatePatient, addAuditLog, tickets } = useData()

  const patient = getPatientById(patientId)

  const [intake,setIntake]=useState(()=>triageIntake(patient))
  const [printSheet,setPrintSheet]=useState(false)
  const saveLock=useRef(false)
  const [vitalSigns, setVitalSigns] = useState({
    hgt:patient?.triageData?.vitalSigns?.hgt,
    glasgow:patient?.triageData?.vitalSigns?.glasgow,
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

  const [bloodType, setBloodType] = useState(patient?.bloodType || '')
  const [triageRiskClassification, setTriageRiskClassification] = useState<LabUrgency | ''>(
    patient?.triageData?.manchester?.priority || patient?.triageRiskClassification || ''
  )
  const [notes, setNotes] = useState(patient?.triageData?.notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const [flowchart, setFlowchart] = useState(patient?.triageData?.manchester?.flowchart || '')
  const [discriminator, setDiscriminator] = useState(patient?.triageData?.manchester?.discriminator || '')
  const [saveError, setSaveError] = useState('')
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
    if (!user || !hasPermission('register_vital_signs')||saveLock.current) return
    setSaveError('')
    if (patient.ticketId && !tickets.some(ticket => ticket.id === patient.ticketId && ticket.stage === 'em_triagem' && ticket.calledBy === user.id)) {
      setSaveError('Chame a senha e inicie o atendimento pela fila da triagem antes de salvar.')
      return
    }
    let manchester
    let destinationUpdates
    try {
      manchester = createManchesterRecord(triageRiskClassification, flowchart, discriminator, user.id, complete)
      destinationUpdates=validateTriageIntake(intake,complete,users,user,sectors,patient)
      if(vitalSigns.glasgow!==undefined&&(!Number.isInteger(vitalSigns.glasgow)||vitalSigns.glasgow<3||vitalSigns.glasgow>15))throw new Error('Glasgow deve ser um número inteiro entre 3 e 15.')
      if(vitalSigns.hgt!==undefined&&(!Number.isFinite(vitalSigns.hgt)||vitalSigns.hgt<0))throw new Error('Informe HGT válido.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível registrar a classificação.')
      return
    }
    saveLock.current=true
    setIsSaving(true)
    try {

    const triageData = {
      intake:{...intake,sectorName:sectors.find(sector=>sector.id===(intake.sectorId||'sector-'+intake.destination))?.name,medications:intake.medicationsInUse==='sim'?intake.medications:''},
      vitalSigns,
      comorbidities: conditions,
      manchester,
      notes,
      completedAt: complete ? new Date().toISOString() : undefined,
      completedBy: complete ? user?.id : undefined,
    }

    updatePatient(patientId, {
      triageData,
      bloodType: bloodType || undefined,
      allergies: intake.intolerances.split(/,|\n/).map(value=>value.trim()).filter(Boolean),

      triageRiskClassification: triageRiskClassification || undefined,
      requestingPhysician: users.find(user=>user.id===intake.professionalId)?.name || patient.requestingPhysician,
      prioridade:
        triageRiskClassification === 'emergente' || triageRiskClassification === 'muito_urgente'
          ? 'urgente'
          : triageRiskClassification === 'urgente'
            ? 'alta'
            : 'normal',
      status: 'em_triagem',
      ...destinationUpdates,
      updatedAt: new Date().toISOString(),
    })

    addAuditLog({
      action: complete ? 'triagem_concluida' : 'triagem_atualizada',
      userId: user!.id,
      patientId,
      details: complete
        ? `Triagem concluída. Manchester: ${triageRiskClassification ? MANCHESTER_PRIORITIES[triageRiskClassification].label : ''} | Fluxograma: ${flowchart.trim()} | Discriminador: ${discriminator.trim()} | Setor: ${TRIAGE_SECTORS[intake.destination]}`
        : 'Dados de triagem atualizados',
    })

    if(complete){
      if(printSheet&&hasPermission('print_triage_sheet'))router.push(`/paciente/${patientId}/imprimir?tipo=triagem`)
      else router.push('/triagem/fila')
    }
    }catch(error){setSaveError(error instanceof Error?error.message:'Não foi possível salvar a triagem.')}
    finally{saveLock.current=false;setIsSaving(false)}
  }

  const calculateBMI = () => {
    if (vitalSigns.weight && vitalSigns.height) {
      const heightInMeters = vitalSigns.height / 100
      return (vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1)
    }
    return '-'
  }

  return (
    <>
    <Header breadcrumbs={[{ label: 'Fila de triagem', href: '/triagem/fila' }, { label: 'Atendimento' }]} />
    <div className="flex min-h-[calc(100svh-3.5rem)] w-full min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="icon" className="size-12 shrink-0" aria-label="Voltar para a fila de triagem" onClick={() => router.push('/triagem/fila')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground">Triagem do Paciente</h1>

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
              <CardTitle className="break-words text-lg">{patient.nomeCompleto}</CardTitle>
              <CardDescription className="break-words">
                {patient.idade} anos | CPF: {patient.cpf} | Cirurgia: {patient.scheduledSurgery}
              </CardDescription>
              <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Queixa inicial: {patient.queixaPrincipal || 'Nao informada'}</p>
                <p>Relato da recepcao: {patient.descricaoInicial || 'Nao informado'}</p>
                <p>Tipo sanguineo: {bloodType || patient.bloodType || 'Nao informado'}</p>
                <p>Alergias: {intake.intolerances ? intake.intolerances : 'Nenhuma registrada'}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={(event) => event.preventDefault()} className="flex w-full flex-1 flex-col gap-5">
      {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
      <TriageIntakeFields value={intake} onChange={setIntake} disabled={isSaving}/>
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Sinais Vitais */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Sinais Vitais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-base" htmlFor="bp">Pressao Arterial</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="bp"
                  placeholder="120/80"
                  value={vitalSigns.bloodPressure}
                  onChange={e => setVitalSigns(v => ({ ...v, bloodPressure: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base" htmlFor="hr">Freq. Cardiaca (bpm)</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="hr"
                  type="number"
                  placeholder="72"
                  value={vitalSigns.heartRate || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, heartRate: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base" htmlFor="temp">Temperatura (C)</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="temp"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={vitalSigns.temperature || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, temperature: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base" htmlFor="spo2">SpO₂ (%)</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="spo2"
                  type="number"
                  placeholder="98"
                  value={vitalSigns.oxygenSaturation || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, oxygenSaturation: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base" htmlFor="rr">FR (irpm)</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="rr"
                  type="number"
                  placeholder="16"
                  value={vitalSigns.respiratoryRate || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, respiratoryRate: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base" htmlFor="weight">Peso (kg)</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={vitalSigns.weight || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, weight: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base" htmlFor="height">Altura (cm)</Label>
                <Input
                  className="h-14 rounded-lg px-4 text-base md:text-base"
                  id="height"
                  type="number"
                  placeholder="170"
                  value={vitalSigns.height || ''}
                  onChange={e => setVitalSigns(v => ({ ...v, height: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>IMC Calculado</Label>
                <div className="flex h-14 items-center rounded-lg border bg-muted/50 px-4 text-base">
                  {calculateBMI()} kg/m²
                </div>
              </div>
              {(['hgt','glasgow'] as const).map(key=><div key={key} className="space-y-2"><Label htmlFor={'vital-'+key}>{key==='hgt'?'HGT (mg/dL)':'Glasgow (3–15)'}</Label><Input id={'vital-'+key} className="h-14" type="number" min={key==='glasgow'?3:0} max={key==='glasgow'?15:undefined} value={vitalSigns[key]??''} onChange={event=>setVitalSigns({...vitalSigns,[key]:event.target.value===''?undefined:Number(event.target.value)})}/></div>)}
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
              <Label htmlFor="triage-blood-type" className="text-base">Tipo sanguíneo</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger id="triage-blood-type" className="w-full rounded-lg px-4 text-base data-[size=default]:h-14">
                  <SelectValue placeholder="Selecione o tipo sanguineo" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPE_OPTIONS.map((type) => (
                    <SelectItem className="min-h-12 py-3 text-base" key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <div key={key} className="flex min-w-0 items-center gap-3 rounded-lg border px-3 py-1">
                  <Checkbox
                    id={key}
                    className="size-5 shrink-0"
                    checked={conditions[key as keyof typeof conditions] as boolean}
                    onCheckedChange={checked =>
                      setConditions(c => ({ ...c, [key]: checked }))
                    }
                  />
                  <Label htmlFor={key} className="flex min-h-11 flex-1 cursor-pointer items-center text-base font-normal leading-snug">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-base" htmlFor="other">Outras Condicoes</Label>
              <Textarea
                className="min-h-28 rounded-lg px-4 py-3 text-base md:text-base"
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
          <CardTitle>Classificação de risco — Manchester</CardTitle>
          <CardDescription>
            Registre o fluxograma e o discriminador do protocolo adotado pela instituição. A prioridade é definida pelo enfermeiro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manchester-flowchart" className="text-base">Fluxograma utilizado (opcional)</Label>
              <Input id="manchester-flowchart" value={flowchart} onChange={(event) => setFlowchart(event.target.value)}
                className="h-14 px-4 text-base md:text-base" placeholder="Nome do fluxograma do protocolo institucional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manchester-discriminator" className="text-base">Discriminador identificado (opcional)</Label>
              <Input id="manchester-discriminator" value={discriminator} onChange={(event) => setDiscriminator(event.target.value)}
                className="h-14 px-4 text-base md:text-base" placeholder="Discriminador que fundamenta a prioridade" />
            </div>
          </div>
          <TriageDestination value={intake} onChange={setIntake} disabled={isSaving}/>
          <div className="space-y-2">
            <p id="triage-risk-label" className="text-base font-medium">Prioridade de Manchester *</p>
            <div role="group" aria-labelledby="triage-risk-label" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.entries(MANCHESTER_PRIORITIES) as Array<[LabUrgency, typeof MANCHESTER_PRIORITIES[LabUrgency]]>).map(
                ([urgency, meta]) => (
                  <button
                    key={urgency}
                    type="button"
                    aria-pressed={triageRiskClassification === urgency}
                    onClick={() => setTriageRiskClassification(urgency)}
                    className={`min-h-14 rounded-lg border px-4 py-3 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${meta.className} ${triageRiskClassification === urgency ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  >
                    <span className="block font-semibold">{meta.label}</span>
                    <span className="mt-1 block text-sm">{meta.timeLabel}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {patient.ticketNumber && <p className="rounded-lg border bg-primary/5 p-4 font-semibold">Senha do paciente: {patient.ticketNumber}</p>}
      {/* Observacoes */}
      <Card>
        <CardHeader>
          <CardTitle><Label htmlFor="triage-notes" className="text-lg font-semibold">Observações da triagem</Label></CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
                className="min-h-28 rounded-lg px-4 py-3 text-base md:text-base"
            id="triage-notes"
            placeholder="Adicione observacoes relevantes sobre a triagem do paciente..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>
        {hasPermission('print_triage_sheet')&&<label className="flex min-h-12 cursor-pointer items-center gap-3"><input type="checkbox" className="size-5" checked={printSheet} onChange={event=>setPrintSheet(event.target.checked)}/>Imprimir ficha ao concluir a triagem</label>}
        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:justify-end">
          <Button type="button" className="h-14 w-full px-6 text-base sm:w-auto" variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            className="h-14 w-full px-6 text-base sm:w-auto"
            onClick={() => handleSave(true)}
            disabled={isSaving || (!['laboratorio','enfermaria'].includes(intake.destination)&&!intake.professionalId) || !triageRiskClassification}
          >
            <Save className="mr-2 h-4 w-4" />
            Concluir Triagem
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}

export default function TriagemAvaliarPage(){
 const {id}=useParams<{id:string}>()
 const {getPatientById,isDataReady}=useData()
 const patient=getPatientById(id)
 if(!isDataReady)return <p className="p-6">Carregando...</p>
 return <TriageForm key={id+'-'+patient?.dataEntrada} patientId={id}/>
}
