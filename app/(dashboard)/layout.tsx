'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { canAccessRoute } from '@/lib/permissions'
import { useAuth } from '@/lib/auth'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const canAccess = canAccessRoute(pathname, user)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    } else if (!isLoading && user && !canAccess && canAccessRoute(`/${user.role}`, user)) {
      router.replace(`/${user.role}`)
    }
  }, [user, isLoading, router, canAccess])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {canAccess ? children : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-lg font-semibold">Acesso não autorizado</p>
            <p className="text-muted-foreground">Seu perfil não tem permissão para visualizar esta página.</p>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
