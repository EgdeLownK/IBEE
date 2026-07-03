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
        className="main-rail-backdrop"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside data-main-rail className="main-rail" aria-label={ariaLabel}>
        <div className="main-rail__head">
          <button
            type="button"
            className="main-rail__close"
            aria-label="Fermer le menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="sidebar-nav">{children}</nav>
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
