'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { users } from '@/lib/data/users'
import { ROLE_LABELS, type AuditLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  cadastro_paciente: 'Cadastro de paciente', paciente_cadastrado: 'Cadastro de paciente', edicao_dados_basicos: 'Edição de cadastro',
  encaminhamento_triagem: 'Encaminhamento à triagem', registro_sinais_vitais: 'Registro de sinais vitais', alteracao_sinais_vitais: 'Alteração de sinais vitais', registro_queixa: 'Registro de queixa',
  encaminhamento_clinico: 'Encaminhamento ao clínico', avaliacao_clinica: 'Avaliação clínica', avaliacao_clinica_concluida: 'Avaliação clínica concluída', avaliacao_clinica_atualizada: 'Avaliação clínica atualizada',
  cadastro_exame: 'Cadastro de tipo de exame', solicitacao_exame: 'Solicitação de exames', coleta_exame: 'Coleta de exame', analise_exame: 'Realização de exame', resultado_exame: 'Resultado de exame', exames_registrados: 'Exames registrados', exames_atualizados: 'Exames atualizados',
  encaminhamento_laboratorio: 'Encaminhamento ao laboratório', encaminhamento_cardiologia: 'Encaminhamento à cardiologia', encaminhamento_anestesia: 'Encaminhamento à anestesia', encaminhamento_cirurgiao: 'Encaminhamento ao cirurgião',
  calculo_score: 'Cálculo de score', classificacao_risco: 'Classificação de risco', liberacao_cirurgia: 'Liberação para cirurgia', contraindicacao_cirurgia: 'Contraindicação de cirurgia',
  avaliacao_cardiologica_concluida: 'Avaliação cardiológica concluída', avaliacao_cardiologica_atualizada: 'Avaliação cardiológica atualizada', avaliacao_anestesica_concluida: 'Avaliação anestésica concluída', avaliacao_anestesica_atualizada: 'Avaliação anestésica atualizada', avaliacao_cirurgica_concluida: 'Avaliação cirúrgica concluída', avaliacao_cirurgica_atualizada: 'Avaliação cirúrgica atualizada',
  geracao_relatorio: 'Geração de relatório', triagem_concluida: 'Triagem concluída', triagem_atualizada: 'Triagem atualizada', login: 'Entrada no sistema', logout: 'Saída do sistema',
  senha_ausente: 'Ausência na chamada', senha_retornada: 'Retorno à fila', senha_chamada: 'Chamada de senha', senha_encaminhada: 'Encaminhamento de senha',
  medicacao_solicitada: 'Medicação solicitada', medicacao_administrada: 'Medicação administrada', cirurgia_registrada: 'Cirurgia registrada', cirurgia_atualizada: 'Cirurgia atualizada', solicitacao_avaliacao_especializada: 'Avaliação especializada solicitada',
}
const PAGE_SIZE = 20
const actionLabel = (action: string) => ACTION_LABELS[action] || action.replaceAll('_', ' ')
const logText = (log: AuditLog) => log.details || log.description || ''
// Quoting alone does not prevent spreadsheet formula execution.
const csvCell = (value: string) => `"${(/^[\s]*[=+\-@]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`

