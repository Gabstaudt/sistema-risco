'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MANCHESTER_PRIORITIES } from '@/lib/manchester'

export function RecentTriagePatients() {
  const { hasPermission } = useAuth()
  const { patients } = useData()

  if (!hasPermission('view_triage_data') || !hasPermission('view_patient_basic')) return null

  const recent = patients
    .filter((patient) => patient.triageData?.completedAt && Number.isFinite(Date.parse(patient.triageData.completedAt)))
    .sort((a, b) => Date.parse(b.triageData!.completedAt!) - Date.parse(a.triageData!.completedAt!))
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos pacientes atendidos</CardTitle>
        <CardDescription>As 10 triagens concluídas mais recentes pela equipe.</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Nenhuma triagem concluída registrada.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((patient) => {
              const priority = patient.triageData?.manchester?.priority || patient.triageRiskClassification
              return (
                <li key={patient.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{patient.nomeCompleto}</p>
                    <p className="text-sm text-muted-foreground">
                      Concluída em {new Date(patient.triageData!.completedAt!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {patient.triageAssignedClinicianName && <p className="text-sm text-muted-foreground">Encaminhado para {patient.triageAssignedClinicianName}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {priority && <span className={`rounded-md border px-2 py-1 text-xs font-medium ${MANCHESTER_PRIORITIES[priority].className}`}>{MANCHESTER_PRIORITIES[priority].label}</span>}
                    <Button asChild variant="outline" className="h-11">
                      <Link href={`/paciente/${patient.id}`}>Ver paciente</Link>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
