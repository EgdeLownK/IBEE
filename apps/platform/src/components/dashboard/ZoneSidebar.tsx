'use client'

import { useEffect, useState } from 'react'
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

  // Bascule locale du CONTENU du rail (pas de navigation) : le chevron de
  // ProfileWebSidebar l'active pour afficher la variante "home" du rail sans
  // quitter la page profile-web en cours (Prototype desktop.dc.html L775,
  // railToApp: setState({ railApp: true }) — pur état d'écran, pas une
  // route). Se réinitialise dès que l'URL change réellement (navigation
  // effective), pour ne jamais rester affichée sur une page où elle ne
  // s'applique plus.
  const [showHomeRail, setShowHomeRail] = useState(false)
  useEffect(() => {
    if (showHomeRail) setShowHomeRail(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volontaire : ne doit tourner qu'au changement de pathname, pas à chaque changement de showHomeRail (sinon la surcouche se referme au clic qui l'ouvre)
  }, [pathname])

  if (!shouldShowSidebar(zone, true)) return null

  let sidebar = <ProfileWebSidebar onBack={() => setShowHomeRail(true)} />
  if (zone === 'personal-account') sidebar = <AccountSidebar />
  // zone 'messages' -> même variante que 'home' : la maquette n'a pas de rail
  // dédié aux messages, l'écran messages reste sur appLevel=true (rail
  // Accueil/Messages/Projet), voir Prototype desktop.dc.html L45/L774.
  if (zone === 'home' || zone === 'messages' || (zone === 'profile-web' && showHomeRail)) {
    sidebar = <HomeSidebar onProjetSelect={() => setShowHomeRail(false)} />
  }

  return <div className="app-layout__sidebar">{sidebar}</div>
}
