'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ChartColumnBig,
  Folder,
  PanelsTopLeft,
  Plug,
  Users,
  X,
} from 'lucide-react'

type SidebarItem = {
  href: string
  label: string
  icon: ReactNode
  external?: boolean
  isActive?: boolean
}

interface Props {
  webProfileUrl: string
  webProfileActive: boolean
}

function setDrawerOpen(open: boolean) {
  document.documentElement.setAttribute('data-drawer-open', open ? 'true' : 'false')
}

export function GlobalSidebar({ webProfileUrl, webProfileActive }: Props) {
  const espaceItems: SidebarItem[] = [
    {
      href: webProfileUrl,
      label: 'Profile web',
      icon: <PanelsTopLeft className="h-5 w-5" aria-hidden="true" />,
      external: true,
      isActive: webProfileActive,
    },
    {
      href: '#analyse',
      label: 'Analyse',
      icon: <ChartColumnBig className="h-5 w-5" aria-hidden="true" />,
    },
  ]

  const outilsItems: SidebarItem[] = [
    { href: '#drive', label: 'Drive', icon: <Folder className="h-5 w-5" aria-hidden="true" /> },
    { href: '#equipe', label: 'Équipe', icon: <Users className="h-5 w-5" aria-hidden="true" /> },
    { href: '#connecteur', label: 'Connecteur', icon: <Plug className="h-5 w-5" aria-hidden="true" /> },
  ]

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

    if (item.external) {
      return (
        <a
          key={item.href + item.label}
          href={item.href}
          className={className}
          title={item.label}
          aria-label={item.label}
          onClick={() => {
            if (window.innerWidth < 1200) setDrawerOpen(false)
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
          if (window.innerWidth < 1200) setDrawerOpen(false)
        }}
      >
        {content}
      </Link>
    )
  }

  return (
    <>
      <div
        className="main-rail-backdrop fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 min-[1200px]:hidden"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div className="main-rail-spacer hidden min-[1200px]:block" aria-hidden="true" />
      <aside
        data-main-rail
        className="main-rail fixed left-0 z-50 flex w-[280px] -translate-x-full flex-col transition-transform duration-200 min-[1200px]:z-40 min-[1200px]:w-[260px] min-[1200px]:translate-x-0"
        aria-label="Navigation principale"
      >
        <div className="main-rail__head flex h-[65px] shrink-0 items-center justify-end px-[25px] min-[1200px]:hidden">
          <button
            type="button"
            className="main-rail__close flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-panel"
            aria-label="Fermer le menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav flex-1 overflow-y-auto">
          <div className="sidebar__section">
            <p className="sidebar__label">Espace</p>
            {espaceItems.map(renderItem)}
          </div>
          <div className="sidebar__section">
            <p className="sidebar__label">Outils</p>
            {outilsItems.map(renderItem)}
          </div>
        </nav>
      </aside>
    </>
  )
}

export function toggleAppDrawer() {
  const open = document.documentElement.getAttribute('data-drawer-open') === 'true'
  document.documentElement.setAttribute('data-drawer-open', open ? 'false' : 'true')
}
