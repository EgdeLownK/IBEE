'use client'

import { useMemo } from 'react'
import { sortHomeWidgetsByFixedOrder } from '@ibee/shared'
import { WidgetBodyDisplay } from '@/components/profile/home-widgets/WidgetBodyDisplay'
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
  entityBaseUrl,
  detailBaseUrl,
}: Props) {
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

  if (widgets.length === 0) {
    return (
      <div className="profile-section">
        <p className="m-0 text-sm text-neutral-500">Aucun contenu sur l&apos;accueil pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="widget-stack widget-stack--home pb-7">
      {widgets.map((widget) => (
        <article key={widget.id} className="widget">
          <WidgetBodyDisplay
            widget={widget}
            data={{
              shopProducts,
              playlistServices,
              playlistEvents,
              publications,
              faqItems,
              contactInfo,
              productCategories,
            }}
            webBaseUrl={entityBaseUrl}
            detailBaseUrl={detailBaseUrl}
            onConfigure={() => {}}
            readOnly
          />
        </article>
      ))}
    </div>
  )
}
