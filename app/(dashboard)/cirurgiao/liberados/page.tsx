'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { RiskBadge, StatusBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle2, FileText, Search, ShieldCheck, User } from 'lucide-react'
import { useData } from '@/lib/data-context'

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

export default function CirurgiaoLiberadosPage() {
  const { patients } = useData()
  const [search, setSearch] = useState('')

  const liberatedPatients = useMemo(() => {
    const term = search.trim().toLowerCase()

    return patients
      .filter((patient) => patient.status === 'liberado' || patient.surgicalRiskAssessment?.recommendation === 'aprovar')
      .filter((patient) => {
        return (
          term === '' ||
          patient.nomeCompleto.toLowerCase().includes(term) ||
          patient.prontuario.toLowerCase().includes(term) ||
          (patient.scheduledSurgery || '').toLowerCase().includes(term) ||
          (patient.requestingPhysician || '').toLowerCase().includes(term)
        )
      })
      .sort((a, b) => {
        const left = a.surgicalRiskAssessment?.completedAt || a.updatedAt || a.dataEntrada
        const right = b.surgicalRiskAssessment?.completedAt || b.updatedAt || b.dataEntrada
        return new Date(right).getTime() - new Date(left).getTime()
      })
  }, [patients, search])

  return (
    <>
      <Header breadcrumbs={[{ label: 'Cirurgiao', href: '/cirurgiao' }, { label: 'Pacientes Liberados' }]} />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pacientes Liberados</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Casos com parecer cirurgico favoravel e aptos para seguir o preparo operatorio.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fila de Liberados</CardTitle>
            <CardDescription>{liberatedPatients.length} paciente(s) liberado(s) para cirurgia.</CardDescription>
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

            {liberatedPatients.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum paciente liberado encontrado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liberatedPatients.map((patient) => (
                  <div key={patient.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={patient.status} />
                            <RiskBadge risk={patient.surgicalRiskAssessment?.finalRiskLevel || patient.riskLevel || 'pendente'} />
                          </div>
                          <p className="mt-2 break-words font-medium">{patient.nomeCompleto}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{patient.prontuario}</span>
                            <span>{patient.idade} anos</span>
                            <span>Cirurgia: {patient.scheduledSurgery || 'Nao informada'}</span>
                            <span>Solicitante: {patient.requestingPhysician || 'Nao informado'}</span>
                          </div>
                          <div className="mt-2 rounded-xl border bg-muted/20 p-3 text-sm">
                            <p className="font-medium">Parecer cirurgico</p>
                            <p className="mt-1 break-words text-muted-foreground">
                              {patient.surgicalRiskAssessment?.notes || 'Sem observacoes adicionais.'}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Finalizado em {formatDateTime(patient.surgicalRiskAssessment?.completedAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                        <Button asChild className="w-full sm:w-[190px]">
                          <Link href={`/cirurgiao/relatorio/${patient.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver relatorio
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full sm:w-[190px]">
                          <Link href={`/cirurgiao/avaliacao/${patient.id}`}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Reavaliar
                          </Link>
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
    </>
  )
}
