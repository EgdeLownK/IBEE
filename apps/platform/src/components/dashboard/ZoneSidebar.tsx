'use client'

import { usePathname } from 'next/navigation'
import { getNavZone, shouldShowSidebar } from '@/lib/nav-zone'
import { useAccountContext } from './AccountContext'
import { AccountSidebar } from './AccountSidebar'
import { ProfileWebSidebar } from './ProfileWebSidebar'
import { HomeSidebar } from './home/HomeSidebar'

export function ZoneSidebar() {
  const pathname = usePathname() ?? ''
  const { isPersonalMode } = useAccountContext()
  const zone = getNavZone(pathname, isPersonalMode)

  if (!shouldShowSidebar(zone, true)) return null

  let sidebar = <ProfileWebSidebar />
  if (zone === 'personal-account') sidebar = <AccountSidebar />
  if (zone === 'home') sidebar = <HomeSidebar />

  return <div className="app-layout__sidebar">{sidebar}</div>
}
