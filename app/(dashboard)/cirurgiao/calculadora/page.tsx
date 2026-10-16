'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useData } from '@/lib/data-context'
import { RCRI_CRITERIA, VSGCRI_FACTORS, calculateRCRI, calculateVSGCRI } from '@/lib/data/exams'
import { CardiologyRiskScores, getCardiologyScores } from '@/components/shared/cardiology-risk-scores'
import { ASABadge } from '@/components/shared/badges'

export default function CirurgiaoCalculadoraPage() {
  const { patients } = useData()
  const [patientId, setPatientId] = useState('none')
  const [rcriCriteria, setRcriCriteria] = useState<string[]>([])
  const [vsgFactors, setVsgFactors] = useState<string[]>([])
  const [result, setResult] = useState<{ rcri?: number; vsg?: number }>({})
  const patient = patients.find(item => item.id === patientId)
  function reset() {
    setRcriCriteria([])
    setVsgFactors([])
    setResult({})
  }
  return <>
    <Header breadcrumbs={[{ label: 'Cirurgião', href: '/cirurgiao' }, { label: 'Calculadora de risco' }]} />
    <main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calculadora de risco</h1>
        <Button variant="outline" className="h-11" onClick={reset}>Limpar simulação</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Paciente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="risk-patient">Selecionar paciente (opcional)</Label>
          <Select value={patientId} onValueChange={value => { setPatientId(value); reset() }}>
            <SelectTrigger id="risk-patient" className="h-12 w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Simulação sem paciente</SelectItem>{patients.map(item => <SelectItem key={item.id} value={item.id}>{item.nomeCompleto} · {item.prontuario}</SelectItem>)}</SelectContent>
          </Select>
          {patient && <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">ASA registrada pela anestesia:</span>{patient.anesthesiaAssessment?.asaClassification ? <ASABadge classification={patient.anesthesiaAssessment.asaClassification} /> : <span className="text-sm text-muted-foreground">Não informada</span>}</div>
            <Button asChild variant="outline"><Link href={`/cirurgiao/avaliacao/${patient.id}`}>Abrir avaliação</Link></Button>
          </div>}
        </CardContent>
      </Card>
      {patient && <CardiologyRiskScores value={getCardiologyScores(patient)} />}
      <Tabs defaultValue="rcri" className="space-y-4">
        <TabsList className="grid h-12 w-full grid-cols-2"><TabsTrigger value="rcri">RCRI</TabsTrigger><TabsTrigger value="vsg">VSG-CRI</TabsTrigger></TabsList>
        <TabsContent value="rcri"><Card>
          <CardHeader><CardTitle>Simulação RCRI</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">{RCRI_CRITERIA.map(criterion => <div key={criterion.id} className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox id={`rcri-${criterion.id}`} checked={rcriCriteria.includes(criterion.id)} onCheckedChange={checked => { setRcriCriteria(current => checked ? [...current, criterion.id] : current.filter(id => id !== criterion.id)); setResult(current => ({ ...current, rcri: undefined })) }} />
              <Label htmlFor={`rcri-${criterion.id}`} className="flex-1 cursor-pointer leading-relaxed">{criterion.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{criterion.description}</span></Label>
              <span className="text-sm text-muted-foreground">+1</span>
            </div>)}</div>
            <div className="flex flex-wrap items-center gap-4"><Button className="h-12" onClick={() => setResult(current => ({ ...current, rcri: calculateRCRI(rcriCriteria).score }))}>Calcular RCRI</Button>{result.rcri !== undefined && <output className="text-lg font-semibold" aria-live="polite">RCRI: {result.rcri} ponto(s)</output>}</div>
          </CardContent>
        </Card></TabsContent>
        <TabsContent value="vsg"><Card>
          <CardHeader><CardTitle>Simulação VSG-CRI</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">{VSGCRI_FACTORS.map(factor => <div key={factor.id} className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox id={`vsg-${factor.id}`} checked={vsgFactors.includes(factor.id)} onCheckedChange={checked => { setVsgFactors(current => checked ? [...current, factor.id] : current.filter(id => id !== factor.id)); setResult(current => ({ ...current, vsg: undefined })) }} />
              <Label htmlFor={`vsg-${factor.id}`} className="flex-1 cursor-pointer leading-relaxed">{factor.name}</Label><span className="text-sm text-muted-foreground">+{factor.points}</span>
            </div>)}</div>
            <div className="flex flex-wrap items-center gap-4"><Button className="h-12" onClick={() => setResult(current => ({ ...current, vsg: calculateVSGCRI(vsgFactors).score }))}>Calcular VSG-CRI</Button>{result.vsg !== undefined && <output className="text-lg font-semibold" aria-live="polite">VSG-CRI: {result.vsg} ponto(s)</output>}</div>
          </CardContent>
        </Card></TabsContent>
      </Tabs>
    </main>
  </>
}
