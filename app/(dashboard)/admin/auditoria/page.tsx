'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText, 
  Activity,
  Shield,
  FlaskConical,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react'
import { users } from '@/lib/data/users'

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'paciente_cadastrado': { 
    label: 'Paciente Cadastrado', 
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  'triagem_concluida': { 
    label: 'Triagem Concluida', 
    icon: <Activity className="h-4 w-4" />,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  'triagem_atualizada': { 
    label: 'Triagem Atualizada', 
    icon: <Activity className="h-4 w-4" />,
    color: 'text-teal-600 bg-teal-50 border-teal-200'
  },
  'avaliacao_clinica_concluida': { 
    label: 'Avaliacao Clinica Concluida', 
    icon: <FileText className="h-4 w-4" />,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  'avaliacao_clinica_atualizada': { 
    label: 'Avaliacao Clinica Atualizada', 
    icon: <FileText className="h-4 w-4" />,
    color: 'text-violet-600 bg-violet-50 border-violet-200'
  },
  'exames_registrados': { 
    label: 'Exames Registrados', 
    icon: <FlaskConical className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  'exames_atualizados': { 
    label: 'Exames Atualizados', 
    icon: <FlaskConical className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  'avaliacao_cirurgica_concluida': { 
    label: 'Avaliacao Cirurgica Concluida', 
    icon: <Shield className="h-4 w-4" />,
    color: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  'avaliacao_cirurgica_atualizada': { 
    label: 'Avaliacao Cirurgica Atualizada', 
    icon: <Shield className="h-4 w-4" />,
    color: 'text-pink-600 bg-pink-50 border-pink-200'
  },
}

const ITEMS_PER_PAGE = 15

export default function AuditoriaPage() {
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const { auditLogs, patients } = useData()
  
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  
  useEffect(() => {
    if (!user || !hasPermission('admin.auditoria')) {
      router.push('/login')
    }
  }, [user, hasPermission, router])
  
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        // Search filter
        if (search) {
          const patient = patients.find(p => p.id === log.patientId)
          const userName = users.find(u => u.id === log.userId)?.name || ''
          const searchLower = search.toLowerCase()
          
          if (
            !patient?.name.toLowerCase().includes(searchLower) &&
            !userName.toLowerCase().includes(searchLower) &&
            !log.details?.toLowerCase().includes(searchLower)
          ) {
            return false
          }
        }
        
        // Action filter
        if (actionFilter !== 'all' && log.action !== actionFilter) {
          return false
        }
        
        // User filter
        if (userFilter !== 'all' && log.userId !== userFilter) {
          return false
        }
        
        // Date filter
        if (dateFilter !== 'all') {
          const logDate = new Date(log.timestamp)
          const now = new Date()
          
          switch (dateFilter) {
            case 'today':
              if (logDate.toDateString() !== now.toDateString()) return false
              break
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              if (logDate < weekAgo) return false
              break
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              if (logDate < monthAgo) return false
              break
          }
        }
        
        return true
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [auditLogs, patients, search, actionFilter, userFilter, dateFilter])
  
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const getPatientName = (patientId?: string) => {
    if (!patientId) return 'N/A'
    const patient = patients.find(p => p.id === patientId)
    return patient?.name || 'Paciente removido'
  }
  
  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser?.name || 'Usuario desconhecido'
  }
  
  const getUserRole = (userId: string) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser?.role || ''
  }
  
  const uniqueActions = [...new Set(auditLogs.map(l => l.action))]
  const uniqueUsers = [...new Set(auditLogs.map(l => l.userId))]
  
  const stats = useMemo(() => {
    const today = new Date()
    const todayLogs = auditLogs.filter(
      l => new Date(l.timestamp).toDateString() === today.toDateString()
    )
    
    return {
      total: auditLogs.length,
      today: todayLogs.length,
      uniqueUsers: new Set(todayLogs.map(l => l.userId)).size,
    }
  }, [auditLogs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Auditoria do Sistema</h1>
        <p className="text-muted-foreground">
          Historico completo de todas as acoes realizadas no sistema
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-xs text-muted-foreground">Acoes Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Usuarios Ativos Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, usuario..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setCurrentPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Acao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Acoes</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {ACTION_LABELS[action]?.label || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={userFilter} onValueChange={v => { setUserFilter(v); setCurrentPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuarios</SelectItem>
                {uniqueUsers.map(userId => (
                  <SelectItem key={userId} value={userId}>
                    {getUserName(userId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={v => { setDateFilter(v); setCurrentPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Periodo</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Ultima Semana</SelectItem>
                <SelectItem value="month">Ultimo Mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Log List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Registros de Auditoria</CardTitle>
            <CardDescription>
              {filteredLogs.length} registro(s) encontrado(s)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paginatedLogs.map(log => {
              const actionInfo = ACTION_LABELS[log.action] || {
                label: log.action,
                icon: <Clock className="h-4 w-4" />,
                color: 'text-gray-600 bg-gray-50 border-gray-200'
              }
              
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${actionInfo.color}`}>
                    {actionInfo.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{actionInfo.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getUserName(log.userId)}
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {getUserRole(log.userId)}
                        </span>
                      </span>
                      
                      {log.patientId && (
                        <button
                          onClick={() => router.push(`/paciente/${log.patientId}`)}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          {getPatientName(log.patientId)}
                        </button>
                      )}
                    </div>
                    
                    {log.details && (
                      <p className="text-sm mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              )
            })}
            
            {paginatedLogs.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
