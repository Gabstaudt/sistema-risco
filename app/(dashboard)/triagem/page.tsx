'use client'

import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { PatientQueue } from '@/components/shared/patient-queue'
import { Users, Activity, Clock, Stethoscope } from 'lucide-react'

export default function TriagemDashboard() {
  const { patients, getPatientsByStatus } = useData()
  
  const aguardandoTriagem = getPatientsByStatus('aguardando_triagem')
  const emTriagem = getPatientsByStatus('em_triagem')
  const encaminhadosClinico = getPatientsByStatus(['aguardando_clinico', 'em_avaliacao_clinica'])
  
  const atendidosHoje = patients.filter(p => {
    if (!p.sinaisVitais?.registradoEm) return false
    const hoje = new Date()
    const registro = new Date(p.sinaisVitais.registradoEm)
    return registro.toDateString() === hoje.toDateString()
  })

  return (
    <>
      <Header 
        breadcrumbs={[{ label: 'Dashboard' }]} 
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Triagem</h1>
          <p className="text-muted-foreground">Registro de sinais vitais e encaminhamento</p>
        </div>

        {/* Cards de estatisticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Aguardando Triagem"
            value={aguardandoTriagem.length}
            description="Na fila de espera"
            icon={Clock}
          />
          <StatCard
            title="Em Triagem"
            value={emTriagem.length}
            description="Sendo atendidos"
            icon={Activity}
          />
          <StatCard
            title="Atendidos Hoje"
            value={atendidosHoje.length}
            description="Triagens realizadas"
            icon={Users}
          />
          <StatCard
            title="Encaminhados"
            value={encaminhadosClinico.length}
            description="Para medico clinico"
            icon={Stethoscope}
          />
        </div>

        {/* Fila de pacientes */}
        <PatientQueue
          patients={aguardandoTriagem}
          title="Pacientes Aguardando Triagem"
          actionUrl={(id) => `/triagem/atendimento/${id}`}
          actionLabel="Atender"
          emptyMessage="Nenhum paciente aguardando triagem"
        />
      </div>
    </>
  )
}
