'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { CalendarDays, MapPin, MoreVertical, Pencil, Star, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEventAction } from '@/app/dashboard/site/event-actions'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import { PublicationFeedCard, type FeedPublication } from './publications/PublicationFeedCard'
import { PublicPublicationCard } from '@/components/public/PublicPublicationCard'
import { PlaylistSectionToolbar } from './PlaylistSectionToolbar'
import { usePlaylistSectionFilter } from './usePlaylistSectionFilter'

type Props = Pick<
  ProfileStudioData,
  | 'homeWidgets'
  | 'shopProducts'
  | 'playlistServices'
  | 'playlistEvents'
  | 'publications'
  | 'historyBlocks'
  | 'faqItems'
> & {
  productCategories: { id: string; name: string }[]
  activeType: string
  entitySlug: string
  entityDisplayName: string
  entityAvatarUrl: string | null
  webBaseUrl: string
  detailBaseUrl?: string
  dashboardBaseUrl?: string
  onEditHistory?: () => void
  onPublicationUpdated?: (pub: FeedPublication) => void
  onPublicationDeleted?: (id: string) => void
  onEventDeleted?: (id: string) => void
  readOnly?: boolean
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function eventDateChip(value: string) {
  const date = new Date(value)
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
    time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date),
  }
}

function eventLocationLabel(
  locationType: 'online' | 'in_person' | null | undefined,
  locationDetails: string | null | undefined
) {
  if (locationType === 'in_person') return locationDetails?.trim() || 'Sur place'
  if (locationType === 'online') return 'En ligne'
  return locationDetails?.trim() || null
}

function formatPrice(cents: number | null | undefined, currency: string | null | undefined) {
  if (cents == null) return null
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency ?? 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function Stars({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return <span className="text-[11px] text-neutral-400">Pas encore d&apos;avis</span>
  }
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i <= Math.round(average) ? 'fill-amber text-amber' : 'text-neutral-200'}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-neutral-800">{average.toFixed(1)}</span>
      <span className="text-[11px] text-neutral-500">({count})</span>
    </div>
  )
}

function ProductTile({
  href,
  editHref,
  title,
  detailExcerpt,
  imageUrl,
  priceCents,
  salePriceCents,
  currency,
  reviewAverage,
  reviewCount,
  meta,
}: {
  href: string | null
  editHref?: string | null
  title: string
  detailExcerpt: string
  imageUrl: string | null
  priceCents?: number | null
  salePriceCents?: number | null
  currency?: string | null
  reviewAverage?: number
  reviewCount?: number
  meta?: ReactNode
}) {
  const price =
    priceCents != null || salePriceCents != null
      ? formatPrice(salePriceCents ?? priceCents ?? null, currency ?? 'EUR')
      : null
  const was = salePriceCents != null ? formatPrice(priceCents ?? null, currency ?? 'EUR') : null
  const showReviews = reviewAverage != null && reviewCount != null

  return (
    <article className="tile tile--rich">
      {href && <Link className="tile__stretch" href={href} aria-label={title} />}
      <div className="tile__media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" />
        ) : null}
      </div>
      <div className="tile__body">
        <h3 className="tile__title m-0">{title}</h3>
        {meta}
        {price && (
          <p className="m-0 mt-1 text-sm font-semibold text-neutral-900">
            {price}
            {was && <span className="ml-1.5 text-xs font-normal text-neutral-400 line-through">{was}</span>}
          </p>
        )}
        {detailExcerpt && <p className="tile__detail-text">{detailExcerpt}</p>}
        {showReviews && <Stars average={reviewAverage} count={reviewCount} />}
      </div>
      {editHref && (
        <div className="tile__edit-wrap">
          <a href={editHref} className="tile__edit" onClick={(e) => e.stopPropagation()}>
            Modifier
          </a>
        </div>
      )}
    </article>
  )
}

