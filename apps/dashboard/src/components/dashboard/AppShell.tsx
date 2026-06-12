'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { HeaderNotification } from './GlobalHeader'
import { GlobalHeader } from './GlobalHeader'
import { GlobalSidebar } from './GlobalSidebar'
import { FloatingNavPill } from './FloatingNavPill'

interface Props {
  children: React.ReactNode
  displayName: string
  slug: string
  avatarUrl: string | null
  webUrl: string
  unreadCount: number
  notifications: HeaderNotification[]
  webProfileActive?: boolean
  showSidebar?: boolean
}

export function AppShell({
  children,
  displayName,
  slug,
  avatarUrl,
  webUrl,
  unreadCount,
  notifications,
  webProfileActive = false,
  showSidebar = true,
}: Props) {
  const webProfileUrl = `/${slug}`
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        document.documentElement.setAttribute('data-drawer-open', 'false')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalHeader
        projectLabel={displayName}
        webUrl={webUrl}
        webProfileUrl={webProfileUrl}
        avatarUrl={avatarUrl}
        displayName={displayName}
        slug={slug}
        unreadCount={unreadCount}
        notifications={notifications}
      />
      <div className="flex min-h-0 flex-1">
        {showSidebar ? (
          <GlobalSidebar webProfileUrl={webProfileUrl} webProfileActive={webProfileActive} />
        ) : null}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="app-layout__content flex-1 overflow-auto pb-[100px]">{children}</div>
        <FloatingNavPill
          webProfileUrl={webProfileUrl}
          webProfileActive={webProfileActive}
          currentPath={pathname}
          isAuthenticated
        />
        </div>
      </div>
    </div>
  )
}
