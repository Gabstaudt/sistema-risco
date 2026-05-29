'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { ASABadge, RCRIBadge, RiskLevelBadge, StatusBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { ASA_CLASSIFICATIONS, RCRI_CRITERIA, VSGCRI_FACTORS, calculateRCRI, calculateVSGCRI } from '@/lib/data/exams'
import type { ASAClassification, LabUrgency, Patient, RiskLevel } from '@/lib/types'
import { AlertTriangle, ArrowRight, Calculator, HeartPulse, Search, ShieldCheck, User } from 'lucide-react'

const triageRank: Record<LabUrgency, number> = {
  emergente: 0,
  muito_urgente: 1,
  urgente: 2,
  pouco_urgente: 3,
  nao_urgente: 4,
}

function getVsgRiskLevel(riskClass?: string): RiskLevel {
  if (riskClass === 'Classe I') return 'baixo'
  if (riskClass === 'Classe II') return 'moderado'
  if (riskClass === 'Classe III') return 'alto'
  return 'critico'
}

function getSystemRiskLevel(patient: Patient): RiskLevel {
  if (patient.surgicalRiskAssessment?.finalRiskLevel) return patient.surgicalRiskAssessment.finalRiskLevel
  if (patient.riskLevel) return patient.riskLevel

  const rcriScore = patient.clinicalEvaluation?.rcriScore?.score || 0
  const vsgClass = patient.clinicalEvaluation?.vsgcriScore?.riskClass
  const triageRisk = patient.labRiskClassification || patient.triageRiskClassification

  if (triageRisk === 'emergente' || triageRisk === 'muito_urgente') return 'critico'
  if (rcriScore >= 3 || vsgClass === 'Classe IV') return 'critico'
  if (rcriScore === 2 || vsgClass === 'Classe III') return 'alto'
  if (rcriScore === 1 || vsgClass === 'Classe II') return 'moderado'
  return 'baixo'
}

function getSystemPriorityScore(patient: Patient) {
  const finalRisk = getSystemRiskLevel(patient)
  const riskRank =
    finalRisk === 'critico' ? 0 :
    finalRisk === 'alto' ? 1 :
    finalRisk === 'moderado' ? 2 :
    finalRisk === 'baixo' ? 3 :
    finalRisk === 'contraindicado' ? 4 : 5

  const triageRisk = patient.labRiskClassification || patient.triageRiskClassification || 'nao_urgente'
  const rcriScore = patient.clinicalEvaluation?.rcriScore?.score || 0
  const vsgScore = patient.clinicalEvaluation?.vsgcriScore?.score || 0

  return {
    riskRank,
    triageRank: triageRank[triageRisk],
    rcriScore,
    vsgScore,
    timestamp: new Date(patient.dataEntrada).getTime(),
  }
}

