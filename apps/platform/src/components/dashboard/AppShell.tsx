'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { AccountShellData } from '@/lib/account-shell-data'
import { getNavZone, shouldShowSidebar } from '@/lib/nav-zone'
import type { HeaderNotification } from './GlobalHeader'
import { AccountContextProvider, useAccountContext } from './AccountContext'
import { GlobalHeader } from './GlobalHeader'
import { FloatingNavPill } from './FloatingNavPill'
import { ZoneSidebar } from './ZoneSidebar'

interface Props {
  children: React.ReactNode
  accountData: AccountShellData
  webUrl: string
  unreadCount: number
  notifications: HeaderNotification[]
}

function AppShellInner({
  children,
  webUrl,
  unreadCount,
  notifications,
}: Omit<Props, 'accountData'>) {
  const pathname = usePathname() ?? '/'
  const { isPersonalMode, activeProject } = useAccountContext()
  const zone = getNavZone(pathname, isPersonalMode)
  const showSidebar = shouldShowSidebar(zone)
  const webProfileUrl = `/${activeProject.slug}`
  const webProfileActive =
    pathname === webProfileUrl || pathname.startsWith(`${webProfileUrl}/`)

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
        webUrl={webUrl}
        webProfileUrl={webProfileUrl}
        unreadCount={unreadCount}
        notifications={notifications}
      />
      <div className="flex min-h-0 flex-1">
        {showSidebar ? <ZoneSidebar /> : null}
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

export function AppShell({
  children,
  accountData,
  webUrl,
  unreadCount,
  notifications,
}: Props) {
  return (
    <AccountContextProvider data={accountData}>
      <AppShellInner webUrl={webUrl} unreadCount={unreadCount} notifications={notifications}>
        {children}
      </AppShellInner>
    </AccountContextProvider>
  )
}
