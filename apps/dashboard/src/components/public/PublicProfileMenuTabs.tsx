'use client'

import { PROFILE_TAB_ICONS, PROFILE_TAB_LABELS, PROFILE_TAB_ORDER } from '@ibee/ui-react/profile'

interface MenuSection {
  type: string
}

interface Props {
  menuSections: MenuSection[]
  activeType: string
  onTabChange: (type: string) => void
}

export function PublicProfileMenuTabs({ menuSections, activeType, onTabChange }: Props) {
  const activeTypes = new Set<string>(['home'])
  menuSections.forEach((s) => activeTypes.add(s.type))
  const visibleTabs = PROFILE_TAB_ORDER.filter((t) => activeTypes.has(t))

  if (visibleTabs.length === 0) {
    return (
      <div className="profile-tabs-wrap px-[22px] py-6 text-center text-sm text-neutral-500">
        Aucun onglet configuré pour ce profil.
      </div>
    )
  }

  return (
    <div className="profile-tabs-wrap">
      <nav className="segtabs" aria-label="Navigation du profil">
        {visibleTabs.map((type) => {
          const Icon = PROFILE_TAB_ICONS[type]
          const label = PROFILE_TAB_LABELS[type]
          const isActive = activeType === type
          return (
            <button
              key={type}
              type="button"
              className={`segtab${isActive ? ' is-active' : ''}`}
              onClick={() => onTabChange(type)}
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
