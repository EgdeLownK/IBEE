'use client'

import { usePathname } from 'next/navigation'
import { getNavZone, shouldShowSidebar } from '@/lib/nav-zone'
import { useAccountContext } from './AccountContext'
import { AccountSidebar } from './AccountSidebar'
import { ProfileSidebar } from './ProfileSidebar'
import { HomeActivitySidebar } from './home/HomeActivitySidebar'

export function ZoneSidebar() {
  const pathname = usePathname() ?? ''
  const { isPersonalMode } = useAccountContext()
  const zone = getNavZone(pathname, isPersonalMode)

  if (!shouldShowSidebar(zone, true)) return null

  let sidebar = <ProfileSidebar />
  if (zone === 'personal-account') sidebar = <AccountSidebar />
  if (zone === 'home') sidebar = <HomeActivitySidebar />

  return <div className="app-layout__sidebar">{sidebar}</div>
}
