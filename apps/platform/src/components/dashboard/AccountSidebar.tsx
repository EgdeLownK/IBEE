'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Lock, User, Wallet } from 'lucide-react'
import { DashboardNavLink } from './DashboardNavLink'
import { MainRail, closeAppDrawer } from './MainRail'

type SidebarItem = {
  href: string
  label: string
  icon: ReactNode
  isActive?: boolean
}

export function AccountSidebar() {
  const pathname = usePathname() ?? ''

  const accountItems: SidebarItem[] = [
    {
      href: '/dashboard/compte/revenus',
      label: 'Revenus perso',
      icon: <Wallet className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/compte/revenus'),
    },
    {
      href: '/dashboard/site/general',
      label: 'Mon compte',
      icon: <User className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/site/general'),
    },
    {
      href: '/notifications',
      label: 'Notifications',
      icon: <Bell className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/notifications'),
    },
    {
      href: '#privacy',
      label: 'Confidentialité',
      icon: <Lock className="h-5 w-5" aria-hidden="true" />,
    },
  ]

  return (
    <MainRail ariaLabel="Navigation compte personnel">
      <div className="sidebar__section">
        <p className="sidebar__label">Compte</p>
        {accountItems.map((item) => renderItem(item))}
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
