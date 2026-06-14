'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartColumnBig,
  Folder,
  PanelsTopLeft,
  Plug,
  Users,
} from 'lucide-react'
import { MainRail, closeAppDrawer } from './MainRail'

type SidebarItem = {
  href: string
  label: string
  icon: ReactNode
  isActive?: boolean
}

export function ProfileSidebar() {
  const pathname = usePathname() ?? ''

  const generalItems: SidebarItem[] = [
    {
      href: '/dashboard/site',
      label: 'Profile web',
      icon: <PanelsTopLeft className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/site'),
    },
    {
      href: '/dashboard/analyse',
      label: 'Analyse',
      icon: <ChartColumnBig className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/analyse'),
    },
  ]

  const toolsItems: SidebarItem[] = [
    {
      href: '#connecteur',
      label: 'Connecteur',
      icon: <Plug className="h-5 w-5" aria-hidden="true" />,
    },
    {
      href: '/dashboard/drive',
      label: 'Drive',
      icon: <Folder className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/drive'),
    },
    {
      href: '/dashboard/equipe',
      label: 'Équipe',
      icon: <Users className="h-5 w-5" aria-hidden="true" />,
      isActive: pathname.startsWith('/dashboard/equipe'),
    },
  ]

  return (
    <MainRail ariaLabel="Navigation profil web">
      <div className="sidebar__section">
        <p className="sidebar__label">Générale</p>
        {generalItems.map((item) => renderItem(item))}
      </div>
      <div className="sidebar__section">
        <p className="sidebar__label">Outils</p>
        {toolsItems.map((item) => renderItem(item))}
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
