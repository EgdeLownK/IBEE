'use client'

import { widgetEmptyContent, widgetHasDisplayContent, parseCarouselConfig, CAROUSEL_SELECTION_LABELS } from '@ibee/shared'
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

  if (!filled) return null

  switch (widget.type) {
    case 'widget_highlight': {
      const cfg = widget.config
      const item = cfg.item as { kind?: string; id?: string } | undefined
      if (cfg.mode === 'single' && item?.kind && typeof item.id === 'string') {
        if (item.kind === 'product') {
          const p = data.shopProducts.find((x) => x.id === item.id)
          if (p) {
            return (
              <div className="widget-preview">
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="widget-preview__thumb" />
                )}
                <div>
                  <p className="widget-preview__title">{p.title}</p>
                  <p className="widget-preview__meta">Produit · {formatPrice(p.sale_price_cents ?? p.price_cents, p.currency)}</p>
                </div>
              </div>
            )
          }
        }
        if (item.kind === 'service') {
          const s = data.playlistServices.find((x) => x.id === item.id)
          if (s) {
            return (
              <div className="widget-preview">
                {s.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" className="widget-preview__thumb" />
                )}
                <div>
                  <p className="widget-preview__title">{s.title}</p>
                  <p className="widget-preview__meta">Service · {s.duration_minutes} min</p>
                </div>
              </div>
            )
          }
        }
        if (item.kind === 'event') {
          const ev = data.playlistEvents.find((x) => x.id === item.id)
          if (ev) return <p className="widget-preview__title">Événement · {ev.title}</p>
        }
        if (item.kind === 'news') {
          const pub = data.publications.find((x) => x.id === item.id)
          if (pub) return <p className="widget-preview__title">Actualité · {pub.title}</p>
        }
      }
      break
    }
    case 'widget_carousel': {
      const parsed = parseCarouselConfig(widget.config)
      if (!parsed) break
      if (parsed.source_kind === 'shop_category') {
        const mode = parsed.selection_mode ?? 'category'
        if (mode === 'category') {
          const cat = data.productCategories.find((c) => c.id === parsed.category_id)
          const count = data.shopProducts.filter((p) => p.category_id === parsed.category_id).length
          return (
            <p className="widget-preview__meta">
              Boutique · {CAROUSEL_SELECTION_LABELS.category}
              {cat ? ` « ${cat.name} »` : ''} — {count} produit{count > 1 ? 's' : ''}
            </p>
          )
        }
        return (
          <p className="widget-preview__meta">
            Boutique · {CAROUSEL_SELECTION_LABELS[mode]} — {data.shopProducts.length} produit
            {data.shopProducts.length > 1 ? 's' : ''}
          </p>
        )
      }
      if (parsed.source_kind === 'services') {
        const mode = parsed.selection_mode ?? 'popular'
        return (
          <p className="widget-preview__meta">
            Services · {CAROUSEL_SELECTION_LABELS[mode]} — {data.playlistServices.length} service
            {data.playlistServices.length > 1 ? 's' : ''}
          </p>
        )
      }
      if (parsed.source_kind === 'events') {
        return (
          <p className="widget-preview__meta">
            Événements à venir — {data.playlistEvents.length} événement
            {data.playlistEvents.length > 1 ? 's' : ''}
          </p>
        )
      }
      if (parsed.source_kind === 'news') {
        return (
          <p className="widget-preview__meta">
            Dernières actualités — {data.publications.length} actu{data.publications.length > 1 ? 's' : ''}
          </p>
        )
      }
      break
    }
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
