'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { sortHomeWidgetsByFixedOrder, widgetHasDisplayContent } from '@ibee/shared'
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
        const res = await fetch(`/api/profile-state?entityId=${entityId}${ownerId ? `&ownerId=${ownerId}` : ''}`)
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

  if (widgets.length === 0) {
    return (
      <div className="profile-section">
        <p className="m-0 text-sm text-neutral-500">Aucun contenu sur l&apos;accueil pour le moment.</p>
        {isOwner && (
          <div className="home-widgets__add">
            <Link
              href="/dashboard/site"
              className="home-widgets__add-btn"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un widget</span>
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="widget-stack widget-stack--home pb-7">
      {widgets.map((widget) => {
        const ctx = {
          products: shopProducts,
          appointmentTypes: playlistServices,
          events: playlistEvents,
          publications,
          faqItems,
          contactInfo,
        }
        if (!widgetHasDisplayContent(widget, ctx)) return null
        return (
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
              onConfigure={() => { window.location.href = '/dashboard/site' }}
              onOpenFaq={() => { window.location.href = '/dashboard/site' }}
              onOpenAddContent={() => { window.location.href = '/dashboard/site?action=add-content' }}
              readOnly={!isOwner}
            />
          </article>
        )
      })}
      
      {isOwner && (
        <div className="home-widgets__add">
          <Link
            href="/dashboard/site"
            className="home-widgets__add-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un widget</span>
          </Link>
        </div>
      )}
    </div>
  )
}
