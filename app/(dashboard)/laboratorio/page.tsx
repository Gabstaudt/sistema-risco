'use client'

import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FlaskConical, Clock, CheckCircle, TestTube, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function LaboratorioDashboard() {
  const { examRequests, getExamRequestsByStatus, patients } = useData()
  
  const solicitados = getExamRequestsByStatus('solicitado')
  const coletados = getExamRequestsByStatus('coletado')
  const emAnalise = getExamRequestsByStatus('em_analise')
  const concluidos = getExamRequestsByStatus('concluido')

  const pendentes = [...solicitados, ...coletados, ...emAnalise]

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId)
    return patient?.nomeCompleto || 'Paciente desconhecido'
  }

  const statusLabels = {
    solicitado: { label: 'Solicitado', color: 'bg-amber-100 text-amber-800' },
    coletado: { label: 'Coletado', color: 'bg-blue-100 text-blue-800' },
    em_analise: { label: 'Em Analise', color: 'bg-purple-100 text-purple-800' },
    concluido: { label: 'Concluido', color: 'bg-emerald-100 text-emerald-800' },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  }

  return (
    <>
      <Header 
        breadcrumbs={[{ label: 'Dashboard' }]} 
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laboratorio</h1>
          <p className="text-muted-foreground">Gestao de exames e resultados</p>
        </div>

        {/* Cards de estatisticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Solicitados"
            value={solicitados.length}
            description="Aguardando coleta"
            icon={Clock}
          />
          <StatCard
            title="Coletados"
            value={coletados.length}
            description="Aguardando analise"
            icon={TestTube}
          />
          <StatCard
            title="Em Analise"
            value={emAnalise.length}
            description="Sendo processados"
            icon={FlaskConical}
          />
          <StatCard
            title="Concluidos Hoje"
            value={concluidos.filter(e => {
              if (!e.concluidoEm) return false
              const hoje = new Date()
              const conclusao = new Date(e.concluidoEm)
              return conclusao.toDateString() === hoje.toDateString()
            }).length}
            description="Resultados liberados"
            icon={CheckCircle}
          />
        </div>

        {/* Lista de exames pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Exames Pendentes</CardTitle>
            <span className="text-sm text-muted-foreground">{pendentes.length} exames</span>
          </CardHeader>
          <CardContent>
            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum exame pendente
              </p>
            ) : (
              <div className="space-y-3">
                {pendentes.slice(0, 10).map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{exam.examTypeName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{getPatientName(exam.patientId)}</span>
                          <span>|</span>
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(exam.solicitadoEm), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[exam.status].color}`}>
                        {statusLabels[exam.status].label}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/laboratorio/resultado/${exam.id}`}>
                          Registrar
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
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
