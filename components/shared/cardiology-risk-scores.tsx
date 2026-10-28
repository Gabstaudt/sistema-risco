'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CardiologyAssessment, Patient } from '@/lib/types'

export const CARDIOLOGY_SCORE_LABELS = { rcri: 'RCRI', vsgcri: 'VSG-CRI', emapo: 'EMAPO', acp: 'ACP / Detsky' } as const
export type CardiologyScores = NonNullable<CardiologyAssessment['riskScores']>
export function getCardiologyScores(patient?: Patient): CardiologyScores {
  const legacy = patient?.clinicalEvaluation
  return { ...(legacy?.rcriScore ? { rcri: { result: String(legacy.rcriScore.score), interpretation: legacy.rcriScore.riskPercentage } } : {}), ...(legacy?.vsgcriScore ? { vsgcri: { result: String(legacy.vsgcriScore.score), interpretation: legacy.vsgcriScore.riskClass } } : {}), ...patient?.cardiologyAssessment?.riskScores }
}
export function CardiologyRiskScores({ value, onChange }: { value: CardiologyScores; onChange?: (value: CardiologyScores) => void }) {
  return <Card>
    <CardHeader><CardTitle>Scores de risco — Cardiologia</CardTitle></CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(CARDIOLOGY_SCORE_LABELS).map(([key, label]) => {
        const score = key as keyof CardiologyScores
        const current = value[score] || { result: '', interpretation: '' }
        return <div key={key} className="space-y-3 rounded-lg border p-4">
          <p className="font-semibold">{label}</p>
          {onChange ? <>
            <div className="space-y-2"><Label htmlFor={`cardio-${key}-result`}>Resultado / pontuação</Label><Input id={`cardio-${key}-result`} className="h-12" value={current.result} onChange={(event) => onChange({ ...value, [score]: { ...current, result: event.target.value } })} placeholder="Não informado" /></div>
            <div className="space-y-2"><Label htmlFor={`cardio-${key}-interpretation`}>Interpretação</Label>{key === 'acp' ? <select id={`cardio-${key}-interpretation`} className="h-12 w-full rounded-md border bg-background px-3" value={current.interpretation} onChange={(event) => onChange({ ...value, [score]: { ...current, interpretation: event.target.value } })}><option value="">Não informado</option><option>Baixo risco</option><option>Intermediário</option><option>Alto risco</option></select> : <Input id={`cardio-${key}-interpretation`} className="h-12" value={current.interpretation} onChange={(event) => onChange({ ...value, [score]: { ...current, interpretation: event.target.value } })} placeholder="Classe / risco segundo o protocolo" />}</div>
          </> : <><p className="text-lg font-semibold">{current.result || 'Não registrado'}</p>{current.interpretation && <p className="break-words text-sm text-muted-foreground">{current.interpretation}</p>}</>}
        </div>
      })}
    </CardContent>
  </Card>
}