export default function AuditoriaPage() {
  const { hasPermission, isLoading } = useAuth()
  const { auditLogs, patients, isDataReady } = useData()
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [professional, setProfessional] = useState('all')
  const [period, setPeriod] = useState('all')
  const [page, setPage] = useState(1)
  const patientName = (id?: string) => patients.find(item => item.id === id)?.nomeCompleto || (id ? 'Paciente indisponível' : '—')
  const userName = (log: AuditLog) => log.userName || users.find(item => item.id === log.userId)?.name || 'Usuário indisponível'
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    const now = new Date()
    const cutoff = period === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() : period === 'week' ? now.getTime() - 7 * 86400000 : period === 'month' ? now.getTime() - 30 * 86400000 : -Infinity
    return auditLogs.filter(log => {
      const patient = patients.find(item => item.id === log.patientId)
      const timestamp = Date.parse(log.timestamp)
      return (action === 'all' || action === log.action) &&
        (professional === 'all' || professional === log.userId) &&
        (period === 'all' || (timestamp >= cutoff && timestamp <= now.getTime())) &&
        `${log.userName || users.find(item => item.id === log.userId)?.name || ''} ${patient?.nomeCompleto || ''} ${patient?.prontuario || ''} ${logText(log)} ${actionLabel(log.action)}`.toLocaleLowerCase().includes(term)
    }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
  }, [auditLogs, patients, search, action, professional, period])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const activePage = Math.min(page, pages)
  const visible = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)
  const actions = [...new Set(auditLogs.map(log => log.action))].sort((a, b) => actionLabel(a).localeCompare(actionLabel(b), 'pt-BR'))
  const professionals = [...new Map(auditLogs.filter(log => log.userId).map(log => [log.userId, userName(log)])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  function clear() { setSearch(''); setAction('all'); setProfessional('all'); setPeriod('all'); setPage(1) }
  function exportCsv() {
    const rows = [['Data e hora', 'Ação', 'Profissional', 'Perfil', 'Paciente', 'Descrição'], ...filtered.map(log => [new Date(log.timestamp).toLocaleString('pt-BR'), actionLabel(log.action), userName(log), ROLE_LABELS[log.userRole] || log.userRole, patientName(log.patientId), logText(log)])]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (isLoading || !isDataReady) return <p className="p-6" role="status">Carregando...</p>
  if (!hasPermission('view_audit')) return null
  return <>
    <Header breadcrumbs={[{ label: 'Auditoria' }]} />
    <main className="min-h-[calc(100svh-4rem)] min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Auditoria do sistema</h1>
        <Button variant="outline" className="h-11" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
      </div>
      <Card><CardHeader><CardTitle>Filtros</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input className="h-12" aria-label="Buscar registros" placeholder="Paciente, profissional ou descrição" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
          <Select value={action} onValueChange={value => { setAction(value); setPage(1) }}><SelectTrigger className="h-12 w-full" aria-label="Filtrar ação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem>{actions.map(item => <SelectItem key={item} value={item}>{actionLabel(item)}</SelectItem>)}</SelectContent></Select>
          <Select value={professional} onValueChange={value => { setProfessional(value); setPage(1) }}><SelectTrigger className="h-12 w-full" aria-label="Filtrar profissional"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os profissionais</SelectItem>{professionals.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
          <Select value={period} onValueChange={value => { setPeriod(value); setPage(1) }}><SelectTrigger className="h-12 w-full" aria-label="Filtrar período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo o período</SelectItem><SelectItem value="today">Hoje</SelectItem><SelectItem value="week">Últimos 7 dias</SelectItem><SelectItem value="month">Últimos 30 dias</SelectItem></SelectContent></Select>
        </div>
        {(search || action !== 'all' || professional !== 'all' || period !== 'all') && <Button variant="ghost" onClick={clear}>Limpar filtros</Button>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Registros · {filtered.length}</CardTitle></CardHeader><CardContent className="min-w-0">
        <Table><TableHeader><TableRow><TableHead>Data e hora</TableHead><TableHead>Ação</TableHead><TableHead>Profissional</TableHead><TableHead>Paciente</TableHead><TableHead>Descrição</TableHead></TableRow></TableHeader>
          <TableBody>{visible.map(log => <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap align-top">{new Date(log.timestamp).toLocaleString('pt-BR')}</TableCell>
            <TableCell className="min-w-40 whitespace-normal align-top font-medium">{actionLabel(log.action)}</TableCell>
            <TableCell className="min-w-40 whitespace-normal align-top">{userName(log)}<span className="mt-1 block text-xs text-muted-foreground">{ROLE_LABELS[log.userRole] || log.userRole}</span></TableCell>
            <TableCell className="min-w-40 whitespace-normal align-top">{log.patientId && patients.some(item => item.id === log.patientId) ? <Link className="text-primary underline underline-offset-4" href={`/paciente/${log.patientId}`}>{patientName(log.patientId)}</Link> : patientName(log.patientId)}</TableCell>
            <TableCell className="min-w-64 max-w-xl whitespace-pre-wrap break-words align-top">{logText(log) || '—'}</TableCell>
          </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>}</TableBody>
        </Table>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">Página {activePage} de {pages}</p>
          <div className="flex gap-2"><Button variant="outline" className="h-11" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}>Anterior</Button><Button variant="outline" className="h-11" disabled={activePage >= pages} onClick={() => setPage(activePage + 1)}>Próxima</Button></div>
        </div>
      </CardContent></Card>
    </main>
  </>
}
