'use client'

import type { ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  CalendarClock,
  ChartColumnBig,
  Heart,
  PanelsTopLeft,
  Plug,
  ShoppingBag,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'
import { DashboardNavLink } from './DashboardNavLink'
import { MainRail, closeAppDrawer } from './MainRail'
import { ProjectAccountSwitcher } from './ProjectAccountSwitcher'

type SidebarItem = {
  href: string
  label: string
  icon: ReactNode
  isActive?: boolean
}

export function ProfileSidebar() {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()

  const isPreviewDashboard = searchParams?.get('preview') === 'dashboard'

  const generalItems: SidebarItem[] = [
    {
      href: '/dashboard/site',
      label: 'Mon site web',
      icon: <PanelsTopLeft className="h-5 w-5" aria-hidden="true" />,
      isActive:
        pathname.startsWith('/dashboard/site') ||
        pathname.startsWith('/profile-preview/') ||
        pathname.startsWith('/feed-detail/') ||
        (isPreviewDashboard &&
          (pathname.includes('/shop/') ||
            pathname.includes('/events/') ||
            pathname.includes('/services/'))),
    },

  ]

  const pilotageItems: SidebarItem[] = [

    {
      href: '/dashboard/talent',
      label: 'Talent',
      icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/talent'),
    },
  ]



  return (
    <MainRail ariaLabel="Navigation profil web">
      <div className="sidebar-nav__body">
        <div className="sidebar__section">
          <p className="sidebar__label">Générale</p>
          {generalItems.map((item) => renderItem(item))}
        </div>
        <div className="sidebar__section">
          <p className="sidebar__label">Pilotage</p>
          {pilotageItems.map((item) => renderItem(item))}
        </div>

      </div>
      <div className="sidebar-nav__footer">
        <ProjectAccountSwitcher variant="sidebar" />
      </div>
    </MainRail>
  )
}

function renderItem(item: SidebarItem) {
  const className = `sidebar__item${item.isActive ? ' is-active' : ''}`
  const content = (
    <>
      <span className="sidebar__item-icon flex h-5 w-5 shrink-0 items-center justify-center">
        {item.icon}
      </span>
      <span className="sidebar__item-text truncate">{item.label}</span>
    </>
  )

  if (item.href.startsWith('#')) {
    return (
      <a
        key={item.href + item.label}
        href={item.href}
        className={className}
        title={item.label}
        aria-label={item.label}
        onClick={() => {
          if (window.innerWidth < 1200) closeAppDrawer()
        }}
      >
        {content}
      </a>
    )
  }

  return (
    <DashboardNavLink
      key={item.href + item.label}
      href={item.href}
      className={className}
      label={item.label}
    >
      {content}
    </DashboardNavLink>
  )
}