function EventListRow({
  href,
  editHref,
  onDelete,
  title,
  detailExcerpt,
  imageUrl,
  startAt,
  locationLabel,
  priceCents,
  currency,
  capacity,
  registrationsCount,
}: {
  href: string | null
  editHref?: string | null
  onDelete?: () => void
  title: string
  detailExcerpt: string
  imageUrl: string | null
  startAt: string
  locationLabel: string | null
  priceCents?: number | null
  currency?: string | null
  capacity?: number | null
  registrationsCount?: number | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const showAdmin = Boolean(editHref || onDelete)
  const chip = eventDateChip(startAt)
  const price = formatPrice(priceCents ?? null, currency ?? 'EUR')
  const hasCapacity = capacity != null
  const remaining = hasCapacity ? Math.max(0, capacity - (registrationsCount ?? 0)) : null
  const isFull = remaining != null && remaining <= 0
  const ctaLabel = isFull ? "Liste d'attente" : 'Ouvrir'

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  return (
    <article className={`event-row${isFull ? ' event-row--full' : ''}`}>
      {href && <Link className="event-row__stretch" href={href} aria-label={title} />}
      {showAdmin && (
        <div className={`event-row__admin${menuOpen ? ' is-open' : ''}`} ref={menuRef}>
          <button
            type="button"
            className="event-row__menu-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Options pour ${title}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="widget-menu" role="menu">
              {editHref && (
                <a
                  href={editHref}
                  className="widget-menu__item"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span>Modifier</span>
                </a>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="widget-menu__item widget-menu__item--danger"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete()
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="event-row__date" aria-hidden="true">
        <span className="event-row__date-day">{chip.day}</span>
        <span className="event-row__date-month">{chip.month}</span>
      </div>
      <div className="event-row__media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" />
        ) : (
          <CalendarDays className="event-row__media-icon" aria-hidden="true" />
        )}
      </div>
      <div className="event-row__body">
        <h3 className="event-row__title">{title}</h3>
        <ul className="event-row__meta">
          <li>
            <CalendarDays className="event-row__meta-icon" aria-hidden="true" />
            <span>{formatDate(startAt)}</span>
          </li>
          {locationLabel && (
            <li>
              <MapPin className="event-row__meta-icon" aria-hidden="true" />
              <span>{locationLabel}</span>
            </li>
          )}
          {hasCapacity && (
            <li>
              <Users className="event-row__meta-icon" aria-hidden="true" />
              <span>
                {isFull
                  ? 'Complet'
                  : `${remaining} place${remaining! > 1 ? 's' : ''} restante${remaining! > 1 ? 's' : ''}`}
              </span>
            </li>
          )}
        </ul>
        {detailExcerpt && <p className="event-row__excerpt">{detailExcerpt}</p>}
        <div className="event-row__footer">
          <div className="event-row__footer-start">
            {price && <p className="event-row__price">{price}</p>}
          </div>
          <div className="event-row__footer-actions">
            {isFull && <span className="event-row__badge">Complet</span>}
            {href && (
              <Link className="event-row__cta" href={href}>
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export function ProfileStudioSections({
  activeType,
  homeWidgets,
  shopProducts,
  playlistServices,
  playlistEvents,
  publications,
  historyBlocks,
  faqItems,
  productCategories,
  entitySlug,
  entityDisplayName,
  entityAvatarUrl,
  webBaseUrl,
  detailBaseUrl,
  dashboardBaseUrl = '',
  onEditHistory,
  onPublicationUpdated,
  onPublicationDeleted,
  onEventDeleted,
  readOnly = false,
}: Props) {
  const detailBase = detailBaseUrl ?? webBaseUrl
  const [eventDeletePending, startEventDelete] = useTransition()
  const shopCategoryOptions = useMemo(
    () =>
      productCategories
        .filter((c) => shopProducts.some((p) => p.category_id === c.id))
        .map((c) => ({ id: c.id, label: c.name })),
    [productCategories, shopProducts]
  )
  const shopFilter = usePlaylistSectionFilter({
    items: shopProducts,
    categories: shopCategoryOptions,
    getCategoryId: (p) => p.category_id,
    getSearchText: (p) => `${p.title} ${p.detailExcerpt}`,
  })
  const serviceFilter = usePlaylistSectionFilter({
    items: playlistServices,
    categories: [],
    getCategoryId: () => null,
    getSearchText: (s) => `${s.title} ${s.detailExcerpt}`,
  })
  const sortedPlaylistEvents = useMemo(
    () =>
      [...playlistEvents].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      ),
    [playlistEvents]
  )
  const eventFilter = usePlaylistSectionFilter({
    items: sortedPlaylistEvents,
    categories: [],
    getCategoryId: () => null,
    getSearchText: (ev) => `${ev.title} ${ev.detailExcerpt}`,
  })

  function handleDeleteEvent(event: { id: string; title: string }) {
    if (eventDeletePending) return
    if (!confirm(`Supprimer l'événement « ${event.title} » ?`)) return
    startEventDelete(async () => {
      const result = await deleteEventAction(event.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Événement supprimé')
      onEventDeleted?.(event.id)
    })
  }

  if (activeType === 'home') {
    return null
  }

  if (activeType === 'shop') {
    if (shopProducts.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucun produit pour le moment.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        <PlaylistSectionToolbar
          categories={shopFilter.playlistCategories}
          searchPlaceholder="Rechercher un produit…"
          query={shopFilter.query}
          onQueryChange={shopFilter.setQuery}
          activeCategory={shopFilter.activeCategory}
          onCategoryChange={shopFilter.setActiveCategory}
        />
        {shopFilter.filteredItems.length === 0 ? (
          <p className="m-0 mt-4 text-sm text-neutral-500">Aucun produit ne correspond à votre recherche.</p>
        ) : (
          <div className="grid-tiles playlist-section__grid">
            {shopFilter.filteredItems.map((p) => (
              <ProductTile
                key={p.id}
                href={p.slug ? `${detailBase}/shop/${p.slug}` : null}
                editHref={dashboardBaseUrl ? `${dashboardBaseUrl}/products/${p.id}` : undefined}
                title={p.title}
                detailExcerpt={p.detailExcerpt}
                imageUrl={p.image_url}
                priceCents={p.price_cents}
                salePriceCents={p.sale_price_cents}
                currency={p.currency}
                reviewAverage={p.reviewAverage}
                reviewCount={p.reviewCount}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeType === 'appointments') {
    if (playlistServices.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucun service pour le moment.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        <PlaylistSectionToolbar
          categories={serviceFilter.playlistCategories}
          searchPlaceholder="Rechercher un service…"
          query={serviceFilter.query}
          onQueryChange={serviceFilter.setQuery}
          activeCategory={serviceFilter.activeCategory}
          onCategoryChange={serviceFilter.setActiveCategory}
        />
        {serviceFilter.filteredItems.length === 0 ? (
          <p className="m-0 mt-4 text-sm text-neutral-500">Aucun service ne correspond à votre recherche.</p>
        ) : (
          <div className="grid-tiles playlist-section__grid">
            {serviceFilter.filteredItems.map((s) => (
              <ProductTile
                key={s.id}
                href={s.slug ? `${detailBase}/services/${s.slug}` : null}
                editHref={dashboardBaseUrl ? `${dashboardBaseUrl}/services/${s.id}` : undefined}
                title={s.title}
                detailExcerpt={s.detailExcerpt}
                imageUrl={s.image_url}
                priceCents={s.promo_price_cents ?? s.price_cents}
                salePriceCents={s.promo_price_cents != null ? s.price_cents : null}
                currency={s.currency}
                reviewAverage={s.reviewAverage}
                reviewCount={s.reviewCount}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeType === 'events') {
    if (sortedPlaylistEvents.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucun événement à venir.</p>
        </div>
      )
    }
    return (
      <div className="profile-section">
        <PlaylistSectionToolbar
          categories={eventFilter.playlistCategories}
          searchPlaceholder="Rechercher un événement…"
          query={eventFilter.query}
          onQueryChange={eventFilter.setQuery}
          activeCategory={eventFilter.activeCategory}
          onCategoryChange={eventFilter.setActiveCategory}
        />
        {eventFilter.filteredItems.length === 0 ? (
          <p className="m-0 mt-4 text-sm text-neutral-500">Aucun événement ne correspond à votre recherche.</p>
        ) : (
          <div className="event-list">
            {eventFilter.filteredItems.map((ev) => (
              <EventListRow
                key={ev.id}
                href={ev.slug ? `${detailBase}/events/${ev.slug}` : null}
                editHref={!readOnly && dashboardBaseUrl ? `${dashboardBaseUrl}/events/${ev.id}` : undefined}
                onDelete={
                  !readOnly && dashboardBaseUrl
                    ? () => handleDeleteEvent({ id: ev.id, title: ev.title })
                    : undefined
                }
                title={ev.title}
                detailExcerpt={ev.detailExcerpt}
                imageUrl={ev.image_url}
                startAt={ev.start_at}
                locationLabel={eventLocationLabel(ev.location_type, ev.location_details)}
                priceCents={ev.price_cents}
                currency={ev.currency}
                capacity={ev.capacity}
                registrationsCount={ev.registrations_count}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeType === 'news') {
    if (publications.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucune publication pour le moment.</p>
        </div>
      )
    }
    return (
      <div className="profile-section profile-section--news">
        {publications.map((pub) =>
          readOnly ? (
            <PublicPublicationCard
              key={pub.id}
              publication={pub}
              entitySlug={entitySlug}
              entityDisplayName={entityDisplayName}
              entityAvatarUrl={entityAvatarUrl}
            />
          ) : (
            <PublicationFeedCard
              key={pub.id}
              publication={pub as FeedPublication}
              entitySlug={entitySlug}
              entityDisplayName={entityDisplayName}
              entityAvatarUrl={entityAvatarUrl}
              webBaseUrl={webBaseUrl}
              onUpdated={(updated) => onPublicationUpdated?.(updated)}
              onDeleted={(id) => onPublicationDeleted?.(id)}
            />
          )
        )}
      </div>
    )
  }

  if (activeType === 'history') {
    if (historyBlocks.length === 0) {
      return (
        <div className="profile-section">
          <p className="m-0 text-sm text-neutral-500">Aucune histoire pour le moment.</p>
          {onEditHistory && (
            <div className="profile-section__owner-edit">
              <button type="button" className="profile-section__edit-btn" onClick={onEditHistory}>
                Ajouter votre histoire
              </button>
            </div>
          )}
        </div>
      )
    }
    return (
      <div className="profile-section">
        <div className="widget-stack">
          {historyBlocks.map((block, i) => {
            if (block.type === 'text') {
              return (
                <article key={i} className="widget widget--filled">
                  <p className="m-0 text-sm leading-relaxed text-neutral-600 whitespace-pre-wrap">{block.content}</p>
                </article>
              )
            }
            if (block.type === 'list') {
              return (
                <article key={i} className="widget widget--filled">
                  <ul className="m-0 text-sm leading-relaxed text-neutral-600 list-disc pl-5 space-y-1">
                    {block.items.map((item, j) => (
                      <li key={j} className="pl-1">{item}</li>
                    ))}
                  </ul>
                </article>
              )
            }
            if (block.type === 'image') {
              const imgs = block.images ?? []
              const slots = block.slot_count ?? imgs.length
              return (
                <article key={i} className="widget widget--filled">
                  <div
                    className={`history-preview__row history-preview__row--${slots === 1 ? 'landscape' : 'square'}${slots === 3 ? ' history-preview__row--triple' : ''}`}
                  >
                    {imgs.map((img, j) => (
                      <div
                        key={j}
                        className={`history-preview__slot history-preview__slot--${slots === 1 ? 'landscape' : 'square'}`}
                        style={
                          slots === 1
                            ? ({ '--banner-aspect': String(img.aspect_ratio) } as CSSProperties)
                            : undefined
                        }
                      >
                        <img src={img.url} alt="" />
                      </div>
                    ))}
                  </div>
                </article>
              )
            }
            return null
          })}
        </div>
      </div>
    )
  }

  if (activeType === 'faq' && faqItems.length > 0) {
    return (
      <div className="profile-section">
        <div className="widget-stack">
          {faqItems.map((item, i) => (
            <article key={i} className="widget">
              <h3 className="widget__title m-0 mb-2">{item.question}</h3>
              <p className="m-0 text-sm leading-relaxed text-neutral-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-section">
      <p className="m-0 text-sm text-neutral-500">Section non disponible.</p>
    </div>
  )
}
