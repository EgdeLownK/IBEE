'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { AccountShellData } from '@/lib/account-shell-data'
import { getNavZone, shouldShowSidebar } from '@/lib/nav-zone'
import { AccountContextProvider, useAccountContext } from './AccountContext'
import { DashboardContentArea } from './DashboardContentArea'
import { GlobalHeader } from './GlobalHeader'
import { FloatingNavPill } from './FloatingNavPill'
import { MessagesComposerProvider } from './messages/MessagesComposerContext'
import { ZoneSidebar } from './ZoneSidebar'

interface Props {
  children: React.ReactNode
  accountData: AccountShellData
  webUrl: string
}

function AppShellInner({ children, webUrl }: Omit<Props, 'accountData'>) {
  const pathname = usePathname() ?? '/'
  const { isPersonalMode, activeProject } = useAccountContext()
  const zone = getNavZone(pathname, isPersonalMode)
  const showSidebar = shouldShowSidebar(zone, true)
  const webProfileUrl = `/${activeProject.slug}`
  const webProfileActive =
    pathname === webProfileUrl ||
    pathname.startsWith(`${webProfileUrl}/`) ||
    pathname.startsWith('/dashboard/site') ||
    pathname.startsWith('/dashboard/equipe') ||
    pathname.startsWith('/dashboard/analyse') ||
    pathname.startsWith('/dashboard/activite/revenus')

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
      <GlobalHeader webUrl={webUrl} webProfileUrl={webProfileUrl} />
      <div className="app-layout__body flex min-h-0 flex-1">
        {showSidebar ? <ZoneSidebar /> : null}
        <div className="app-layout__main relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={
              zone === 'activity'
                ? 'app-layout__content app-layout__content--activity'
                : zone === 'messages'
                  ? 'app-layout__content app-layout__content--messages'
                  : 'app-layout__content'
            }
          >
            <DashboardContentArea>{children}</DashboardContentArea>
          </div>
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

export function AppShell({ children, accountData, webUrl }: Props) {
  return (
    <AccountContextProvider data={accountData}>
      <MessagesComposerProvider>
        <AppShellInner webUrl={webUrl}>{children}</AppShellInner>
      </MessagesComposerProvider>
    </AccountContextProvider>
  )
}
