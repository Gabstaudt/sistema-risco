'use client'

import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Shield, FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { users } from '@/lib/data/users'
import { ROLE_LABELS } from '@/lib/types'

export default function AdminDashboard() {
  const { patients, examRequests, auditLogs, getStats } = useData()
  
  const stats = getStats()
  
  // Ultimas acoes de auditoria
  const ultimasAcoes = [...auditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <>
      <Header 
        breadcrumbs={[{ label: 'Dashboard' }]} 
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administracao</h1>
          <p className="text-muted-foreground">Visao geral do sistema e gestao</p>
        </div>

        {/* Cards de estatisticas gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Pacientes"
            value={patients.length}
            description="Cadastrados no sistema"
            icon={Users}
          />
          <StatCard
            title="Usuarios Ativos"
            value={users.filter(u => u.active).length}
            description="Profissionais cadastrados"
            icon={Shield}
          />
          <StatCard
            title="Exames Realizados"
            value={examRequests.filter(e => e.status === 'concluido').length}
            description="Total de resultados"
            icon={FileText}
          />
          <StatCard
            title="Logs de Auditoria"
            value={auditLogs.length}
            description="Acoes registradas"
            icon={Activity}
          />
        </div>

        {/* Cards de status de pacientes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-100">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.liberados}</p>
                <p className="text-sm text-muted-foreground">Liberados para Cirurgia</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.altoRisco}</p>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contraindicados}</p>
                <p className="text-sm text-muted-foreground">Contraindicados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usuarios do sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ultimas acoes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ultimas Acoes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ultimasAcoes.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.userName} ({ROLE_LABELS[log.userRole]}) - {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
