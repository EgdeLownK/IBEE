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
  // zone 'messages' -> même variante que 'home' : la maquette n'a pas de rail
  // dédié aux messages, l'écran messages reste sur appLevel=true (rail
  // Accueil/Messages/Projet), voir Prototype desktop.dc.html L45/L774.
  if (zone === 'home' || zone === 'messages') sidebar = <HomeSidebar />

  return <div className="app-layout__sidebar">{sidebar}</div>
}
