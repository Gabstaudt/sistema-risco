'use client'

import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Clock, User, Activity, FileText, FlaskConical, Stethoscope, ClipboardCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { AuditAction, AuditLog, ROLE_LABELS } from '@/lib/types'

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: React.ElementType; color: string }> = {
  cadastro_paciente: { label: 'Cadastro de Paciente', icon: User, color: 'bg-blue-100 text-blue-800' },
  edicao_dados_basicos: { label: 'Edicao de Dados', icon: FileText, color: 'bg-gray-100 text-gray-800' },
  encaminhamento_triagem: { label: 'Encaminhamento Triagem', icon: Activity, color: 'bg-cyan-100 text-cyan-800' },
  registro_sinais_vitais: { label: 'Registro de Sinais Vitais', icon: Activity, color: 'bg-green-100 text-green-800' },
  alteracao_sinais_vitais: { label: 'Alteracao de Sinais Vitais', icon: Activity, color: 'bg-yellow-100 text-yellow-800' },
  registro_queixa: { label: 'Registro de Queixa', icon: ClipboardCheck, color: 'bg-indigo-100 text-indigo-800' },
  encaminhamento_clinico: { label: 'Encaminhamento Clinico', icon: Stethoscope, color: 'bg-purple-100 text-purple-800' },
  avaliacao_clinica: { label: 'Avaliacao Clinica', icon: Stethoscope, color: 'bg-purple-100 text-purple-800' },
  cadastro_exame: { label: 'Cadastro de Exame', icon: FlaskConical, color: 'bg-blue-100 text-blue-800' },
  solicitacao_exame: { label: 'Solicitacao de Exame', icon: FlaskConical, color: 'bg-blue-100 text-blue-800' },
  coleta_exame: { label: 'Coleta de Exame', icon: FlaskConical, color: 'bg-amber-100 text-amber-800' },
  analise_exame: { label: 'Analise de Exame', icon: FlaskConical, color: 'bg-orange-100 text-orange-800' },
  resultado_exame: { label: 'Resultado de Exame', icon: FlaskConical, color: 'bg-green-100 text-green-800' },
  encaminhamento_laboratorio: { label: 'Encaminhamento Laboratorio', icon: FlaskConical, color: 'bg-teal-100 text-teal-800' },
  encaminhamento_cirurgiao: { label: 'Encaminhamento Cirurgiao', icon: Stethoscope, color: 'bg-red-100 text-red-800' },
  calculo_score: { label: 'Calculo de Score', icon: Activity, color: 'bg-violet-100 text-violet-800' },
  classificacao_risco: { label: 'Classificacao de Risco', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  liberacao_cirurgia: { label: 'Liberacao para Cirurgia', icon: ClipboardCheck, color: 'bg-emerald-100 text-emerald-800' },
  contraindicacao_cirurgia: { label: 'Contraindicacao', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  geracao_relatorio: { label: 'Geracao de Relatorio', icon: FileText, color: 'bg-gray-100 text-gray-800' },
  login: { label: 'Login', icon: User, color: 'bg-blue-100 text-blue-800' },
  logout: { label: 'Logout', icon: User, color: 'bg-gray-100 text-gray-800' },
}

export default function HistoricoPage() {
  const params = useParams()
  const router = useRouter()
  const { getPatient, getAuditLogsByPatient } = useData()
  
  const patient = getPatient(params.id as string)
  const auditLogs = getAuditLogsByPatient(params.id as string)
  
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
        <Button asChild>
          <Link href="/">Voltar</Link>
        </Button>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins} min atras`
    if (diffHours < 24) return `${diffHours}h atras`
    if (diffDays < 7) return `${diffDays} dia(s) atras`
    return formatDate(dateString)
  }

  // Agrupar logs por data
  const groupedLogs = auditLogs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toLocaleDateString('pt-BR')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(log)
    return acc
  }, {} as Record<string, AuditLog[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historico de Auditoria</h1>
          <p className="text-muted-foreground">Timeline completa de acoes do paciente</p>
        </div>
      </div>

      {/* Info do paciente */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{patient.nomeCompleto}</h2>
              <p className="text-sm text-muted-foreground">
                Prontuario: {patient.prontuario} | CPF: {patient.cpf}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de auditoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Atividades
          </CardTitle>
          <CardDescription>
            {auditLogs.length} registro(s) de auditoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro de auditoria encontrado
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedLogs).map(([date, logs]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs">
                      {date}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="relative">
                    {/* Linha vertical da timeline */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    
                    <div className="space-y-4">
                      {logs.map((log, index) => {
                        const config = ACTION_CONFIG[log.action] || {
                          label: log.action,
                          icon: Activity,
                          color: 'bg-gray-100 text-gray-800'
                        }
                        const Icon = config.icon
                        
                        return (
                          <div key={log.id} className="relative pl-10">
                            {/* Ponto na timeline */}
                            <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <Badge variant="secondary" className={config.color}>
                                    {config.label}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(log.timestamp)}
                                </span>
                              </div>
                              
                              <p className="text-sm mb-2">{log.description}</p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {log.userName}
                                </span>
                                <span>
                                  {ROLE_LABELS[log.userRole]}
                                </span>
                                <span>
                                  {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                                </span>
                              </div>
                              
                              {(log.previousValue || log.newValue) && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <div className="flex gap-4 text-xs">
                                    {log.previousValue && (
                                      <div>
                                        <span className="text-muted-foreground">Anterior: </span>
                                        <span className="text-red-600">{log.previousValue}</span>
                                      </div>
                                    )}
                                    {log.newValue && (
                                      <div>
                                        <span className="text-muted-foreground">Novo: </span>
                                        <span className="text-green-600">{log.newValue}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
