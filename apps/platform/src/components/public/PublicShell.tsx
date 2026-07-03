'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { AccountShellData } from '@/lib/account-shell-data'
import { getNavZone, isPublicChromelessPath, shouldShowSidebar } from '@/lib/nav-zone'
import { GlobalHeader } from '@/components/dashboard/GlobalHeader'
import { FloatingNavPill } from '@/components/dashboard/FloatingNavPill'
import { ZoneSidebar } from '@/components/dashboard/ZoneSidebar'
import { AccountContextProvider, useAccountContext } from '@/components/dashboard/AccountContext'

interface Props {
  children: React.ReactNode
  accountData: AccountShellData | null
  webUrl: string
}

function PublicShellInner({ children, webUrl }: Omit<Props, 'accountData'>) {
  const pathname = usePathname() ?? '/'
  const { isPersonalMode, activeProject } = useAccountContext()
  const zone = getNavZone(pathname, isPersonalMode)
  const webProfileUrl = `/${activeProject.slug}`
  const webProfileActive =
    pathname === webProfileUrl || pathname.startsWith(`${webProfileUrl}/`)
  const showSidebar = shouldShowSidebar(zone, true)
  const contentClassName =
    pathname === '/'
      ? 'app-layout__content app-layout__content--home-feed'
      : 'app-layout__content'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalHeader webUrl={webUrl} webProfileUrl={webProfileUrl} />
      <div className="app-layout__body flex min-h-0 flex-1">
        {showSidebar ? <ZoneSidebar /> : null}
        <div className="app-layout__main relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className={contentClassName}>{children}</div>
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

export function PublicShell({ children, accountData, webUrl }: Props) {
  const pathname = usePathname() ?? '/'
  const chromeless = isPublicChromelessPath(pathname)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        document.documentElement.setAttribute('data-drawer-open', 'false')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (chromeless) {
    return <div className="flex min-h-screen flex-col bg-background">{children}</div>
  }

  if (accountData) {
    return (
      <AccountContextProvider data={accountData}>
        <PublicShellInner webUrl={webUrl}>{children}</PublicShellInner>
      </AccountContextProvider>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalHeader webUrl={webUrl} isAuthenticated={false} loginUrl="/login" />
      <div className="app-layout__body flex min-h-0 flex-1">
        <div className="app-layout__main relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={
              pathname === '/'
                ? 'app-layout__content app-layout__content--home-feed'
                : 'app-layout__content'
            }
          >
            {children}
          </div>
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
