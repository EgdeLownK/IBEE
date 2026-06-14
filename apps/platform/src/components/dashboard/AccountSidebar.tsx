'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Folder, Lock, User, Wallet } from 'lucide-react'
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
      href: '#revenue',
      label: 'Revenus',
      icon: <Wallet className="h-5 w-5" aria-hidden="true" />,
    },
    {
      href: '/dashboard/site/general',
      label: 'Mon compte',
      icon: <User className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/site/general'),
    },
    {
      href: '/dashboard/drive',
      label: 'Drive',
      icon: <Folder className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/drive'),
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
    <Link
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
    </Link>
  )
}
