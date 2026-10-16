'use client'

import { Fragment } from 'react'
import { useAuth } from '@/lib/auth'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ROLE_LABELS } from '@/lib/types'

interface HeaderProps {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-card">
      <SidebarTrigger className="-ml-1 size-12" />
      <Separator orientation="vertical" className="h-4" />
      
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {user && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${user.role}`}>
                    {ROLE_LABELS[user.role]}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={index}>
                <BreadcrumbItem>
                  {index < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {/* Separators render as li elements and must be siblings of breadcrumb items. */}
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : title ? (
        <h1 className="text-lg font-semibold">{title}</h1>
      ) : null}
    </header>
  )
}
