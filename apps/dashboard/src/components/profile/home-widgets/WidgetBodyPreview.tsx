'use client'

import { widgetEmptyContent, widgetHasDisplayContent } from '@ibee/ui-server'
import type { HomeWidget } from './types'
import type { ProfileStudioData } from '@/lib/profile-studio-data'

interface Props {
  widget: HomeWidget
  data: Pick<
    ProfileStudioData,
    'shopProducts' | 'playlistServices' | 'playlistEvents' | 'publications' | 'faqItems' | 'contactInfo' | 'productCategories'
  >
  onConfigure: (widgetId: string) => void
  onOpenFaq?: () => void
  onOpenAddContent?: () => void
}

function formatPrice(cents: number | null | undefined, currency?: string | null) {
  if (cents == null) return null
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency ?? 'EUR' }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} €`
  }
}

export function WidgetBodyPreview({ widget, data, onConfigure, onOpenFaq, onOpenAddContent }: Props) {
  const ctx = {
    products: data.shopProducts,
    appointmentTypes: data.playlistServices,
    events: data.playlistEvents,
    publications: data.publications,
    faqItems: data.faqItems,
    contactInfo: data.contactInfo,
  }

  const filled = widgetHasDisplayContent(widget, ctx)

  if (!filled) {
    const empty = widgetEmptyContent(widget.type, 'unconfigured', { widgetId: widget.id })
    return (
      <div className="widget-empty">
        <p className="widget-empty__msg">{empty.ownerMessage}</p>
        {empty.ctaAction === 'data-open-home-widget-config' && (
          <button type="button" className="widget-empty__cta" onClick={() => onConfigure(widget.id)}>
            {empty.ctaLabel}
          </button>
        )}
        {empty.ctaAction === 'data-open-faq-overlay' && onOpenFaq && (
          <button type="button" className="widget-empty__cta" onClick={onOpenFaq}>
            {empty.ctaLabel}
          </button>
        )}
        {empty.ctaAction === 'data-open-publication-overlay' && onOpenAddContent && (
          <button type="button" className="widget-empty__cta" onClick={onOpenAddContent}>
            {empty.ctaLabel}
          </button>
        )}
      </div>
    )
  }

  switch (widget.type) {
    case 'widget_shop': {
      const cfg = widget.config
      if (cfg.mode === 'product' && typeof cfg.product_id === 'string') {
        const p = data.shopProducts.find((x) => x.id === cfg.product_id)
        if (p) {
          return (
            <div className="widget-preview">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="widget-preview__thumb" />
              )}
              <div>
                <p className="widget-preview__title">{p.title}</p>
                {p.detailExcerpt && <p className="widget-preview__excerpt">{p.detailExcerpt}</p>}
                <p className="widget-preview__meta">{formatPrice(p.sale_price_cents ?? p.price_cents, p.currency)}</p>
              </div>
            </div>
          )
        }
      }
      if (cfg.mode === 'collection' && typeof cfg.category_id === 'string') {
        const cat = data.productCategories.find((c) => c.id === cfg.category_id)
        const count = data.shopProducts.filter((p) => p.category_id === cfg.category_id).length
        return (
          <p className="widget-preview__meta">
            Carrousel catégorie {cat ? `« ${cat.name} »` : ''} — {count} produit{count > 1 ? 's' : ''}
          </p>
        )
      }
      break
    }
    case 'widget_service': {
      const cfg = widget.config
      if (cfg.mode === 'service' && typeof cfg.appointment_type_id === 'string') {
        const s = data.playlistServices.find((x) => x.id === cfg.appointment_type_id)
        if (s) {
          return (
            <div className="widget-preview">
              {s.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url} alt="" className="widget-preview__thumb" />
              )}
              <div>
                <p className="widget-preview__title">{s.title}</p>
                <p className="widget-preview__meta">
                  {s.duration_minutes} min · {formatPrice(s.promo_price_cents ?? s.price_cents, s.currency)}
                </p>
              </div>
            </div>
          )
        }
      }
      if (cfg.mode === 'collection') {
        return (
          <p className="widget-preview__meta">
            Carrousel services — {data.playlistServices.length} service
            {data.playlistServices.length > 1 ? 's' : ''}
          </p>
        )
      }
      break
    }
    case 'widget_event': {
      const cfg = widget.config
      if (cfg.mode === 'featured' && typeof cfg.event_id === 'string') {
        const ev = data.playlistEvents.find((x) => x.id === cfg.event_id)
        if (ev) return <p className="widget-preview__title">{ev.title}</p>
      }
      if (cfg.mode === 'list') {
        return (
          <p className="widget-preview__meta">
            Liste events — {data.playlistEvents.length} événement
            {data.playlistEvents.length > 1 ? 's' : ''}
          </p>
        )
      }
      break
    }
    case 'widget_news':
      return (
        <p className="widget-preview__meta">
          Dernières publications — {data.publications.length} actu{data.publications.length > 1 ? 's' : ''}
        </p>
      )
    case 'widget_faq':
      return (
        <p className="widget-preview__meta">
          {data.faqItems.length} question{data.faqItems.length > 1 ? 's' : ''} FAQ
        </p>
      )
    case 'widget_bio':
      return <p className="widget-preview__meta">Contacts et horaires du profil</p>
    case 'widget_announcement': {
      const images = Array.isArray(widget.config.images) ? widget.config.images : []
      return (
        <p className="widget-preview__meta">
          Bannière — {images.length} image{images.length > 1 ? 's' : ''}
        </p>
      )
    }
  }

  return <p className="widget-preview__meta">Widget configuré</p>
}
