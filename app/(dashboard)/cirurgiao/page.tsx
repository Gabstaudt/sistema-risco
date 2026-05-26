'use client'

import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { PatientQueue } from '@/components/shared/patient-queue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Heart, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { RiskBadge } from '@/components/shared/badges'

export default function CirurgiaoDashboard() {
  const { patients, getPatientsByStatus } = useData()
  
  const aguardandoAvaliacao = getPatientsByStatus(['aguardando_cirurgiao', 'em_avaliacao_cirurgica'])
  const liberados = getPatientsByStatus('liberado')
  const altoRisco = getPatientsByStatus('alto_risco')
  const contraindicados = getPatientsByStatus('contraindicado')

  // Pacientes recentes com avaliacao
  const pacientesAvaliados = patients
    .filter(p => p.avaliacaoCirurgica)
    .sort((a, b) => new Date(b.avaliacaoCirurgica!.avaliadoEm).getTime() - new Date(a.avaliacaoCirurgica!.avaliadoEm).getTime())
    .slice(0, 5)

  return (
    <>
      <Header 
        breadcrumbs={[{ label: 'Dashboard' }]} 
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cirurgiao</h1>
          <p className="text-muted-foreground">Avaliacao de risco e liberacao cirurgica</p>
        </div>

        {/* Cards de estatisticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Aguardando Avaliacao"
            value={aguardandoAvaliacao.length}
            description="Pacientes na fila"
            icon={Users}
          />
          <StatCard
            title="Liberados"
            value={liberados.length}
            description="Aptos para cirurgia"
            icon={CheckCircle}
            iconClassName="bg-emerald-100"
          />
          <StatCard
            title="Alto Risco"
            value={altoRisco.length}
            description="Requerem atencao"
            icon={AlertTriangle}
            iconClassName="bg-amber-100"
          />
          <StatCard
            title="Contraindicados"
            value={contraindicados.length}
            description="Cirurgia nao recomendada"
            icon={XCircle}
            iconClassName="bg-red-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fila de pacientes */}
          <PatientQueue
            patients={aguardandoAvaliacao}
            title="Aguardando Avaliacao Cirurgica"
            actionUrl={(id) => `/cirurgiao/avaliacao/${id}`}
            actionLabel="Avaliar"
            emptyMessage="Nenhum paciente aguardando avaliacao"
          />

          {/* Avaliacoes recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avaliacoes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {pacientesAvaliados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma avaliacao realizada
                </p>
              ) : (
                <div className="space-y-3">
                  {pacientesAvaliados.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{patient.nomeCompleto}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {patient.avaliacaoCirurgica?.tipoCirurgia}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2">
                        <RiskBadge risk={patient.avaliacaoCirurgica?.riscoFinal || 'pendente'} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
