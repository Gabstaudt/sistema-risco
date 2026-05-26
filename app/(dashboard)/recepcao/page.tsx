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
            title="Total de Pacientes"
            value={patients.length}
            description="Cadastrados no sistema"
            icon={Users}
          />
          <StatCard
            title="Cadastrados Hoje"
            value={cadastradosHoje.length}
            description="Novos registros"
            icon={UserPlus}
          />
          <StatCard
            title="Aguardando Triagem"
            value={aguardandoTriagem.length}
            description="Na fila de espera"
            icon={Clock}
          />
          <StatCard
            title="Em Atendimento"
            value={patients.filter(p => !['aguardando_triagem', 'liberado', 'contraindicado'].includes(p.status)).length}
            description="Em processo de avaliacao"
            icon={CheckCircle}
          />
        </div>

        {/* Fila de pacientes aguardando triagem */}
        <PatientQueue
          patients={aguardandoTriagem}
          title="Pacientes Aguardando Triagem"
          actionUrl={(id) => `/recepcao/pacientes/${id}`}
          actionLabel="Ver"
          emptyMessage="Nenhum paciente aguardando triagem"
        />
      </div>
    </>
  )
}
