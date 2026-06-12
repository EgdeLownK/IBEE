'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
  Zap,
} from 'lucide-react'
import {
  isWidgetConfigured,
  normalizeWidgetConfig,
  parseAnnouncementConfig,
  parseBioConfig,
  parseEventConfig,
  parseFaqConfig,
  parseNewsConfig,
  parseServiceConfig,
  parseShopConfig,
  widgetEmptyContent,
  widgetHasDisplayContent,
} from '@ibee/ui-server'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import type { HomeWidget } from './types'

type Props = {
  widget: HomeWidget
  data: Pick<
    ProfileStudioData,
    | 'shopProducts'
    | 'playlistServices'
    | 'playlistEvents'
    | 'publications'
    | 'faqItems'
    | 'contactInfo'
    | 'productCategories'
  >
  webBaseUrl: string
  onConfigure: (widgetId: string) => void
  onOpenFaq?: () => void
  onOpenAddContent?: () => void
  readOnly?: boolean
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

function formatPrice(cents: number | null | undefined, currency?: string | null) {
  if (cents == null || cents === 0) return '0€'
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency ?? 'EUR' }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} €`
  }
}

function saleActive(salePrice: number | null | undefined, saleEnds: string | null | undefined) {
  if (salePrice == null) return false
  if (!saleEnds) return true
  return new Date(saleEnds).getTime() > Date.now()
}

function useTrackNav(trackRef: React.RefObject<HTMLDivElement | null>, slideSelector: string) {
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setCanPrev(track.scrollLeft > 1)
    setCanNext(track.scrollLeft < max - 1)
  }, [trackRef])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    update()
    track.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      track.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [trackRef, update])

  function scrollByDir(dir: -1 | 1) {
    const track = trackRef.current
    if (!track) return
    const slide = track.querySelector(slideSelector) as HTMLElement | null
    const step = (slide?.offsetWidth ?? track.clientWidth * 0.6) + 14
    track.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return { canPrev, canNext, scrollPrev: () => scrollByDir(-1), scrollNext: () => scrollByDir(1) }
}

function WidgetFeaturedCard({
  href,
  imageUrl,
  placeholder,
  badgeLabel,
  title,
  tags,
  priceLabel,
  oldPriceLabel,
  promo,
  ctaLabel,
}: {
  href: string
  imageUrl: string | null
  placeholder: React.ReactNode
  badgeLabel: string
  title: string
  tags: string[]
  priceLabel: string
  oldPriceLabel?: string | null
  promo?: boolean
  ctaLabel: string
}) {
  return (
    <section className="wfeat wfeat--embedded">
      <a href={href} className="wfeat__card">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="wfeat__img" loading="lazy" />
        ) : (
          <span className="wfeat__placeholder" aria-hidden="true">
            {placeholder}
          </span>
        )}
        <span className="wfeat__badge">{badgeLabel}</span>
        <span className="wfeat__price-badge">
          {promo && oldPriceLabel ? (
            <>
              <span className="wfeat__price-now">{priceLabel}</span>
              <s className="wfeat__price-was">{oldPriceLabel}</s>
            </>
          ) : (
            <span className="wfeat__price-now">{priceLabel}</span>
          )}
        </span>
        <div className="wfeat__caption">
          <div className="wfeat__glass">
            <div className="wfeat__row">
              <div className="wfeat__info">
                <h3 className="wfeat__name">{title}</h3>
                {tags.length > 0 && (
                  <div className="wfeat__tags">
                    {tags.map((tag) => (
                      <span key={tag} className="wfeat__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="wfeat__cta">{ctaLabel}</span>
            </div>
          </div>
        </div>
      </a>
    </section>
  )
}

function CategoryCarousel({
  title,
  moreHref,
  children,
  showNav,
}: {
  title: string
  moreHref?: string
  children: React.ReactNode
  showNav: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const { canPrev, canNext, scrollPrev, scrollNext } = useTrackNav(trackRef, '.wcat__tile')

  return (
    <section className="wcat wcat--embedded">
      <div className="wcat__head">
        <h2 className="wcat__title">{title}</h2>
        {moreHref && (
          <a href={moreHref} className="wcat__more">
            Voir plus
          </a>
        )}
      </div>
      <div className="wcat__carousel">
        <div className="wcat__track" ref={trackRef}>
          {children}
        </div>
        {showNav && (
          <>
            <button type="button" className="wcat__nav wcat__nav--prev" disabled={!canPrev} onClick={scrollPrev} aria-label="Précédent">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" className="wcat__nav wcat__nav--next" disabled={!canNext} onClick={scrollNext} aria-label="Suivant">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function Stars({ average, count }: { average: number; count: number }) {
  if (count === 0) return <span className="tile__review-empty">Pas encore d&apos;avis</span>
  return (
    <div className="tile__reviews">
      <span className="tile__stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`tile__star${i <= Math.round(average) ? ' is-on' : ''}`}>
            <Star className="h-3 w-3" fill={i <= Math.round(average) ? 'currentColor' : 'none'} />
          </span>
        ))}
      </span>
      <span className="tile__rating">{average.toFixed(1)}</span>
      <span className="tile__review-count">({count})</span>
    </div>
  )
}

function ShopTile({
  href,
  title,
  imageUrl,
  excerpt,
  priceCents,
  salePriceCents,
  currency,
  reviewAverage,
  reviewCount,
  promo,
}: {
  href: string
  title: string
  imageUrl: string | null
  excerpt: string
  priceCents: number | null
  salePriceCents: number | null
  currency: string | null
  reviewAverage: number
  reviewCount: number
  promo: boolean
}) {
  return (
    <div className="tile tile--rich wcat__tile">
      <a className="tile__stretch" href={href} aria-label={title} />
      <div className="tile__media">
        {priceCents != null && (
          <span className="tile__price-badge">
            {promo && salePriceCents != null ? (
              <>
                <span className="tile__price-now">{formatPrice(salePriceCents, currency)}</span>
                <s className="tile__price-was">{formatPrice(priceCents, currency)}</s>
              </>
            ) : (
              <span className="tile__price-now">{formatPrice(priceCents, currency)}</span>
            )}
          </span>
        )}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="ph">
            <ShoppingBag className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="tile__body">
        <div className="tile__head">
          <h3 className="tile__title">{title}</h3>
        </div>
        {excerpt && (
          <div className="tile__detail">
            <p className="tile__detail-text">{excerpt}</p>
          </div>
        )}
        <Stars average={reviewAverage} count={reviewCount} />
      </div>
    </div>
  )
}

function NewsCarousel({ items, webBaseUrl }: { items: { title: string; slug: string; publishedAt: string; imageUrl: string | null }[]; webBaseUrl: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const { canPrev, canNext, scrollPrev, scrollNext } = useTrackNav(trackRef, '.nwidget__card')

  return (
    <section className="nwidget nwidget--embedded">
      <div className="nwidget__carousel" style={{ position: 'relative' }}>
        <div className="nwidget__track" ref={trackRef}>
          {items.map((n) => (
            <a
              key={n.slug}
              href={n.slug ? `${webBaseUrl}/news/${n.slug}` : `${webBaseUrl}#news`}
              className="nwidget__card"
            >
              <div className="nwidget__media" aria-hidden="true">
                {n.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.imageUrl} alt="" className="nwidget__img" loading="lazy" />
                )}
                <span className="nwidget__badge">News</span>
              </div>
              <div className="nwidget__body">
                <h3 className="nwidget__name">{n.title}</h3>
                <p className="nwidget__meta">{relativeDate(n.publishedAt)}</p>
              </div>
            </a>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <button type="button" className="nwidget__nav nwidget__nav--prev" disabled={!canPrev} onClick={scrollPrev} aria-label="Précédent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="nwidget__nav nwidget__nav--next" disabled={!canNext} onClick={scrollNext} aria-label="Suivant">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}

