'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/dashboard/AppShell'
import type { HeaderNotification } from '@/components/dashboard/GlobalHeader'
import { GlobalHeader } from '@/components/dashboard/GlobalHeader'
import { GlobalSidebar } from '@/components/dashboard/GlobalSidebar'
import { FloatingNavPill } from '@/components/dashboard/FloatingNavPill'

type EntityShell = {
  displayName: string
  slug: string
  avatarUrl: string | null
}

interface Props {
  children: React.ReactNode
  entity: EntityShell | null
  unreadCount: number
  notifications: HeaderNotification[]
  webUrl: string
}

function shouldShowSidebar(pathname: string, slug: string | null) {
  if (!slug) return false
  return pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)
}

export function PublicShell({ children, entity, unreadCount, notifications, webUrl }: Props) {
  const pathname = usePathname() ?? '/'
  const showSidebar = entity ? shouldShowSidebar(pathname, entity.slug) : false
  const webProfileUrl = entity ? `/${entity.slug}` : '/login'
  const webProfileActive = entity ? pathname === `/${entity.slug}` : false

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        document.documentElement.setAttribute('data-drawer-open', 'false')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (entity) {
    return (
      <AppShell
        displayName={entity.displayName}
        slug={entity.slug}
        avatarUrl={entity.avatarUrl}
        webUrl={webUrl}
        unreadCount={unreadCount}
        notifications={notifications}
        webProfileActive={webProfileActive}
        showSidebar={showSidebar}
      >
        {children}
      </AppShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalHeader webUrl={webUrl} isAuthenticated={false} loginUrl="/login" />
      <div className="flex min-h-0 flex-1">
        {showSidebar ? (
          <GlobalSidebar webProfileUrl={webProfileUrl} webProfileActive={false} />
        ) : null}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="app-layout__content flex-1 overflow-auto pb-[100px]">{children}</div>
          <FloatingNavPill
            webProfileUrl="/login"
            webProfileActive={false}
            currentPath={pathname}
            isAuthenticated={false}
            loginUrl="/login"
          />
        </div>
      </div>
    </div>
  )
}
