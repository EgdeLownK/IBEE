'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  children: ReactNode
  ariaLabel: string
}

function setDrawerOpen(open: boolean) {
  document.documentElement.setAttribute('data-drawer-open', open ? 'true' : 'false')
}

export function MainRail({ children, ariaLabel }: Props) {
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
        aria-label={ariaLabel}
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
        <nav className="sidebar-nav flex-1 overflow-y-auto">{children}</nav>
      </aside>
    </>
  )
}

export function toggleAppDrawer() {
  const open = document.documentElement.getAttribute('data-drawer-open') === 'true'
  document.documentElement.setAttribute('data-drawer-open', open ? 'false' : 'true')
}

export function closeAppDrawer() {
  document.documentElement.setAttribute('data-drawer-open', 'false')
}