export function WidgetBodyDisplay({ widget, data, webBaseUrl, onConfigure, onOpenFaq, onOpenAddContent, readOnly = false }: Props) {
  const ctx = {
    products: data.shopProducts,
    appointmentTypes: data.playlistServices,
    events: data.playlistEvents,
    publications: data.publications,
    faqItems: data.faqItems,
    contactInfo: data.contactInfo,
  }
  const config = normalizeWidgetConfig(widget.config)
  const configured = isWidgetConfigured(widget.type, config)
  const filled = widgetHasDisplayContent(widget, ctx)

  if (!filled) {
    const empty = widgetEmptyContent(widget.type, 'unconfigured', { widgetId: widget.id })
    return (
      <div className="widget-empty">
        <p className="widget-empty__msg">{readOnly ? empty.visitorMessage : empty.ownerMessage}</p>
        {!readOnly && empty.ctaAction === 'data-open-home-widget-config' && (
          <button type="button" className="widget-empty__cta" onClick={() => onConfigure(widget.id)}>
            {empty.ctaLabel}
          </button>
        )}
        {!readOnly && empty.ctaAction === 'data-open-faq-overlay' && onOpenFaq && (
          <button type="button" className="widget-empty__cta" onClick={onOpenFaq}>
            {empty.ctaLabel}
          </button>
        )}
        {!readOnly && empty.ctaAction === 'data-open-publication-overlay' && onOpenAddContent && (
          <button type="button" className="widget-empty__cta" onClick={onOpenAddContent}>
            {empty.ctaLabel}
          </button>
        )}
      </div>
    )
  }

  if (!configured) return null

  if (widget.type === 'widget_shop') {
    const cfg = parseShopConfig(config)!
    if (cfg.mode === 'product') {
      const p = data.shopProducts.find((x) => x.id === cfg.product_id)
      if (!p) return null
      const promo = saleActive(p.sale_price_cents, p.sale_ends_at)
      return (
        <WidgetFeaturedCard
          href={p.slug ? `${webBaseUrl}/shop/${p.slug}` : `${webBaseUrl}#shop`}
          imageUrl={p.image_url}
          placeholder={<ShoppingBag className="h-10 w-10" />}
          badgeLabel="Shop"
          title={p.title}
          tags={[p.type === 'digital' ? 'Numérique' : 'Physique']}
          priceLabel={formatPrice(promo ? p.sale_price_cents : p.price_cents, p.currency)}
          oldPriceLabel={promo ? formatPrice(p.price_cents, p.currency) : null}
          promo={promo}
          ctaLabel="Voir"
        />
      )
    }
    const cat = data.productCategories.find((c) => c.id === cfg.category_id)
    const items = data.shopProducts.filter((p) => p.category_id === cfg.category_id).slice(0, cfg.limit ?? 6)
    return (
      <CategoryCarousel title={cat?.name ?? 'Catégorie'} moreHref={`${webBaseUrl}#shop`} showNav={items.length > 1}>
        {items.map((p) => {
          const promo = saleActive(p.sale_price_cents, p.sale_ends_at)
          return (
            <ShopTile
              key={p.id}
              href={p.slug ? `${webBaseUrl}/shop/${p.slug}` : `${webBaseUrl}#shop`}
              title={p.title}
              imageUrl={p.image_url}
              excerpt={p.detailExcerpt ?? ''}
              priceCents={p.price_cents}
              salePriceCents={promo ? p.sale_price_cents : null}
              currency={p.currency}
              reviewAverage={p.reviewAverage}
              reviewCount={p.reviewCount}
              promo={promo}
            />
          )
        })}
      </CategoryCarousel>
    )
  }

  if (widget.type === 'widget_service') {
    const cfg = parseServiceConfig(config)!
    const loc: Record<string, string> = { video: 'Visio', in_person: 'Sur place', phone: 'Téléphone' }
    if (cfg.mode === 'service') {
      const s = data.playlistServices.find((x) => x.id === cfg.appointment_type_id)
      if (!s) return null
      const promo = s.promo_price_cents != null && s.price_cents != null && s.promo_price_cents > 0
      return (
        <WidgetFeaturedCard
          href={s.slug ? `${webBaseUrl}/services/${s.slug}` : `${webBaseUrl}#appointments`}
          imageUrl={s.image_url}
          placeholder={<CalendarClock className="h-10 w-10" />}
          badgeLabel="Service"
          title={s.title}
          tags={[`${s.duration_minutes} min`, loc[s.location_type] ?? 'Visio']}
          priceLabel={formatPrice(promo ? s.promo_price_cents : s.price_cents, s.currency)}
          oldPriceLabel={promo ? formatPrice(s.price_cents, s.currency) : null}
          promo={promo}
          ctaLabel="Réserver"
        />
      )
    }
    const items = data.playlistServices.slice(0, cfg.limit ?? 6)
    return (
      <CategoryCarousel title="Services" moreHref={`${webBaseUrl}#appointments`} showNav={items.length > 1}>
        {items.map((s) => {
          const promo = s.promo_price_cents != null && s.price_cents != null
          return (
            <ShopTile
              key={s.id}
              href={s.slug ? `${webBaseUrl}/services/${s.slug}` : `${webBaseUrl}#appointments`}
              title={s.title}
              imageUrl={s.image_url}
              excerpt={s.detailExcerpt ?? ''}
              priceCents={s.price_cents}
              salePriceCents={promo ? s.promo_price_cents : null}
              currency={s.currency}
              reviewAverage={s.reviewAverage}
              reviewCount={s.reviewCount}
              promo={!!promo}
            />
          )
        })}
      </CategoryCarousel>
    )
  }

  if (widget.type === 'widget_event') {
    const cfg = parseEventConfig(config)!
    if (cfg.mode === 'featured') {
      const ev = data.playlistEvents.find((x) => x.id === cfg.event_id)
      if (!ev) return null
      const start = new Date(ev.start_at)
      const tag = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(start)
      return (
        <WidgetFeaturedCard
          href={ev.slug ? `${webBaseUrl}/events/${ev.slug}` : `${webBaseUrl}#events`}
          imageUrl={ev.image_url}
          placeholder={<Zap className="h-10 w-10" />}
          badgeLabel="Event"
          title={ev.title}
          tags={[tag]}
          priceLabel={formatPrice(ev.price_cents, ev.currency)}
          ctaLabel="Participer"
        />
      )
    }
    const items = data.playlistEvents.slice(0, cfg.limit ?? 6)
    return (
      <CategoryCarousel title="Events" moreHref={`${webBaseUrl}#events`} showNav={items.length > 1}>
        {items.map((ev) => {
          const start = new Date(ev.start_at)
          const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(start)
          const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start).replace('.', '')
          return (
            <div key={ev.id} className="tile tile--rich wcat__tile">
              <a
                className="tile__stretch"
                href={ev.slug ? `${webBaseUrl}/events/${ev.slug}` : `${webBaseUrl}#events`}
                aria-label={ev.title}
              />
              <div className="tile__media">
                <span className="tile__date-badge">
                  <span className="tile__date-day">{day}</span>
                  <span className="tile__date-month">{month}</span>
                </span>
                {ev.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.image_url} alt="" loading="lazy" />
                ) : (
                  <div className="ph">
                    <Zap className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="tile__body">
                <h3 className="tile__title">{ev.title}</h3>
                {ev.detailExcerpt && <p className="tile__detail-text">{ev.detailExcerpt}</p>}
              </div>
            </div>
          )
        })}
      </CategoryCarousel>
    )
  }

  if (widget.type === 'widget_news') {
    parseNewsConfig(config)
    const latest = [...data.publications]
      .filter((p) => p.published_at)
      .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())
      .slice(0, 3)
    const newsItems = latest.map((pub) => {
      const media = [...(pub.publication_media ?? [])].sort((a, b) => a.position - b.position)
      return {
        title: pub.title,
        slug: pub.slug,
        publishedAt: pub.published_at!,
        imageUrl: media[0]?.url ?? null,
      }
    })
    return <NewsCarousel items={newsItems} webBaseUrl={webBaseUrl} />
  }

  if (widget.type === 'widget_faq') {
    parseFaqConfig(config)
    return (
      <section className="faq-widget faq-widget--embedded">
        <div className="faq-widget__list">
          {data.faqItems.map((item, i) => (
            <details key={i} className="faq">
              <summary>
                {item.question}
                <ChevronDown className="h-4 w-4 shrink-0" />
              </summary>
              <p className="whitespace-pre-wrap">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    )
  }

  if (widget.type === 'widget_bio') {
    parseBioConfig(config)
    const ci = data.contactInfo
    const email = ci.contact_email?.trim() || null
    const phone = ci.contact_phone?.trim() || null
    const showEmail = ci.contact_email_public && !!email
    const showPhone = ci.contact_phone_public && !!phone
    const showMessage = ci.message_enabled
    const messageHref = showMessage ? `${webBaseUrl}/message` : null
    const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const today = new Date().getDay()

    return (
      <div className="bio-widget">
        {ci.opening_hours_enabled && ci.opening_hours.length > 0 && (
          <section className="bio-widget__mini">
            <header className="bio-widget__mini-head">
              <Clock className="h-4 w-4" />
              <h4 className="bio-widget__mini-title">Horaires</h4>
            </header>
            <ul className="bio-widget__hours">
              {ci.opening_hours.map((slot) => (
                <li
                  key={slot.day_of_week}
                  className={`bio-widget__hours-row${slot.day_of_week === today ? ' is-today' : ''}${slot.closed ? ' is-closed' : ''}`}
                >
                  <span className="bio-widget__day">{DAY_LABELS[slot.day_of_week]}</span>
                  <span className="bio-widget__time">
                    {slot.closed
                      ? 'Fermé'
                      : slot.start_time && slot.end_time
                        ? `${slot.start_time.slice(0, 5).replace(':', 'h')} – ${slot.end_time.slice(0, 5).replace(':', 'h')}`
                        : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(showEmail || showPhone || showMessage) && (
          <div className={`bio-widget__contacts${[showEmail, showPhone, showMessage].filter(Boolean).length === 2 ? ' bio-widget__contacts--two' : ''}`}>
            {showEmail && email && (
              <a href={`mailto:${email}`} className="bio-widget__action">
                <Mail className="h-5 w-5 shrink-0" />
                <span>
                  <span className="bio-widget__action-label">Email</span>
                  <span className="bio-widget__action-value">{email}</span>
                </span>
              </a>
            )}
            {showPhone && phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="bio-widget__action">
                <Phone className="h-5 w-5 shrink-0" />
                <span>
                  <span className="bio-widget__action-label">Téléphone</span>
                  <span className="bio-widget__action-value">{phone}</span>
                </span>
              </a>
            )}
            {showMessage && messageHref && (
              <a href={messageHref} className="bio-widget__action bio-widget__action--primary">
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span>
                  <span className="bio-widget__action-label">Message</span>
                  <span className="bio-widget__action-value">Nous écrire</span>
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  if (widget.type === 'widget_announcement') {
    const cfg = parseAnnouncementConfig(config)!
    const images = cfg.images ?? []
    if (images.length === 0) return null
    const count = Math.min(images.length, 3)
    return (
      <div className="banner-welcome">
        <div className={`banner-welcome__gallery banner-welcome__gallery--count-${count}`}>
          {images.slice(0, 3).map((img, index) => (
            <div
              key={index}
              className="banner-welcome__media"
              style={{ '--banner-aspect': String(images.length === 1 ? img.aspect_ratio : 1) } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={index === 0 && cfg.title ? cfg.title : ''} className="banner-welcome__img" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
