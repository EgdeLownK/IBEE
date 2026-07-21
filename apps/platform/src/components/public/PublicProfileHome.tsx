'use client'

import { useEffect, useMemo, useState } from 'react'
import { sortHomeWidgetsByFixedOrder } from '@ibee/shared'
import { SharedHomeWidgetsList } from '@/components/profile/home-widgets/SharedHomeWidgetsList'
import type { HomeWidget } from '@/components/profile/home-widgets/types'
import type { PublicProfileData } from '@/lib/load-public-profile'

type Props = Pick<
  PublicProfileData,
  | 'homeWidgets'
  | 'shopProducts'
  | 'playlistServices'
  | 'playlistEvents'
  | 'publications'
  | 'faqItems'
  | 'contactInfo'
  | 'productCategories'
> & {
  entityId: string
  ownerId: string | null
  entityBaseUrl: string
  detailBaseUrl?: string
}

export function PublicProfileHome({
  homeWidgets,
  shopProducts,
  playlistServices,
  playlistEvents,
  publications,
  faqItems,
  contactInfo,
  productCategories,
  entityId,
  ownerId,
  entityBaseUrl,
  detailBaseUrl,
}: Props) {
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch(`/api/profile-state?entityId=${entityId}${ownerId ? `&ownerId=${ownerId}` : ''}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setIsOwner(data.isOwner)
        }
      } catch (err) {
        console.error('[auth-state]', err)
      }
    }
    fetchState()
  }, [entityId, ownerId])

  const widgets = useMemo(
    () =>
      sortHomeWidgetsByFixedOrder(
        (homeWidgets.filter((w) => w.is_active !== false) as HomeWidget[]).map((w) => ({
          ...w,
          config: (w.config ?? {}) as Record<string, unknown>,
        }))
      ),
    [homeWidgets]
  )

  const sharedData = useMemo(() => ({
    shopProducts,
    playlistServices,
    playlistEvents,
    publications,
    faqItems,
    contactInfo,
    productCategories,
  }), [shopProducts, playlistServices, playlistEvents, publications, faqItems, contactInfo, productCategories])

  return (
    <SharedHomeWidgetsList
      widgets={widgets}
      data={sharedData}
      webBaseUrl={entityBaseUrl}
      detailBaseUrl={detailBaseUrl}
      isOwner={isOwner}
      onEditWidget={() => { window.location.href = '/dashboard/site' }}
      onAddWidgetClick={() => { window.location.href = '/dashboard/site' }}
    />
  )
}
