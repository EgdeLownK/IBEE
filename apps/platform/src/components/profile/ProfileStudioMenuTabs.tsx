'use client'

import {
  PROFILE_TAB_ICONS,
  PROFILE_TAB_LABELS,
  getVisibleProfileTabs,
  type ProfileTabContent,
} from '@ibee/ui-react/profile'

interface MenuSection {
  type: string
}

interface Props {
  menuSections: MenuSection[]
  tabContent: ProfileTabContent
  activeType: string
  onTabChange: (type: string) => void
}

export function ProfileStudioMenuTabs({
  menuSections,
  tabContent,
  activeType,
  onTabChange,
}: Props) {
  const visibleTabs = getVisibleProfileTabs('studio', menuSections, tabContent)

  return (
    <nav aria-label="Navigation du profil" className="profile-tabs-wrap">
      <div className="segtabs no-scrollbar">
        {visibleTabs.map((type) => {
          const Icon = PROFILE_TAB_ICONS[type]
          const isActive = type === activeType
          return (
            <button
              key={type}
              type="button"
              className={`segtab${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(type)}
            >
              <Icon aria-hidden="true" />
              {PROFILE_TAB_LABELS[type]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
