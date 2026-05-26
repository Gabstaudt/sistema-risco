'use client'

import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { PatientQueue } from '@/components/shared/patient-queue'
import { Users, Stethoscope, FlaskConical, FileText } from 'lucide-react'

export default function ClinicoDashboard() {
  const { patients, getPatientsByStatus, getPendingExams } = useData()
  
  const aguardandoAvaliacao = getPatientsByStatus(['aguardando_clinico', 'em_avaliacao_clinica'])
  const comExamesSolicitados = getPatientsByStatus(['exames_solicitados', 'aguardando_laboratorio', 'exames_em_analise'])
  const comExamesConcluidos = getPatientsByStatus('exames_concluidos')
  const examesPendentes = getPendingExams()

  return (
    <>
      <Header 
        breadcrumbs={[{ label: 'Dashboard' }]} 
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medico Clinico</h1>
          <p className="text-muted-foreground">Avaliacao clinica e solicitacao de exames</p>
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
            title="Em Avaliacao"
            value={patients.filter(p => p.status === 'em_avaliacao_clinica').length}
            description="Sendo avaliados"
            icon={Stethoscope}
          />
          <StatCard
            title="Exames Pendentes"
            value={examesPendentes.length}
            description="Aguardando resultados"
            icon={FlaskConical}
          />
          <StatCard
            title="Exames Concluidos"
            value={comExamesConcluidos.length}
            description="Prontos para revisao"
            icon={FileText}
          />
        </div>

        {/* Filas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PatientQueue
            patients={aguardandoAvaliacao}
            title="Aguardando Avaliacao Clinica"
            actionUrl={(id) => `/clinico/avaliar/${id}`}
            actionLabel="Avaliar"
            emptyMessage="Nenhum paciente aguardando avaliacao"
          />
          <PatientQueue
            patients={comExamesConcluidos}
            title="Exames Concluidos - Revisar"
            actionUrl={(id) => `/clinico/revisar/${id}`}
            actionLabel="Revisar"
            emptyMessage="Nenhum exame para revisar"
            showPriority={false}
          />
        </div>
      </div>
    </>
  )
}
