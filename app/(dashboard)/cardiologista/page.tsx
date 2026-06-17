'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { Activity, ArrowRight, CheckCircle, Heart, ShieldAlert, Users, XCircle } from 'lucide-react'

export default function CardiologistaDashboard() {
  const { patients, getPatientsByStatus } = useData()

  const aguardandoAvaliacao = getPatientsByStatus(['aguardando_cardiologista', 'em_avaliacao_cardiologica'])
  const encaminhadosAoAnestesista = getPatientsByStatus('aguardando_anestesista')
  const altoRisco = getPatientsByStatus('alto_risco')
  const contraindicados = getPatientsByStatus('contraindicado')

  const recentes = patients
    .filter((patient) => patient.cardiologyAssessment?.completedAt)
    .sort(
      (left, right) =>
        new Date(right.cardiologyAssessment?.completedAt || 0).getTime() -
        new Date(left.cardiologyAssessment?.completedAt || 0).getTime(),
    )
    .slice(0, 5)

  const queuePreview = aguardandoAvaliacao
    .sort((left, right) => new Date(left.dataEntrada).getTime() - new Date(right.dataEntrada).getTime())
    .slice(0, 4)

  const postoperativeSupportSummary = recentes.reduce(
    (acc, patient) => {
      if (patient.cardiologyAssessment?.postoperativeSupport === 'com_uti') acc.comUti += 1
      if (patient.cardiologyAssessment?.postoperativeSupport === 'sem_uti') acc.semUti += 1
      return acc
    },
    { comUti: 0, semUti: 0 },
  )

  return (
    <>
      <Header breadcrumbs={[{ label: 'Dashboard' }]} />
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cardiologista</h1>
          <p className="text-muted-foreground">Liberacao cardiologica pre-operatoria antes do fluxo cirurgico.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Na fila" value={aguardandoAvaliacao.length} description="Aguardando parecer" icon={Users} />
          <StatCard
            title="Encaminhados ao Anestesista"
            value={encaminhadosAoAnestesista.length}
            description="Liberados pela cardiologia"
            icon={CheckCircle}
            iconClassName="bg-emerald-100"
          />
          <StatCard title="Alto Risco" value={altoRisco.length} description="Pedem reavaliacao" icon={Activity} iconClassName="bg-amber-100" />
          <StatCard title="Contraindicados" value={contraindicados.length} description="Sem liberacao cardiologica" icon={XCircle} iconClassName="bg-red-100" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">Fila Inicial do Cardiologista</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/cardiologista/fila">
                    Ver fila completa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {queuePreview.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum paciente aguardando avaliacao cardiologica.</p>
              ) : (
                <div className="space-y-3">
                  {queuePreview.map((patient) => (
                    <div key={patient.id} className="rounded-xl border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={patient.status} />
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              {patient.triageRiskClassification || 'nao_urgente'}
                            </span>
                          </div>
                          <p className="mt-2 font-medium">{patient.nomeCompleto}</p>
                          <p className="text-sm text-muted-foreground">{patient.avaliacaoClinica?.tipoCirurgia || patient.scheduledSurgery}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Clinico solicitante: {patient.requestingPhysician || 'Nao informado'}
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/cardiologista/avaliacao/${patient.id}`}>Abrir</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo Operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Liberacoes sem UTI</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-900">{postoperativeSupportSummary.semUti}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-700">Casos com UTI</p>
                <p className="mt-1 text-2xl font-semibold text-rose-900">{postoperativeSupportSummary.comUti}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Mock inicial carregado</p>
                    <p className="mt-1 text-sm text-amber-800">
                      A dashboard agora abre com pacientes aguardando parecer e historico cardiologico concluido para demonstracao.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pareceres Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum parecer cardiologico emitido.</p>
            ) : (
              <div className="space-y-3">
                {recentes.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{patient.nomeCompleto}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {patient.cardiologyAssessment?.surgeryType || patient.scheduledSurgery}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {patient.cardiologyAssessment?.recommendation === 'aprovar' && 'Aprovado'}
                      {patient.cardiologyAssessment?.recommendation === 'adiar' && 'Adiado'}
                      {patient.cardiologyAssessment?.recommendation === 'contraindicar' && 'Contraindicado'}
                    </span>
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
