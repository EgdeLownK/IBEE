'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Globe, User, Newspaper, CalendarClock, Users, ShoppingBag, Calendar, Video, Link, HelpCircle, ChevronDown } from 'lucide-react'
import { SiteSidebarGroup } from './SiteSidebarGroup'
import { SiteSidebarItem } from './SiteSidebarItem'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/site', group: null, available: true },
  { id: 'apercu', label: 'Aperçu', icon: Globe, href: '/dashboard/site/apercu', group: null, available: true },
  { id: 'general', label: 'Général', icon: User, href: '/dashboard/site/general', group: 'IDENTITÉ', available: true },
  { id: 'news', label: 'News', icon: Newspaper, href: '/dashboard/site/news', group: 'CONTENUS', available: true },
  { id: 'appointments', label: 'Rendez-vous', icon: CalendarClock, href: '/dashboard/site/appointments', group: 'CONTENUS', available: true },
  { id: 'clients', label: 'Clients', icon: Users, href: '/dashboard/site/clients', group: 'CONTENUS', available: true },
  { id: 'shop', label: 'Produits', icon: ShoppingBag, href: '/dashboard/site/products', group: 'CONTENUS', available: true },
  { id: 'events', label: 'Événements', icon: Calendar, href: '/dashboard/site/events', group: 'CONTENUS', available: false },
  { id: 'videos', label: 'Vidéos', icon: Video, href: '/dashboard/site/videos', group: 'CONTENUS', available: false },
  { id: 'links', label: 'Liens', icon: Link, href: '/dashboard/site/links', group: 'ENGAGEMENT', available: false },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, href: '/dashboard/site/faq', group: 'ENGAGEMENT', available: false },
] as const

function getActiveItem(pathname: string) {
  // Match most specific first (news before dashboard)
  return NAV_ITEMS.find(item =>
    item.href !== '/dashboard/site'
      ? pathname.startsWith(item.href)
      : pathname === '/dashboard/site'
  ) ?? NAV_ITEMS[0]
}

export function SiteSidebar() {
  const pathname = usePathname()
  const activeItem = getActiveItem(pathname)

  // Mobile: top selector
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  // Group items by group label
  const groups = new Map<string, typeof NAV_ITEMS[number][]>()
  const ungrouped: typeof NAV_ITEMS[number][] = []
  NAV_ITEMS.forEach(item => {
    if (!item.group) {
      ungrouped.push(item)
    } else {
      const list = groups.get(item.group) ?? []
      list.push(item)
      groups.set(item.group, list)
    }
  })

  const sidebarContent = (
    <>
      {/* Ungrouped items (Dashboard) */}
      <div className="space-y-0.5">
        {ungrouped.map(item => (
          <SiteSidebarItem
            key={item.id}
            icon={<item.icon className="h-5 w-5" />}
            label={item.label}
            href={item.href}
            isActive={activeItem.id === item.id}
            available={item.available}
          />
        ))}
      </div>

      {/* Grouped items */}
      {Array.from(groups).map(([groupLabel, items]) => (
        <SiteSidebarGroup key={groupLabel} label={groupLabel}>
          {items.map(item => (
            <SiteSidebarItem
              key={item.id}
              icon={<item.icon className="h-5 w-5" />}
              label={item.label}
              href={item.href}
              isActive={activeItem.id === item.id}
              available={item.available}
            />
          ))}
        </SiteSidebarGroup>
      ))}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-neutral-200 bg-neutral-0 overflow-y-auto">
        <div className="border-b border-neutral-200 px-4 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Mon site</h2>
        </div>
        <nav className="flex-1 p-2" aria-label="Navigation du site">
          {sidebarContent}
        </nav>
      </aside>

      {/* Mobile: top selector */}
      <div className="md:hidden relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center gap-3 border-b border-neutral-200 bg-neutral-0 px-4 py-3"
          aria-expanded={mobileOpen}
        >
          <activeItem.icon className="h-5 w-5 text-accent" />
          <span className="flex-1 text-left text-sm font-medium text-neutral-900">{activeItem.label}</span>
          <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>

        {mobileOpen && (
          <div
            className="absolute left-0 right-0 top-full z-30 border-b border-neutral-200 bg-neutral-0 shadow-lg"
            onClick={() => setMobileOpen(false)}
          >
            <nav className="p-2" aria-label="Navigation du site">
              {sidebarContent}
            </nav>
          </div>
        )}
      </div>
    </>
  )
}
