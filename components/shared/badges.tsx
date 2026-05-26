import { cn } from '@/lib/utils'
import { PatientStatus, Priority, RiskLevel, STATUS_LABELS, PRIORITY_LABELS, RISK_LABELS } from '@/lib/types'

interface StatusBadgeProps {
  status: PatientStatus
  className?: string
}

const statusStyles: Record<PatientStatus, string> = {
  aguardando_triagem: 'bg-amber-100 text-amber-800 border-amber-200',
  em_triagem: 'bg-blue-100 text-blue-800 border-blue-200',
  aguardando_clinico: 'bg-amber-100 text-amber-800 border-amber-200',
  em_avaliacao_clinica: 'bg-blue-100 text-blue-800 border-blue-200',
  exames_solicitados: 'bg-purple-100 text-purple-800 border-purple-200',
  aguardando_laboratorio: 'bg-amber-100 text-amber-800 border-amber-200',
  exames_em_analise: 'bg-blue-100 text-blue-800 border-blue-200',
  exames_concluidos: 'bg-teal-100 text-teal-800 border-teal-200',
  aguardando_cirurgiao: 'bg-amber-100 text-amber-800 border-amber-200',
  em_avaliacao_cirurgica: 'bg-blue-100 text-blue-800 border-blue-200',
  liberado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  alto_risco: 'bg-red-100 text-red-800 border-red-200',
  contraindicado: 'bg-violet-100 text-violet-800 border-violet-200',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

const priorityStyles: Record<Priority, string> = {
  baixa: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  alta: 'bg-amber-100 text-amber-800 border-amber-200',
  urgente: 'bg-red-100 text-red-800 border-red-200',
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        priorityStyles[priority],
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

interface RiskBadgeProps {
  risk: RiskLevel
  className?: string
}

const riskStyles: Record<RiskLevel, string> = {
  baixo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  moderado: 'bg-amber-100 text-amber-800 border-amber-200',
  alto: 'bg-red-100 text-red-800 border-red-200',
  contraindicado: 'bg-violet-100 text-violet-800 border-violet-200',
  pendente: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        riskStyles[risk],
        className
      )}
    >
      {RISK_LABELS[risk]}
    </span>
  )
}