function formatDateTime(value?: string) {
  if (!value) return 'Nao informado'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CirurgiaoCalculadoraPage() {
  const { patients } = useData()
  const [search, setSearch] = useState('')
  const [selectedASA, setSelectedASA] = useState<ASAClassification | ''>('')
  const [rcriCriteria, setRcriCriteria] = useState<string[]>([])
  const [vsgcriFactors, setVsgcriFactors] = useState<string[]>([])

  const rcri = useMemo(() => calculateRCRI(rcriCriteria), [rcriCriteria])
  const vsgcri = useMemo(() => calculateVSGCRI(vsgcriFactors), [vsgcriFactors])
  const vsgRiskLevel = getVsgRiskLevel(vsgcri.riskClass)

  const riskQueue = useMemo(() => {
    const term = search.trim().toLowerCase()

    return patients
      .filter((patient) => {
        const canMatterToSurgeon =
          patient.status === 'aguardando_cirurgiao' ||
          patient.status === 'em_avaliacao_cirurgica' ||
          patient.status === 'alto_risco' ||
          Boolean(patient.clinicalRequestsSurgicalRisk)

        if (!canMatterToSurgeon) return false

        return (
          term === '' ||
          patient.nomeCompleto.toLowerCase().includes(term) ||
          patient.prontuario.toLowerCase().includes(term) ||
          (patient.scheduledSurgery || '').toLowerCase().includes(term) ||
          (patient.requestingPhysician || '').toLowerCase().includes(term)
        )
      })
      .map((patient) => ({
        patient,
        systemRisk: getSystemRiskLevel(patient),
        score: getSystemPriorityScore(patient),
      }))
      .sort((left, right) => {
        if (left.score.riskRank !== right.score.riskRank) return left.score.riskRank - right.score.riskRank
        if (left.score.triageRank !== right.score.triageRank) return left.score.triageRank - right.score.triageRank
        if (left.score.rcriScore !== right.score.rcriScore) return right.score.rcriScore - left.score.rcriScore
        if (left.score.vsgScore !== right.score.vsgScore) return right.score.vsgScore - left.score.vsgScore
        return left.score.timestamp - right.score.timestamp
      })
  }, [patients, search])

  const criticalCount = riskQueue.filter((item) => item.systemRisk === 'critico' || item.systemRisk === 'alto').length

  return (
    <>
      <Header breadcrumbs={[{ label: 'Cirurgiao', href: '/cirurgiao' }, { label: 'Calculadora de Risco' }]} />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Calculadora e Prioridade de Risco</h1>
            <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
              A tela mostra primeiro os pacientes que o sistema entende como mais arriscados para avaliacao cirurgica e, ao lado, deixa uma calculadora manual para simulacoes ou apoio rapido de decisao.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedASA('')
              setRcriCriteria([])
              setVsgcriFactors([])
            }}
          >
            Limpar calculadora
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Na fila de risco</p>
              <p className="mt-1 text-2xl font-semibold">{riskQueue.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Alto / critico</p>
              <p className="mt-1 text-2xl font-semibold">{criticalCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-400">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Calculadora</p>
              <p className="mt-1 text-sm text-muted-foreground">Use manualmente para um paciente especifico, se precisar.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pacientes com Maior Risco Calculado</CardTitle>
                <CardDescription>
                  Ordenacao automatica por risco sistemico, urgencia da triagem, RCRI, VSG-CRI e tempo de entrada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por paciente, prontuario, cirurgia ou medico..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>

                {riskQueue.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhum paciente elegivel para calculo de risco no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riskQueue.map(({ patient, systemRisk }, index) => (
                      <div key={patient.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                  {index + 1}o da fila
                                </span>
                                <StatusBadge status={patient.status} />
                                <RiskLevelBadge level={systemRisk} />
                                {patient.triageData?.asaClassification ? <ASABadge classification={patient.triageData.asaClassification} /> : null}
                                {patient.clinicalEvaluation?.rcriScore ? <RCRIBadge score={patient.clinicalEvaluation.rcriScore.score} /> : null}
                              </div>
                              <p className="mt-2 break-words font-medium">{patient.nomeCompleto}</p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span>{patient.prontuario}</span>
                                <span>{patient.idade} anos</span>
                                <span>Entrada em {formatDateTime(patient.dataEntrada)}</span>
                                <span>Cirurgia: {patient.scheduledSurgery || 'Nao informada'}</span>
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Risco sistemico</p>
                                  <div className="mt-1">
                                    <RiskLevelBadge level={systemRisk} />
                                  </div>
                                </div>
                                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">RCRI</p>
                                  <p className="mt-1 font-medium">
                                    {patient.clinicalEvaluation?.rcriScore?.score ?? 0} | {patient.clinicalEvaluation?.rcriScore?.riskPercentage || 'Sem calculo'}
                                  </p>
                                </div>
                                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">VSG-CRI</p>
                                  <p className="mt-1 font-medium">
                                    {patient.clinicalEvaluation?.vsgcriScore?.score ?? 0} | {patient.clinicalEvaluation?.vsgcriScore?.riskClass || 'Sem calculo'}
                                  </p>
                                </div>
                                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Triagem / laboratorio</p>
                                  <p className="mt-1 font-medium">
                                    {patient.labRiskClassification || patient.triageRiskClassification || 'Sem cor'}
                                  </p>
                                </div>
                              </div>
                              {(patient.surgicalRiskAssessment?.notes || patient.clinicalEvaluation?.notes) ? (
                                <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-sm">
                                  <p className="font-medium">Contexto assistencial</p>
                                  <p className="mt-1 break-words text-muted-foreground">
                                    {patient.surgicalRiskAssessment?.notes || patient.clinicalEvaluation?.notes}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                            <Button asChild className="w-full sm:w-[190px]">
                              <Link href={`/cirurgiao/avaliacao/${patient.id}`}>
                                Avaliar
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full sm:w-[190px]">
                              <Link href={`/cirurgiao/relatorio/${patient.id}`}>Ver relatorio</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calculadora Manual</CardTitle>
                <CardDescription>Use para simular rapidamente um paciente especifico ou revisar um caso fora da fila.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Classe ASA</Label>
                  <Select value={selectedASA} onValueChange={(value) => setSelectedASA(value as ASAClassification)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classificacao ASA" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASA_CLASSIFICATIONS.map((item) => (
                        <SelectItem key={item.classification} value={item.classification}>
                          {`ASA ${item.classification} - ${item.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">ASA</p>
                  <div className="mt-2">
                    {selectedASA ? <ASABadge classification={selectedASA} /> : <span className="text-sm text-muted-foreground">Nao selecionado</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-primary" />
                  RCRI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {RCRI_CRITERIA.map((criteria) => (
                    <div key={criteria.id} className="flex items-start gap-3 rounded-xl border p-3">
                      <Checkbox
                        id={criteria.id}
                        checked={rcriCriteria.includes(criteria.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setRcriCriteria((prev) => [...prev, criteria.id])
                            return
                          }
                          setRcriCriteria((prev) => prev.filter((item) => item !== criteria.id))
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={criteria.id} className="cursor-pointer text-sm font-medium">
                          {criteria.name}
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">{criteria.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <RCRIBadge score={rcri.score} />
                    <span className="text-sm text-muted-foreground">{rcri.riskPercentage}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  VSG-CRI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {VSGCRI_FACTORS.map((factor) => (
                    <div key={factor.id} className="flex items-start gap-3 rounded-xl border p-3">
                      <Checkbox
                        id={factor.id}
                        checked={vsgcriFactors.includes(factor.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVsgcriFactors((prev) => [...prev, factor.id])
                            return
                          }
                          setVsgcriFactors((prev) => prev.filter((item) => item !== factor.id))
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={factor.id} className="cursor-pointer text-sm font-medium">
                          {factor.name}
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">{factor.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {factor.points} pts
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskLevelBadge level={vsgRiskLevel} />
                    <span className="text-sm text-muted-foreground">{vsgcri.riskClass}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
