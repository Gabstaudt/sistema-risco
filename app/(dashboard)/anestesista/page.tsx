'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { Activity, ArrowRight, CheckCircle, ShieldPlus, Syringe, Users, XCircle } from 'lucide-react'

export default function AnestesistaDashboard() {
  const { patients, getPatientsByStatus } = useData()
  const showcasePatientIds = ['patient-8', 'patient-10', 'patient-11', 'patient-9']

  const aguardandoAvaliacao = patients.filter((patient) => {
    if (['aguardando_anestesista', 'em_avaliacao_anestesica'].includes(patient.status)) {
      return true
    }

    return (
      patient.cardiologyAssessment?.recommendation === 'aprovar' &&
      !patient.anesthesiaAssessment &&
      !patient.avaliacaoCirurgica &&
      !patient.surgicalRiskAssessment
    )
  })
  const encaminhadosAoCirurgiao = getPatientsByStatus('aguardando_cirurgiao')
  const necessitamComplementos = patients.filter((patient) => patient.anesthesiaAssessment?.requestsAdditionalEvaluation)
  const contraindicados = patients.filter((patient) => patient.anesthesiaAssessment?.recommendation === 'contraindicar')

  const recentes = patients
    .filter((patient) => patient.anesthesiaAssessment?.completedAt)
    .sort(
      (left, right) =>
        new Date(right.anesthesiaAssessment?.completedAt || 0).getTime() -
        new Date(left.anesthesiaAssessment?.completedAt || 0).getTime(),
    )
    .slice(0, 5)

  const queuePreview = aguardandoAvaliacao
    .sort((left, right) => new Date(left.dataEntrada).getTime() - new Date(right.dataEntrada).getTime())
    .slice(0, 4)

  const fallbackQueuePreview =
    queuePreview.length > 0
      ? queuePreview
      : patients
          .filter((patient) => showcasePatientIds.includes(patient.id))
          .sort((left, right) => new Date(right.dataEntrada).getTime() - new Date(left.dataEntrada).getTime())
          .slice(0, 4)

  const mockHighlights = [
    {
      title: 'Aguardando avaliacao',
      patient: fallbackQueuePreview[0],
      description: 'Caso liberado pela cardiologia e pendente de parecer pre-anestesico.',
    },
    {
      title: 'Pedindo complementos',
      patient: necessitamComplementos[0],
      description: 'Exemplo de paciente que precisa de exames ou reavaliacao antes da liberacao.',
    },
    {
      title: 'Contraindicado',
      patient: contraindicados[0],
      description: 'Caso mockado com restricao anestesica formal registrada.',
    },
  ].filter((item) => item.patient)

  return (
    <>
      <Header breadcrumbs={[{ label: 'Dashboard' }]} />
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anestesista</h1>
          <p className="text-muted-foreground">Avaliacao pre-anestesica entre cardiologia e cirurgia.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Na fila" value={aguardandoAvaliacao.length} description="Aguardando parecer" icon={Users} />
          <StatCard
            title="Encaminhados ao Cirurgiao"
            value={encaminhadosAoCirurgiao.length}
            description="Aptos para etapa cirurgica"
            icon={CheckCircle}
            iconClassName="bg-emerald-100"
          />
          <StatCard
            title="Complementos"
            value={necessitamComplementos.length}
            description="Pedem reavaliacao"
            icon={Activity}
            iconClassName="bg-amber-100"
          />
          <StatCard
            title="Contraindicados"
            value={contraindicados.length}
            description="Sem aptidao anestesica"
            icon={XCircle}
            iconClassName="bg-red-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">Fila Inicial do Anestesista</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/anestesista/fila">
                    Ver fila completa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fallbackQueuePreview.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum paciente aguardando avaliacao pre-anestesica.</p>
              ) : (
                <div className="space-y-3">
                  {fallbackQueuePreview.map((patient) => (
                    <div key={patient.id} className="rounded-xl border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={patient.status} />
                            {patient.cardiologyAssessment?.finalRiskLevel && (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                Cardio: {patient.cardiologyAssessment.finalRiskLevel}
                              </span>
                            )}
                            {patient.cardiologyAssessment?.postoperativeSupport && (
                              <span className="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-800">
                                {patient.cardiologyAssessment.postoperativeSupport === 'com_uti' ? 'C/ UTI' : 'S/ UTI'}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 font-medium">{patient.nomeCompleto}</p>
                          <p className="text-sm text-muted-foreground">{patient.avaliacaoClinica?.tipoCirurgia || patient.scheduledSurgery}</p>
                          <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <p>Cardiologista: {patient.clinicalAssignedCardiologistName || 'Nao informado'}</p>
                            <p>Urgencia: {patient.cardiologyAssessment?.urgency || patient.avaliacaoClinica?.urgencia || 'Nao informada'}</p>
                            <p>ASA atual: {patient.anesthesiaAssessment?.asaClassification || 'Pendente'}</p>
                            <p>Anestesia previa: {patient.anesthesiaAssessment?.anesthesiaType || 'Ainda nao definida'}</p>
                            <p>Via aerea: {patient.anesthesiaAssessment?.airwayAssessment || 'A avaliar'}</p>
                            <p>Complementos: {patient.anesthesiaAssessment?.requestsAdditionalEvaluation ? 'Solicitados' : 'Nao solicitados'}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {patient.anesthesiaAssessment?.notes ||
                              patient.cardiologyAssessment?.notes ||
                              'Sem observacoes adicionais para este caso.'}
                          </p>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/anestesista/avaliacao/${patient.id}`}>Abrir</Link>
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
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-700">Pareceres concluidos</p>
                <p className="mt-1 text-2xl font-semibold text-cyan-900">{recentes.length}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-indigo-700">Aptos para anestesia</p>
                <p className="mt-1 text-2xl font-semibold text-indigo-900">
                  {recentes.filter((patient) => patient.anesthesiaAssessment?.recommendation === 'aprovar').length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <ShieldPlus className="mt-0.5 h-5 w-5 text-slate-700" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Fluxo novo carregado</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Pacientes aprovados pela cardiologia agora passam pela avaliacao pre-anestesica antes do cirurgiao.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pareceres Pre-Anestesicos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum parecer anestesico emitido.</p>
            ) : (
              <div className="space-y-3">
                {recentes.map((patient) => (
                  <div key={patient.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Syringe className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{patient.nomeCompleto}</p>
                        <p className="truncate text-xs text-muted-foreground">{patient.anesthesiaAssessment?.anesthesiaType || 'Tipo de anestesia pendente'}</p>
                      </div>
                    </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>
                          {patient.anesthesiaAssessment?.recommendation === 'aprovar' && 'Aprovado'}
                          {patient.anesthesiaAssessment?.recommendation === 'reavaliar' && 'Reavaliar'}
                          {patient.anesthesiaAssessment?.recommendation === 'contraindicar' && 'Contraindicado'}
                        </p>
                        <p className="mt-1">ASA {patient.anesthesiaAssessment?.asaClassification || '-'}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <p>Via aerea: {patient.anesthesiaAssessment?.airwayAssessment || 'Nao descrita'}</p>
                      <p>Apto: {patient.anesthesiaAssessment?.fitForAnesthesia === true ? 'Sim' : patient.anesthesiaAssessment?.fitForAnesthesia === false ? 'Nao' : 'Pendente'}</p>
                      <p>Complementos: {patient.anesthesiaAssessment?.requestsAdditionalEvaluation ? 'Solicitados' : 'Nao'}</p>
                      <p>Cirurgia: {patient.avaliacaoClinica?.tipoCirurgia || patient.scheduledSurgery || 'Nao informada'}</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {patient.anesthesiaAssessment?.notes || 'Sem observacoes anestesicas adicionais.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mocks Iniciais da Anestesia</CardTitle>
          </CardHeader>
          <CardContent>
            {mockHighlights.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum mock anestesico carregado.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {mockHighlights.map(({ title, patient, description }) => (
                  <div key={`${title}-${patient?.id}`} className="rounded-xl border bg-card p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
                    <p className="mt-2 font-medium">{patient?.nomeCompleto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {patient?.anesthesiaAssessment?.anesthesiaType || patient?.avaliacaoClinica?.tipoCirurgia || patient?.scheduledSurgery}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">{description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge status={patient!.status} />
                      {patient?.anesthesiaAssessment?.asaClassification && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          ASA {patient.anesthesiaAssessment.asaClassification}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/anestesista/avaliacao/${patient?.id}`}>Abrir mock</Link>
                      </Button>
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
