'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import { ProfileStudioSections } from '@/components/profile/ProfileStudioSections'
import type { PublicProfileData } from '@/lib/load-public-profile'
import { PublicProfileHero } from './PublicProfileHero'
import { PublicProfileMenuTabs } from './PublicProfileMenuTabs'
import { PublicProfileHome } from './PublicProfileHome'

interface Props {
  data: PublicProfileData
}

export function PublicProfilePage({ data }: Props) {
  const [activeType, setActiveType] = useState('home')

  const visibleTypes = useMemo(() => {
    const types = new Set<string>(['home'])
    data.menuSections.forEach((s) => types.add(s.type))
    return types
  }, [data.menuSections])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash && visibleTypes.has(hash)) {
      setActiveType(hash)
    }
  }, [visibleTypes])

  function handleTabChange(type: string) {
    setActiveType(type)
    window.history.replaceState(null, '', `#${type}`)
  }

  return (
    <main className="profile-page">
      <ProfileShell>
        <PublicProfileHero
          displayName={data.entity.display_name}
          role={data.entity.role}
          bio={data.entity.bio}
          avatarUrl={data.entity.avatar_url}
          bannerUrl={data.entity.banner_url}
          entityId={data.entity.id}
          entitySlug={data.entity.slug}
          followersCount={data.entity.followers_count}
          isAuthenticated={data.isAuthenticated}
          isFollowing={data.isFollowing}
        />

        <PublicProfileMenuTabs
          menuSections={data.menuSections}
          activeType={activeType}
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
      </ProfileShell>
    </main>
  )
}
