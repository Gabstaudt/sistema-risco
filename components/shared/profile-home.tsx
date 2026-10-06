'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { canAccessRoute } from '@/lib/permissions'
import {
  ArrowRight, ClipboardList, FileCheck, FileText, FlaskConical,
  History, Calculator, Stethoscope, UserPlus, Users,
  type LucideIcon,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

type HomeAction = {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

type HomeConfig = { title: string; actions: [HomeAction, HomeAction] | [HomeAction, HomeAction, HomeAction] }

const homeByRole: Record<UserRole, HomeConfig> = {
  recepcao: {
    title: 'Recepção',
    actions: [
      { label: 'Cadastrar paciente', description: 'Iniciar um novo atendimento', href: '/recepcao/cadastro', icon: UserPlus },
      { label: 'Buscar paciente', description: 'Consultar um cadastro', href: '/recepcao/pacientes', icon: Users },
    ],
  },
  triagem: {
    title: 'Triagem',
    actions: [
      { label: 'Atender na triagem', description: 'Abrir a fila de atendimento', href: '/triagem/fila', icon: ClipboardList },
      { label: 'Buscar paciente', description: 'Consultar os pacientes', href: '/triagem/pacientes', icon: Users },
      { label: 'Cadastrar paciente', description: 'Iniciar um novo atendimento', href: '/triagem/cadastro', icon: UserPlus },
    ],
  },
  clinico: {
    title: 'Clínico',
    actions: [
      { label: 'Atender pacientes', description: 'Abrir a fila de avaliação', href: '/clinico/fila', icon: Stethoscope },
      { label: 'Ver resultados', description: 'Consultar resultados de exames', href: '/clinico/resultados', icon: FileText },
      { label: 'Buscar paciente', description: 'Consultar os pacientes', href: '/clinico/pacientes', icon: Users },
    ],
  },
  laboratorio: {
    title: 'Laboratório',
    actions: [
      { label: 'Abrir fila de exames', description: 'Coletar e registrar resultados', href: '/laboratorio/fila', icon: FlaskConical },
      { label: 'Liberar resultados', description: 'Ver exames pendentes de liberação', href: '/laboratorio/pendentes', icon: FileCheck },
      { label: 'Ver exames concluídos', description: 'Consultar o histórico de exames', href: '/laboratorio/concluidos', icon: FileText },
    ],
  },
  cardiologista: {
    title: 'Cardiologista',
    actions: [
      { label: 'Avaliar pacientes', description: 'Abrir a fila de cardiologia', href: '/cardiologista/fila', icon: ClipboardList },
      { label: 'Buscar paciente', description: 'Consultar os pacientes', href: '/cardiologista/pacientes', icon: Users },
    ],
  },
  anestesista: {
    title: 'Anestesista',
    actions: [
      { label: 'Avaliar pacientes', description: 'Abrir a fila pré-anestésica', href: '/anestesista/fila', icon: ClipboardList },
      { label: 'Buscar paciente', description: 'Consultar os pacientes', href: '/anestesista/pacientes', icon: Users },
    ],
  },
  cirurgiao: {
    title: 'Cirurgião',
    actions: [
      { label: 'Avaliar pacientes', description: 'Abrir a fila de avaliação cirúrgica', href: '/cirurgiao/fila', icon: ClipboardList },
      { label: 'Ver pacientes liberados', description: 'Consultar liberações para cirurgia', href: '/cirurgiao/liberados', icon: FileCheck },
      { label: 'Calcular risco', description: 'Abrir a calculadora de risco', href: '/cirurgiao/calculadora', icon: Calculator },
    ],
  },
  admin: {
    title: 'Administração',
    actions: [
      { label: 'Gerenciar usuários', description: 'Consultar os acessos da equipe', href: '/admin/usuarios', icon: Users },
      { label: 'Gerenciar exames', description: 'Consultar os tipos de exames', href: '/admin/exames', icon: FlaskConical },
      { label: 'Consultar auditoria', description: 'Acompanhar os registros de ações', href: '/admin/auditoria', icon: History },
    ],
  },
}

export function ProfileHome({ role, children }: { role: UserRole; children?: ReactNode }) {
  const { user } = useAuth()
  const { title, actions: configuredActions } = homeByRole[role]
  const actions = configuredActions.filter((action) => canAccessRoute(action.href, user))

  return (
    <>
      <Header breadcrumbs={[{ label: 'Início' }]} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 space-y-2 sm:mb-10">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-lg text-muted-foreground">O que você precisa fazer?</p>
        </div>
        <nav aria-label={`Ações principais — ${title}`} className={cn('grid grid-cols-1 gap-4 md:gap-6', actions.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
          {actions.map(({ label, description, href, icon: Icon }, index) => (
            <Link
              key={label}
              href={href}
              className={cn(
                'group flex min-h-32 items-center gap-4 rounded-2xl border p-6 transition-colors md:min-h-60 md:flex-col md:items-start md:gap-6',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
                index === 0
                  ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-border bg-card text-foreground hover:border-primary hover:bg-accent',
              )}
            >
              <Icon aria-hidden="true" className="size-8 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <span className="block font-heading text-xl font-bold leading-snug">{label}</span>
                <span className={cn('block text-base leading-relaxed', index === 0 ? 'text-white/85' : 'text-muted-foreground')}>
                  {description}
                </span>
              </div>
              <ArrowRight aria-hidden="true" className="size-6 shrink-0 md:self-end" />
            </Link>
          ))}
        </nav>
        {children && <div className="mt-8">{children}</div>}
      </main>
    </>
  )
}
