'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProfileStudioSections } from '@/components/profile/ProfileStudioSections'
import type { PublicProfileData } from '@/lib/load-public-profile'
import { PublicProfileMenuTabs } from './PublicProfileMenuTabs'
import { PublicProfileHome } from './PublicProfileHome'

interface Props {
  data: PublicProfileData
}

export function PublicProfileTabsController({ data }: Props) {
  const [activeType, setActiveType] = useState('home')
  const [tabsReady, setTabsReady] = useState(false)

  const visibleTypes = useMemo(() => {
    const types = new Set<string>(['home'])
    data.menuSections.forEach((s) => types.add(s.type))
    return types
  }, [data.menuSections])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (hash && visibleTypes.has(hash)) setActiveType(hash)
      else if (!hash) setActiveType('home')
    }
    syncFromHash()
    setTabsReady(true)
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [visibleTypes])

  function handleTabChange(type: string) {
    setActiveType(type)
    window.history.replaceState(null, '', `#${type}`)
  }

  return (
    <>
      <PublicProfileMenuTabs
        menuSections={data.menuSections}
        activeType={activeType}
        tabsReady={tabsReady}
        onTabChange={handleTabChange}
      />

      {activeType === 'home' ? (
        <PublicProfileHome
          homeWidgets={data.homeWidgets}
          shopProducts={data.shopProducts}
          playlistServices={data.playlistServices}
          playlistEvents={data.playlistEvents}
          publications={data.publications}
          faqItems={data.faqItems}
          contactInfo={data.contactInfo}
          productCategories={data.productCategories}
          entityBaseUrl={data.entityBaseUrl}
        />
      ) : (
        <ProfileStudioSections
          activeType={activeType}
          homeWidgets={data.homeWidgets}
          shopProducts={data.shopProducts}
          playlistServices={data.playlistServices}
          playlistEvents={data.playlistEvents}
          publications={data.publications}
          historyBlocks={data.historyBlocks}
          faqItems={data.faqItems}
          entitySlug={data.entity.slug}
          entityDisplayName={data.entity.display_name}
          entityAvatarUrl={data.entity.avatar_url}
          webBaseUrl={data.entityBaseUrl}
          dashboardBaseUrl=""
          readOnly
        />
      )}
    </>
  )
}
