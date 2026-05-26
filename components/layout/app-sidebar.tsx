'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { ROLE_LABELS, type UserRole } from '@/lib/types'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Activity,
  Users,
  UserPlus,
  ClipboardList,
  Stethoscope,
  FlaskConical,
  Syringe,
  LayoutDashboard,
  Settings,
  LogOut,
  FileText,
  History,
  ChevronUp,
  TestTube,
  Heart,
  AlertCircle,
} from 'lucide-react'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  badge?: number
  permission?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const getNavigation = (role: UserRole, stats: { aguardandoTriagem: number; emAvaliacaoClinica: number; examesPendentes: number; aguardandoCirurgiao: number }): NavGroup[] => {
  const roleNavigation: Record<UserRole, NavGroup[]> = {
    recepcao: [
      {
        title: 'Menu Principal',
        items: [
          { title: 'Dashboard', url: '/recepcao', icon: LayoutDashboard },
          { title: 'Pacientes', url: '/recepcao/pacientes', icon: Users },
          { title: 'Novo Paciente', url: '/recepcao/cadastro', icon: UserPlus },
        ],
      },
      {
        title: 'Fila',
        items: [
          { title: 'Aguardando Triagem', url: '/recepcao/fila', icon: ClipboardList, badge: stats.aguardandoTriagem },
        ],
      },
    ],
    triagem: [
      {
        title: 'Menu Principal',
        items: [
          { title: 'Dashboard', url: '/triagem', icon: LayoutDashboard },
          { title: 'Pacientes', url: '/triagem/pacientes', icon: Users },
          { title: 'Novo Paciente', url: '/triagem/cadastro', icon: UserPlus },
        ],
      },
      {
        title: 'Atendimento',
        items: [
          { title: 'Aguardando Triagem', url: '/triagem/fila', icon: ClipboardList, badge: stats.aguardandoTriagem },
        ],
      },
    ],
    clinico: [
      {
        title: 'Menu Principal',
        items: [
          { title: 'Dashboard', url: '/clinico', icon: LayoutDashboard },
          { title: 'Pacientes', url: '/clinico/pacientes', icon: Users },
        ],
      },
      {
        title: 'Atendimento',
        items: [
          { title: 'Aguardando Avaliacao', url: '/clinico/fila', icon: Stethoscope, badge: stats.emAvaliacaoClinica },
          { title: 'Resultados de Exames', url: '/clinico/resultados', icon: FileText },
        ],
      },
      {
        title: 'Configuracoes',
        items: [
          { title: 'Tipos de Exames', url: '/clinico/exames', icon: TestTube },
        ],
      },
    ],
    laboratorio: [
      {
        title: 'Menu Principal',
        items: [
          { title: 'Dashboard', url: '/laboratorio', icon: LayoutDashboard },
        ],
      },
      {
        title: 'Exames',
        items: [
          { title: 'Exames Pendentes', url: '/laboratorio/pendentes', icon: FlaskConical, badge: stats.examesPendentes },
          { title: 'Exames Concluidos', url: '/laboratorio/concluidos', icon: FileText },
        ],
      },
    ],
    cirurgiao: [
      {
        title: 'Menu Principal',
        items: [
          { title: 'Dashboard', url: '/cirurgiao', icon: LayoutDashboard },
          { title: 'Pacientes', url: '/cirurgiao/pacientes', icon: Users },
        ],
      },
      {
        title: 'Avaliacoes',
        items: [
          { title: 'Aguardando Avaliacao', url: '/cirurgiao/fila', icon: Syringe, badge: stats.aguardandoCirurgiao },
          { title: 'Calculadora de Risco', url: '/cirurgiao/calculadora', icon: Heart },
        ],
      },
      {
        title: 'Relatorios',
        items: [
          { title: 'Pacientes Liberados', url: '/cirurgiao/liberados', icon: FileText },
          { title: 'Alto Risco', url: '/cirurgiao/alto-risco', icon: AlertCircle },
        ],
      },
    ],
    admin: [
      {
        title: 'Menu Principal',
        items: [
          { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
          { title: 'Usuarios', url: '/admin/usuarios', icon: Users },
        ],
      },
      {
        title: 'Sistema',
        items: [
          { title: 'Tipos de Exames', url: '/admin/exames', icon: TestTube },
          { title: 'Auditoria', url: '/admin/auditoria', icon: History },
          { title: 'Configuracoes', url: '/admin/configuracoes', icon: Settings },
        ],
      },
    ],
  }

  return roleNavigation[role] || []
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { getStats } = useData()
  
  if (!user) return null

  const stats = getStats()
  const navigation = getNavigation(user.role, stats)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={`/${user.role}`} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">MedRisk Pro</span>
            <span className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge !== undefined && item.badge > 0 && (
                      <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none flex-1 text-left">
                    <span className="font-medium text-sm truncate">{user.name}</span>
                    <span className="text-xs text-sidebar-foreground/60 truncate">{user.email}</span>
                  </div>
                  <ChevronUp className="ml-auto w-4 h-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
