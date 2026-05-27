'use client'

import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { PatientQueue } from '@/components/shared/patient-queue'
import { Users, UserPlus, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function RecepcaoDashboard() {
  const { patients, getPatientsByStatus } = useData()
  
  const aguardandoTriagem = getPatientsByStatus('aguardando_triagem')
  const emAtendimento = patients.filter((patient) =>
    !['aguardando_triagem', 'liberado', 'contraindicado', 'alto_risco', 'concluido'].includes(patient.status)
  )
  const cadastradosHoje = patients.filter(p => {
    const hoje = new Date()
    const cadastro = new Date(p.cadastradoEm)
    return cadastro.toDateString() === hoje.toDateString()
  })

  return (
    <>
      <Header 
        breadcrumbs={[{ label: 'Dashboard' }]} 
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Header com acoes */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recepcao</h1>
            <p className="text-muted-foreground">Cadastro e encaminhamento de pacientes</p>
          </div>
          <Button asChild>
            <Link href="/recepcao/cadastro">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Paciente
            </Link>
          </Button>
        </div>

        {/* Cards de estatisticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Base de Pacientes"
            value={patients.length}
            description="Cadastros disponiveis"
            icon={Users}
          />
          <StatCard
            title="Cadastros Hoje"
            value={cadastradosHoje.length}
            description="Novos pacientes incluidos"
            icon={UserPlus}
          />
          <StatCard
            title="Aguardando Triagem"
            value={aguardandoTriagem.length}
            description="Encaminhados pela recepcao"
            icon={Clock}
          />
          <StatCard
            title="Em Atendimento"
            value={emAtendimento.length}
            description="Pacientes em fluxo assistencial"
            icon={CheckCircle}
          />
        </div>

        {/* Fila de pacientes aguardando triagem */}
        <PatientQueue
          patients={aguardandoTriagem}
          title="Pacientes Aguardando Triagem"
          actionUrl={() => '/recepcao/pacientes'}
          actionLabel="Ir para fila"
          emptyMessage="Nenhum paciente aguardando triagem"
        />

        <PatientQueue
          patients={emAtendimento}
          title="Pacientes Em Atendimento"
          actionUrl={() => '/recepcao/pacientes'}
          actionLabel="Ir para fila"
          emptyMessage="Nenhum paciente em atendimento"
          showPriority={false}
        />
      </div>
    </>
  )
}
