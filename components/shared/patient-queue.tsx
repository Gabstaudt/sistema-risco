'use client'

import Link from 'next/link'
import { Patient } from '@/lib/types'
import { StatusBadge, PriorityBadge } from '@/components/shared/badges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, Clock, User } from 'lucide-react'

interface PatientQueueProps {
  patients: Patient[]
  title: string
  actionUrl: (id: string) => string
  actionLabel?: string
  emptyMessage?: string
  showPriority?: boolean
  maxItems?: number
}

export function PatientQueue({
  patients,
  title,
  actionUrl,
  actionLabel = 'Atender',
  emptyMessage = 'Nenhum paciente na fila',
  showPriority = true,
  maxItems = 5,
}: PatientQueueProps) {
  const displayPatients = patients.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 text-lg break-words">{title}</CardTitle>
        {patients.length > maxItems && (
          <span className="text-sm text-muted-foreground">
            +{patients.length - maxItems} pacientes
          </span>
        )}
      </CardHeader>
      <CardContent>
        {displayPatients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {displayPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{patient.nomeCompleto}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{patient.prontuario}</span>
                      <span>|</span>
                      <span>{patient.idade} anos</span>
                      <span>|</span>
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(new Date(patient.dataEntrada), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:ml-2 md:justify-end">
                  {showPriority && <PriorityBadge priority={patient.prioridade} />}
                  <StatusBadge status={patient.status} />
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href={actionUrl(patient.id)}>
                      {actionLabel}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
