'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { users } from '@/lib/data/users'
import { ASSESSMENT_LABELS, hasPendingAssessment, type AssessmentDraft } from '@/lib/assessment-requests'
import type { Patient } from '@/lib/types'

export function AssessmentRequestFields({ value, onChange, patient, surgeon = false }: { value: AssessmentDraft; onChange: (value: AssessmentDraft) => void; patient: Patient; surgeon?: boolean }) {
  const specialties = surgeon ? ['cardiologista', 'anestesista'] as const : ['cirurgiao', 'anestesista', 'cardiologista'] as const
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações de avaliação</CardTitle>
        <CardDescription>Solicite o risco cirúrgico e selecione as especialidades que devem avaliar o paciente. O profissional responsável é opcional.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Checkbox id="request-surgical-risk" checked={value.requestRisk} onCheckedChange={(checked) => onChange({ ...value, requestRisk: Boolean(checked), targets: checked && value.targets.length === 0 ? ['cardiologista', 'anestesista'] : value.targets })} />
          <Label htmlFor="request-surgical-risk" className="cursor-pointer text-base">Solicitar risco cirúrgico</Label>
        </div>
        <div className={`grid gap-4 ${surgeon ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          {specialties.map((specialty) => {
            const selected = value.targets.includes(specialty)
            const pending = hasPendingAssessment(patient, specialty)
            return (
              <div key={specialty} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Checkbox id={`request-${specialty}`} checked={selected} disabled={pending} onCheckedChange={(checked) => onChange({ ...value, targets: checked ? [...value.targets, specialty] : value.targets.filter((item) => item !== specialty) })} />
                  <Label htmlFor={`request-${specialty}`} className="cursor-pointer text-base">Solicitar {ASSESSMENT_LABELS[specialty]}</Label>
                </div>
                {pending && <p className="text-sm text-muted-foreground">Avaliação já solicitada e aguardando atendimento.</p>}
                {selected && <div className="space-y-2">
                  <Label htmlFor={`assigned-${specialty}`}>Profissional responsável (opcional)</Label>
                  <Select value={value.assignees[specialty] || 'unassigned'} onValueChange={(id) => onChange({ ...value, assignees: { ...value.assignees, [specialty]: id === 'unassigned' ? '' : id } })}>
                    <SelectTrigger id={`assigned-${specialty}`} className="h-12 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sem profissional definido</SelectItem>
                      {users.filter((item) => item.role === specialty && item.active).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
