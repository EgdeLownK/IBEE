'use client'

import { usePathname } from 'next/navigation'
import { getNavZone, shouldShowSidebar } from '@/lib/nav-zone'
import { useAccountContext } from './AccountContext'
import { AccountSidebar } from './AccountSidebar'
import { ProfileSidebar } from './ProfileSidebar'

export function ZoneSidebar() {
  const pathname = usePathname() ?? ''
  const { isPersonalMode } = useAccountContext()
  const zone = getNavZone(pathname, isPersonalMode)

  if (!shouldShowSidebar(zone)) return null
  if (zone === 'personal-account') return <AccountSidebar />
  return <ProfileSidebar />
}
