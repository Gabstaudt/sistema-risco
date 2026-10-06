import { cn } from '@/lib/utils'
import { ASAClassification, PatientStatus, Priority, RiskLevel, STATUS_LABELS, PRIORITY_LABELS, RISK_LABELS } from '@/lib/types'

interface StatusBadgeProps {
  status: PatientStatus
  className?: string
}

const statusStyles: Record<PatientStatus, string> = {
  aguardando_triagem: 'clinical-warning',
  em_triagem: 'clinical-info',
  aguardando_avaliacao: 'clinical-warning',
  aguardando_clinico: 'clinical-warning',
  em_avaliacao_clinica: 'clinical-info',
  aguardando_exames: 'clinical-warning',
  aguardando_resultado: 'clinical-warning',
  exames_solicitados: 'clinical-info',
  aguardando_laboratorio: 'clinical-warning',
  exames_em_analise: 'clinical-info',
  exames_concluidos: 'clinical-success',
  aguardando_cardiologista: 'clinical-warning',
  em_avaliacao_cardiologica: 'clinical-info',
  aguardando_anestesista: 'clinical-info',
  em_avaliacao_anestesica: 'clinical-info',
  aguardando_cirurgiao: 'clinical-warning',
  em_avaliacao_cirurgica: 'clinical-info',
  concluido: 'clinical-success',
  liberado: 'clinical-success',
  alto_risco: 'clinical-danger',
  contraindicado: 'clinical-danger',
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

export function PatientStatusBadge({ status, className }: StatusBadgeProps) {
  return <StatusBadge status={status} className={className} />
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

const priorityStyles: Record<Priority, string> = {
  baixa: 'clinical-neutral',
  normal: 'clinical-info',
  alta: 'clinical-warning',
  urgente: 'clinical-danger',
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
  baixo: 'clinical-success',
  moderado: 'clinical-warning',
  alto: 'clinical-danger',
  critico: 'clinical-danger',
  contraindicado: 'clinical-danger',
  pendente: 'clinical-neutral',
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

export function RiskLevelBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return <RiskBadge risk={level} className={className} />
}

const asaStyles: Record<ASAClassification, string> = {
  I: 'clinical-success',
  II: 'clinical-warning',
  III: 'clinical-warning',
  IV: 'clinical-warning',
  V: 'clinical-danger',
  VI: 'clinical-danger',
}

export function ASABadge({ classification, className }: { classification: ASAClassification; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        asaStyles[classification],
        className
      )}
    >
      {`ASA ${classification}`}
    </span>
  )
}

const rcriStyles: Record<number, string> = {
  0: 'clinical-success',
  1: 'clinical-warning',
  2: 'clinical-warning',
  3: 'clinical-warning',
  4: 'clinical-danger',
  5: 'clinical-danger',
  6: 'clinical-danger',
}

export function RCRIBadge({ score, className }: { score: number; className?: string }) {
  const styleKey = Math.min(Math.max(score, 0), 6)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        rcriStyles[styleKey],
        className
      )}
    >
      {`RCRI ${score}`}
    </span>
  )
}
