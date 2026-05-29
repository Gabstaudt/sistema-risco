'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  User, 
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Building
} from 'lucide-react'
import { users } from '@/lib/data/users'
import type { UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  recepcao: { label: 'Recepcao', color: 'bg-blue-100 text-blue-700' },
  triagem: { label: 'Triagem', color: 'bg-teal-100 text-teal-700' },
  clinico: { label: 'Clinico', color: 'bg-purple-100 text-purple-700' },
  laboratorio: { label: 'Laboratorio', color: 'bg-amber-100 text-amber-700' },
  cirurgiao: { label: 'Cirurgiao', color: 'bg-rose-100 text-rose-700' },
  admin: { label: 'Administrador', color: 'bg-slate-100 text-slate-700' },
}

export default function UsuariosPage() {
  const router = useRouter()
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth()
  const [search, setSearch] = useState('')
  
  useEffect(() => {
    if (isAuthLoading) return

    if (!user || !hasPermission('admin.usuarios')) {
      router.replace('/login')
    }
  }, [user, hasPermission, router, isAuthLoading])

  if (isAuthLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }
  
  const filteredUsers = users.filter(u => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower) ||
      u.role.toLowerCase().includes(searchLower)
    )
  })
  
  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    byRole: users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gestao de Usuarios</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os usuarios do sistema
          </p>
        </div>
        <Button>
          <User className="h-4 w-4 mr-2" />
          Novo Usuario
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Usuarios Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byRole.clinico || 0}</p>
                <p className="text-xs text-muted-foreground">Medicos Clinicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Shield className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byRole.cirurgiao || 0}</p>
                <p className="text-xs text-muted-foreground">Cirurgioes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou funcao..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios Cadastrados</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuario(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map(u => {
              const roleInfo = ROLE_LABELS[u.role]
              
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{u.name}</span>
                      {u.active ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </span>
                      {u.department && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {u.department}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Badge className={roleInfo.color} variant="secondary">
                    {roleInfo.label}
                  </Badge>
                </div>
              )
            })}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum usuario encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Credentials Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Credenciais de Demonstracao</CardTitle>
          <CardDescription>
            Utilize estas credenciais para testar os diferentes perfis do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.slice(0, 6).map(u => (
              <div key={u.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={ROLE_LABELS[u.role].color} variant="secondary">
                    {ROLE_LABELS[u.role].label}
                  </Badge>
                </div>
                <p className="text-sm font-mono">{u.email}</p>
                <p className="text-xs text-muted-foreground font-mono">senha: {u.password}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
