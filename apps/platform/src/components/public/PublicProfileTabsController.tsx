'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { isAnalyticsSectionType } from '@ibee/shared'
import {
  getVisibleProfileTabs,
  profileTabContentFromLists,
} from '@ibee/ui-react/profile'
import { ProfileStudioSections } from '@/components/profile/ProfileStudioSections'
import type { PublicProfileData } from '@/lib/load-public-profile'
import { embedDetailBase, embedProfileHref } from '@/lib/embed-public-urls'
import { trackAnalyticsEvents } from '@/lib/analytics-client'
import { PublicProfileMenuTabs } from './PublicProfileMenuTabs'
import { PublicProfileHome } from './PublicProfileHome'

interface Props {
  data: PublicProfileData
  embedMode?: boolean
}

export function PublicProfileTabsController({ data, embedMode = false }: Props) {
  const [activeType, setActiveType] = useState('home')
  const [tabsReady, setTabsReady] = useState(false)
  const trackedSection = useRef<string | null>(null)

  const tabContent = useMemo(
    () =>
      profileTabContentFromLists({
        publications: data.publications,
        shopProducts: data.shopProducts,
        playlistServices: data.playlistServices,
        playlistEvents: data.playlistEvents,
        historyBlocks: data.historyBlocks,
      }),
    [
      data.publications,
      data.shopProducts,
      data.playlistServices,
      data.playlistEvents,
      data.historyBlocks,
    ]
  )

  const visibleTypes = useMemo(() => {
    const types = getVisibleProfileTabs(
      'public',
      data.menuSections,
      tabContent
    )
    return new Set<string>(types)
  }, [data.menuSections, tabContent])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (hash && visibleTypes.has(hash)) setActiveType(hash)
      else setActiveType('home')
    }
    syncFromHash()
    setTabsReady(true)
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [visibleTypes])

  useEffect(() => {
    if (!tabsReady || !isAnalyticsSectionType(activeType)) return
    if (trackedSection.current === activeType) return
    trackedSection.current = activeType

    trackAnalyticsEvents([
      {
        entity_id: data.entity.id,
        event_type: 'section_view',
        section_type: activeType,
      },
    ])
  }, [activeType, data.entity.id, tabsReady])

  function handleTabChange(type: string) {
    setActiveType(type)
    window.history.replaceState(null, '', `#${type}`)
  }

  const webBaseUrl = embedMode ? embedProfileHref(data.entity.slug) : data.entityBaseUrl
  const detailBaseUrl = embedMode ? embedDetailBase(data.entity.slug) : undefined

  return (
    <>
      <PublicProfileMenuTabs
        menuSections={data.menuSections}
        tabContent={tabContent}
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
          entityBaseUrl={webBaseUrl}
          detailBaseUrl={detailBaseUrl}
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
          productCategories={data.productCategories}
          entitySlug={data.entity.slug}
          entityDisplayName={data.entity.display_name}
          entityAvatarUrl={data.entity.avatar_url}
          webBaseUrl={webBaseUrl}
          detailBaseUrl={detailBaseUrl}
          dashboardBaseUrl=""
          readOnly
        />
      )}
    </>
  )
}
