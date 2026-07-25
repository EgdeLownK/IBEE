'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import {
  isHomeWidgetFeaturedSingle,
  parseHighlightConfig,
  widgetHasDisplayContent,
  homeWidgetCarouselSectionLink,
} from '@ibee/shared'
import { homeWidgetLabel } from '@ibee/ui-react/profile'
import { WidgetCard } from './WidgetCard'
import { WidgetAdminMenu, type WidgetEditMode } from './WidgetAdminMenu'
import { WidgetBodyDisplay } from './WidgetBodyDisplay'
import type { HomeWidget } from './types'

export type SharedWidgetData = {
  shopProducts: any[]
  playlistServices: any[]
  playlistEvents: any[]
  publications: any[]
  faqItems: any[]
  contactInfo: any
  productCategories: any[]
}

type Props = {
  widgets: HomeWidget[]
  data: SharedWidgetData
  webBaseUrl: string
  detailBaseUrl?: string
  isOwner: boolean
  onEditWidget: (widget: HomeWidget) => void
  onDeleteWidget?: (widgetId: string) => void
  onAddWidgetClick?: () => void
}

function widgetEditMode(type: string): WidgetEditMode {
  if (type === 'widget_faq') return 'faq'
  return 'config'
}

export function SharedHomeWidgetsList({
  widgets,
  data,
  webBaseUrl,
  detailBaseUrl,
  isOwner,
  onEditWidget,
  onDeleteWidget,
  onAddWidgetClick,
}: Props) {
  const widgetCountByType = useMemo(() => {
    const acc: Record<string, number> = {}
    widgets.forEach((w) => {
      acc[w.type] = (acc[w.type] ?? 0) + 1
    })
    return acc
  }, [widgets])

  function widgetCardTitle(widget: HomeWidget, index: number): string {
    const carouselLink = homeWidgetCarouselSectionLink(widget.type, widget.config, webBaseUrl)
    if (carouselLink) return carouselLink.label

    if (widget.type === 'widget_highlight') {
      const cfg = parseHighlightConfig(widget.config)
      if (cfg) {
        const { kind, id } = cfg.item
        if (kind === 'product') {
          const p = data.shopProducts.find((x) => x.id === id)
          if (p) return p.title
        }
        if (kind === 'service') {
          const s = data.playlistServices.find((x) => x.id === id)
          if (s) return s.title
        }
        if (kind === 'event') {
          const ev = data.playlistEvents.find((x) => x.id === id)
          if (ev) return ev.title
        }
        if (kind === 'news') {
          const pub = data.publications.find((x) => x.id === id)
          if (pub) return pub.title
        }
      }
      return 'Mise en avant'
    }

    const base = homeWidgetLabel(widget.type)
    if ((widgetCountByType[widget.type] ?? 0) <= 1) return base
    const sameTypeIndex = widgets.slice(0, index + 1).filter((w) => w.type === widget.type).length
    return `${base} ${sameTypeIndex}`
  }

  function widgetCardTitleHref(widget: HomeWidget): string | undefined {
    return homeWidgetCarouselSectionLink(widget.type, widget.config, webBaseUrl)?.href
  }

  const displayCtx = {
    products: data.shopProducts,
    appointmentTypes: data.playlistServices,
    events: data.playlistEvents,
    publications: data.publications,
    faqItems: data.faqItems,
    contactInfo: data.contactInfo,
  }

  if (widgets.length === 0) {
    return (
      <div className="profile-section">
        <p className="m-0 text-sm text-neutral-500">
          Aucun contenu sur l&apos;accueil pour le moment.
        </p>
        {isOwner && onAddWidgetClick && (
          <div className="home-widgets__add">
            <button type="button" className="home-widgets__add-btn" onClick={onAddWidgetClick}>
              <Plus className="h-4 w-4" />
              <span>Ajouter un widget</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="widget-stack widget-stack--home pb-7">
      {widgets.map((widget, index) => {
        if (!widgetHasDisplayContent(widget, displayCtx)) return null

        const filled = true
        const editMode = isOwner ? widgetEditMode(widget.type) : 'none'
        const featuredSingle = isHomeWidgetFeaturedSingle(widget.type, widget.config)
        const headerVariant = featuredSingle ? 'hidden' : 'default'
        const transparentBg = featuredSingle || widget.type === 'widget_highlight'

        return (
          <WidgetCard
            key={widget.id}
            title={widgetCardTitle(widget, index)}
            titleHref={widgetCardTitleHref(widget)}
            filled={filled}
            transparentBackground={transparentBg}
            headerVariant={headerVariant}
            editMode={editMode}
            onEdit={() => onEditWidget(widget)}
            onDelete={onDeleteWidget ? () => onDeleteWidget(widget.id) : undefined}
          >
            <WidgetBodyDisplay
              widget={widget}
              data={{
                ...data,
                // We pass undefined if we don't have productCategories here? Wait, WidgetBodyDisplay needs productCategories for PublicProfileData?
                // Actually WidgetBodyDisplay doesn't strictly need productCategories, but let's pass it anyway.
              }}
              webBaseUrl={webBaseUrl}
              detailBaseUrl={detailBaseUrl}
              embedInWidgetCard
              adminMenu={
                featuredSingle && isOwner ? (
                  <WidgetAdminMenu
                    placement="card"
                    editMode={editMode}
                    onEdit={() => onEditWidget(widget)}
                    onDelete={onDeleteWidget ? () => onDeleteWidget(widget.id) : undefined}
                  />
                ) : undefined
              }
              onConfigure={(id) => onEditWidget(widget)}
              onOpenFaq={widget.type === 'widget_faq' ? () => onEditWidget(widget) : undefined}
              readOnly={!isOwner}
            />
          </WidgetCard>
        )
      })}

      {isOwner && onAddWidgetClick && (
        <div className="home-widgets__add">
          <button type="button" className="home-widgets__add-btn" onClick={onAddWidgetClick}>
            <Plus className="h-4 w-4" />
            <span>Ajouter un widget</span>
          </button>
        </div>
      )}
    </div>
  )
}
