'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/badges'
import { ArrowRight, Clock, User } from 'lucide-react'

export default function TriagemDashboard() {
  const { getPatientsByStatus } = useData()

  const triageQueue = getPatientsByStatus('aguardando_triagem').sort(
    (a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime(),
  )

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Fila de Triagem' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Fila de Triagem</h1>
          <p className="max-w-3xl text-muted-foreground">
            Pacientes organizados por ordem de chegada na recepcao. A triagem deve atender apenas quem esta
            com status aguardando triagem.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pacientes Aguardando Triagem</CardTitle>
            <CardDescription>{triageQueue.length} paciente(s) na fila por ordem de chegada.</CardDescription>
          </CardHeader>
          <CardContent>
            {triageQueue.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Nenhum paciente aguardando triagem.</div>
            ) : (
              <div className="space-y-3">
                {triageQueue.map((patient, index) => (
                  <div
                    key={patient.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/20 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {index + 1}º da fila
                          </span>
                          <StatusBadge status={patient.status} />
                        </div>
                        <p className="mt-2 break-words font-medium">{patient.nomeCompleto}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{patient.idade} anos</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Entrada na recepcao as {formatTime(patient.dataEntrada)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button asChild className="w-full lg:w-auto">
                      <Link href={`/triagem/atendimento/${patient.id}`}>
                        Atender
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
