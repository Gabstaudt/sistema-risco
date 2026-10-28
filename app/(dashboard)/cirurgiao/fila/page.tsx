'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { hasPendingAssessment } from '@/lib/assessment-requests'
import { getPatientManchesterPriority, MANCHESTER_PRIORITIES } from '@/lib/manchester'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/badges'

export default function CirurgiaoFilaPage() {
  const { patients } = useData()
  const [search, setSearch] = useState('')
  const queue = patients.filter(patient =>
    (['aguardando_cirurgiao', 'em_avaliacao_cirurgica'].includes(patient.status) || hasPendingAssessment(patient, 'cirurgiao')) &&
    `${patient.nomeCompleto} ${patient.prontuario} ${patient.scheduledSurgery || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  ).sort((a, b) => {
    const left = getPatientManchesterPriority(a)
    const right = getPatientManchesterPriority(b)
    return (left ? MANCHESTER_PRIORITIES[left].targetMinutes : Infinity) - (right ? MANCHESTER_PRIORITIES[right].targetMinutes : Infinity) || Date.parse(a.dataEntrada) - Date.parse(b.dataEntrada)
  })
  return <>
    <Header breadcrumbs={[{ label: 'Aguardando avaliação' }]} />
    <main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Aguardando avaliação cirúrgica</h1>
      <Input aria-label="Buscar paciente" placeholder="Buscar paciente, prontuário ou cirurgia" className="h-12" value={search} onChange={event => setSearch(event.target.value)} />
      <Card>
        <CardHeader><CardTitle>Pacientes · {queue.length}</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {queue.map(patient => {
              const priority = getPatientManchesterPriority(patient)
              return <li key={patient.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="break-words font-semibold">{patient.nomeCompleto}</p>
                  <p className="break-words text-sm text-muted-foreground">{patient.prontuario} · {patient.idade} anos · {patient.scheduledSurgery || 'Cirurgia não informada'}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={patient.status} />
                    {priority && <span className={`rounded-md border px-2 py-1 text-xs ${MANCHESTER_PRIORITIES[priority].className}`}>{MANCHESTER_PRIORITIES[priority].label}</span>}
                    {patient.id.startsWith('demo-surgery-') && <span className="text-xs text-muted-foreground">Demonstração</span>}
                    <span className="text-xs text-muted-foreground">Entrada: {new Date(patient.dataEntrada).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="h-11"><Link href={`/cirurgiao/avaliacao/${patient.id}`}>Avaliar</Link></Button>
                  <Button asChild variant="outline" className="h-11"><Link href={`/paciente/${patient.id}`}>Prontuário</Link></Button>
                </div>
              </li>
            })}
            {!queue.length && <li className="py-8 text-center text-muted-foreground">Nenhum paciente nesta lista.</li>}
          </ul>
        </CardContent>
      </Card>
    </main>
  </>
}
