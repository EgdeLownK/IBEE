'use client'

import { Globe, Compass, X } from 'lucide-react'
import { useRailHover } from '@/hooks/useRailHover'
import { useDrawer } from '@/hooks/useDrawer'
import { MainRailItem } from './MainRailItem'

type Props = {
  webUrl: string
}

export function MainRail({ webUrl }: Props) {
  const { isExpanded, railProps } = useRailHover()
  const { isDrawerOpen, closeDrawer } = useDrawer()

  const showLabels = isExpanded || isDrawerOpen

  function handleNavKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'))
    const idx = items.indexOf(document.activeElement as HTMLAnchorElement)
    const next = e.key === 'ArrowDown'
      ? items[(idx + 1) % items.length]
      : items[(idx - 1 + items.length) % items.length]
    next?.focus()
  }

  return (
    <>
      {/* Backdrop mobile */}
      <div
        onClick={closeDrawer}
        className="main-rail-backdrop fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 md:hidden"
      />

      {/* Placeholder desktop — reserves space in flex flow for the fixed rail */}
      <div className="hidden md:block w-[60px] shrink-0" />

      {/* Rail */}
      <aside
        data-main-rail
        {...railProps}
        className={`
          main-rail fixed top-0 left-0 z-50 flex h-screen w-[280px] -translate-x-full flex-col
          border-r border-neutral-200 bg-neutral-0 transition-transform duration-200
          md:z-40 md:translate-x-0 md:transition-[width] md:duration-200 motion-reduce:md:transition-none
          ${isExpanded ? 'md:w-[240px] md:shadow-md' : 'md:w-[60px]'}
        `}
      >
        {/* Logo zone */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          {showLabels ? (
            <span className="text-lg font-semibold text-neutral-900">Agora</span>
          ) : (
            <span className="mx-auto text-lg font-semibold text-neutral-900">A</span>
          )}
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3" aria-label="Navigation principale" onKeyDown={handleNavKeyDown}>
          <div className="space-y-1" onClick={() => { if (isDrawerOpen) closeDrawer() }}>
            <MainRailItem
              icon={<Globe className="h-5 w-5" />}
              label="Mon site"
              href="/dashboard/site"
              isExpanded={showLabels}
            />
            <MainRailItem
              icon={<Compass className="h-5 w-5" />}
              label="Explorer"
              href={`${webUrl}/explore`}
              isExpanded={showLabels}
            />
          </div>
        </nav>
      </aside>
    </>
  )
}
