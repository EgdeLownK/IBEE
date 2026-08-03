'use client'

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Handshake,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHorizontalCarousel } from '@ibee/ui-react'
import type { DetailContentBlock } from '@/lib/entity-content-blocks'
import { formatDetailPrice } from '@/lib/detail-format'
import { isProductScheduled, msUntilScheduled } from '@/lib/product-schedule'
import type {
  PublicProductData,
  PublishedProduct,
  PublishedProductVariant,
} from '@/lib/load-public-product'
import { EntityMoreDetails } from './EntityMoreDetails'
import { NewsWidget } from './NewsWidget'
import { embedProfileHref } from '@/lib/embed-public-urls'

import type { ReactNode } from 'react'

type CustomDetail = PublicProductData['customDetails'][number]

type Props = {
  product: PublishedProduct
  categoryName?: string | null
  bulletPoints?: string[]
  contentBlocks?: DetailContentBlock[]
  saleActive?: boolean
  customDetails?: CustomDetail[]
  aggregates?: { count: number; average: number } | null
  entitySlug?: string
  hasNews?: boolean
  newsItems?: PublicProductData['newsItems']
  embedMode?: boolean | 'dashboard'
  buyBoxSlot?: ReactNode
  onCheckoutStateChange?: (state: {
    priceText: string | null
    variantId: string | null
    canBuy: boolean
    isScheduled?: boolean
  }) => void
}

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  epub: 'EPUB',
  mp4: 'MP4',
  mp3: 'MP3',
  zip: 'ZIP',
  other: 'Fichier',
}

const LICENSE_LABELS: Record<string, string> = {
  personal: 'Licence personnelle',
  professional: 'Licence professionnelle',
  commercial: 'Licence commerciale',
}

function starRow(n: number) {
  return Array.from({ length: 5 }, (_, i) => i < n)
}

function buildDetailCategories(product: PublishedProduct, customDetails: CustomDetail[]) {
  const categories: { title: string; rows: { label: string; value: string }[] }[] = []

  const nativeRows: { label: string; value: string }[] = []
  if (product.type === 'digital') {
    if (product.digital_file_format) {
      nativeRows.push({
        label: 'Format',
        value: FORMAT_LABELS[product.digital_file_format] ?? product.digital_file_format,
      })
    }
    if (product.digital_license) {
      nativeRows.push({
        label: 'Licence',
        value: LICENSE_LABELS[product.digital_license] ?? product.digital_license,
      })
    }
    if (product.digital_language) {
      nativeRows.push({ label: 'Langue', value: product.digital_language.toUpperCase() })
    }
    if (product.digital_pages_or_duration != null) {
      nativeRows.push({
        label:
          product.digital_file_format === 'mp4' || product.digital_file_format === 'mp3'
            ? 'Durée'
            : 'Pages',
        value: String(product.digital_pages_or_duration),
      })
    }
  }

  if (nativeRows.length > 0) {
    categories.push({ title: 'Général', rows: nativeRows })
  }

  const grouped = new Map<string, { label: string; value: string }[]>()
  const uncategorized: { label: string; value: string }[] = []

  for (const d of customDetails) {
    if (d.family) {
      const g = grouped.get(d.family) ?? []
      g.push({ label: d.label, value: d.value })
      grouped.set(d.family, g)
    } else {
      uncategorized.push({ label: d.label, value: d.value })
    }
  }

  if (uncategorized.length > 0) {
    categories.push({ title: 'Caractéristiques', rows: uncategorized })
  }

  for (const [title, rows] of grouped.entries()) {
    categories.push({ title, rows })
  }

  return categories
}

function computeStock(
  product: PublishedProduct,
  variants: PublishedProductVariant[],
  selectedVariantId: string | null,
) {
  const activeVariants = (variants ?? []).filter((v) => v.is_active)
  if (selectedVariantId) {
    const v = activeVariants.find((x) => x.id === selectedVariantId)
    return (v?.stock_quantity ?? 0) > 0
  }
  if (activeVariants.length > 0) {
    return activeVariants.some((v) => v.stock_quantity > 0)
  }
  if (product.type === 'digital') {
    if (product.digital_stock_unlimited !== false) return true
    return (product.digital_stock_quantity ?? 0) > 0
  }
  return !!product.physical_stock_unlimited || (product.physical_stock_quantity ?? 0) > 0
}

export function ProductDetail({
  product,
  categoryName,
  bulletPoints = [],
  contentBlocks = [],
  saleActive = false,
  customDetails = [],
  aggregates = null,
  entitySlug = '',
  hasNews = false,
  newsItems = [],
  embedMode = false,
  buyBoxSlot,
  onCheckoutStateChange,
}: Props) {
  const variants = ((product.product_variants ?? []) as PublishedProductVariant[]).filter(
    (v) => v.is_active,
  )
  const allMedia = [...(product.product_media ?? [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  )
  const images = allMedia.filter((m) => !m.media_type || m.media_type === 'image')
  const video = allMedia.find((m) => m.media_type === 'video') ?? null
  const galleryMedia = [...images, ...(video ? [video] : [])]

  const attrKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys((v.attributes ?? {}) as Record<string, string>))),
  )
  const attrOptions: Record<string, string[]> = {}
  for (const key of attrKeys) {
    attrOptions[key] = Array.from(
      new Set(
        variants
          .map((v) => String((v.attributes as Record<string, unknown> | null)?.[key] ?? ''))
          .filter(Boolean),
      ),
    )
  }

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    if (variants.length > 0 && variants[0].attributes) {
      const attrs = variants[0].attributes as Record<string, unknown>
      const initial: Record<string, string> = {}
      for (const k of attrKeys) {
        if (attrs[k] != null) initial[k] = String(attrs[k])
      }
      return initial
    }
    return {}
  })
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(
    12,
    'product-detail__slide',
  )

  const selectedVariant = useMemo(() => {
    const keys = Object.keys(selectedAttrs)
    if (keys.length !== attrKeys.length || attrKeys.length === 0) return null
    return (
      variants.find((v) =>
        keys.every(
          (k) => String((v.attributes as Record<string, unknown> | null)?.[k]) === selectedAttrs[k],
        ),
      ) ?? null
    )
  }, [selectedAttrs, attrKeys, variants])

  const variantPrices = variants.map((v) => v.price_cents_override ?? product.price_cents)
  const minCents = variantPrices.length > 0 ? Math.min(...variantPrices) : product.price_cents
  const showSalePrice = saleActive && product.sale_price_cents != null && !selectedVariant
  const displayPriceCents = selectedVariant
    ? (selectedVariant.price_cents_override ?? product.price_cents)
    : showSalePrice
      ? product.sale_price_cents!
      : minCents

  const inStock = computeStock(product, variants, selectedVariant?.id ?? null)
  const reviewCount = aggregates?.count ?? 0
  const reviewAverage = aggregates?.average ?? 0
  const detailCategories = buildDetailCategories(product, customDetails)

  const needsVariant = variants.length > 0
  // Date.now() ne doit jamais être appelé pendant le render (react-hooks/purity) :
  // l'état est initialisé une fois au mount, puis corrigé par un timer si la date
  // de publication passe pendant que la page reste ouverte (voir product-schedule.ts).
  const [isScheduled, setIsScheduled] = useState(() =>
    isProductScheduled(product.published_at, Date.now()),
  )
  const canBuy = inStock && (!needsVariant || selectedVariant != null) && !isScheduled

  useEffect(() => {
    const delay = msUntilScheduled(product.published_at, Date.now())
    if (delay == null) return
    const timer = setTimeout(() => setIsScheduled(false), delay)
    return () => clearTimeout(timer)
  }, [product.published_at])

  useEffect(() => {
    onCheckoutStateChange?.({
      priceText: formatDetailPrice(displayPriceCents, product.currency),
      variantId: selectedVariant?.id ?? null,
      canBuy,
      isScheduled,
    })
  }, [
    canBuy,
    isScheduled,
    displayPriceCents,
    onCheckoutStateChange,
    product.currency,
    selectedVariant?.id,
  ])

  const deliveryTags =
    product.type === 'physical'
      ? [
          ...(product.in_person_enabled ? [{ label: 'Main propre', Icon: Handshake }] : []),
          ...(product.pickup_enabled ? [{ label: 'Click & Collect', Icon: Store }] : []),
          ...(product.delivery_enabled ? [{ label: 'Livraison', Icon: Truck }] : []),
        ]
      : [{ label: 'Téléchargement', Icon: Download }]

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const buyBoxContent = (
    <div className="product-detail__buybox flex flex-col gap-6">
      <div className="product-detail__stats">
        <a href="#avis" className="product-detail__stat product-detail__stat--link">
          <span className="product-detail__stat-label">
            {reviewCount > 0 ? `${reviewCount} avis` : 'Avis'}
          </span>
          <span className="product-detail__stat-value">
            {reviewCount > 0 ? reviewAverage.toFixed(1).replace('.', ',') : '—'}
          </span>
          <span className="product-detail__stat-stars">
            {starRow(Math.round(reviewAverage)).map((on, j) => (
              <Star
                key={j}
                className={`h-[11px] w-[11px] ${on ? 'fill-neutral-900 text-neutral-900' : 'text-neutral-300'}`}
                aria-hidden="true"
              />
            ))}
          </span>
        </a>
        <div className="product-detail__stat">
          <span className="product-detail__stat-label">Prix</span>
          <span
            className={`product-detail__stat-value product-detail__stat-value--sm product-detail__stat-price${showSalePrice ? ' is-sale' : ''}`}
          >
            {formatDetailPrice(displayPriceCents, product.currency)}
          </span>
        </div>
        <div className="product-detail__stat">
          <span className="product-detail__stat-label">Dispo.</span>
          <span
            id="product-stock"
            className={`product-detail__stat-value product-detail__stat-value--sm product-detail__stock${inStock ? ' is-available' : ' is-unavailable'}`}
          >
            {inStock ? 'En stock' : 'Indisponible'}
          </span>
        </div>
      </div>

      {variants.length > 0 && (
        <div className="product-detail__variants" id="variant-selector">
          {attrKeys.length > 0 ? (
            attrKeys.map((key) => (
              <div key={key}>
                <p className="product-detail__variant-label">{key}</p>
                <div className="flex flex-wrap gap-2">
                  {attrOptions[key]?.map((value) => {
                    const hypAttrs = { ...selectedAttrs, [key]: value }
                    const hypVariant = variants.find((v) =>
                      Object.keys(hypAttrs).every(
                        (k) =>
                          String((v.attributes as Record<string, unknown> | null)?.[k]) ===
                          hypAttrs[k],
                      ),
                    )
                    const isAvailable = hypVariant
                      ? computeStock(product, variants, hypVariant.id)
                      : false

                    return (
                      <button
                        key={value}
                        type="button"
                        data-selected={selectedAttrs[key] === value ? 'true' : 'false'}
                        data-available={isAvailable ? 'true' : 'false'}
                        className="product-detail__variant-btn"
                        onClick={() => setSelectedAttrs((prev) => ({ ...prev, [key]: value }))}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500 italic">Variantes configurées sans attributs.</p>
          )}
        </div>
      )}

      {deliveryTags.length > 0 && (
        <div className="product-detail__delivery">
          <p className="product-detail__variant-label mb-2">Type de remise</p>
          <div className="product-detail__delivery-tags">
            {deliveryTags.map(({ label, Icon }) => (
              <span key={label} className="product-detail__delivery-tag">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {buyBoxSlot}
    </div>
  )

  return (
    <div className="product-detail">
      <div className="product-detail__main flex flex-col min-w-0">
        <div className="product-detail__media">
          <div ref={trackRef} className="product-detail__carousel gallery-strip">
            {galleryMedia.length > 0 ? (
              galleryMedia.map((m, i) => (
                <div key={m.id ?? i} className="product-detail__slide carousel-slide">
                  {m.media_type === 'video' ? (
                    <video
                      src={m.url}
                      controls
                      preload="metadata"
                      playsInline
                      className="h-full w-full bg-black object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt={m.alt_text ?? product.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="product-detail__slide carousel-slide">
                <div
                  className="ph flex h-full w-full items-center justify-center"
                  aria-hidden="true"
                >
                  <ShoppingBag className="h-14 w-14 text-neutral-400" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
          {galleryMedia.length > 1 && (
            <>
              <button
                type="button"
                className="product-detail__nav product-detail__nav--prev"
                aria-label="Image précédente"
                disabled={!canPrev}
                onClick={scrollPrev}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="product-detail__nav product-detail__nav--next"
                aria-label="Image suivante"
                disabled={!canNext}
                onClick={scrollNext}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className="product-detail__header mt-8 px-[22px]">
          <h1 className="text-[28px] font-bold text-neutral-900 font-display leading-tight">
            {product.title}
          </h1>
          {categoryName && (
            <p className="text-[15px] text-neutral-500 mt-2 font-sans">{categoryName}</p>
          )}
        </div>

        <div className="lg:hidden mt-6 px-[22px]">{buyBoxContent}</div>

        {detailCategories.length > 0 && (
          <div className="product-detail__buybox-card">
            <div id="tous-les-details" className="product-detail__buybox-info scroll-mt-20">
              <h3 className="product-detail__info-title">Information</h3>
              <div className="product-detail__info-menus">
                {detailCategories.map((cat, catIndex) => (
                  <details
                    key={catIndex}
                    className="product-detail__tech-menu"
                    open={catIndex === 0}
                  >
                    <summary>
                      <span>{cat.title}</span>
                      <span className="product-detail__tech-chevron" aria-hidden="true">
                        <ChevronRight className="h-[18px] w-[18px]" />
                      </span>
                    </summary>
                    <div className="product-detail__tech-panel">
                      {cat.rows.map((row, i) => (
                        <div key={i} className="product-detail__tech-line">
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        )}

        <EntityMoreDetails
          entityKind="product"
          contentBlocks={contentBlocks}
          bulletPoints={bulletPoints}
          fallbackText={product.description_long}
        />
        {hasNews && entitySlug && (
          <NewsWidget
            entitySlug={entitySlug}
            items={newsItems}
            profileBaseHref={embedMode ? embedProfileHref(entitySlug) : undefined}
          />
        )}
      </div>

      {mounted && document.getElementById('buybox-portal')
        ? createPortal(buyBoxContent, document.getElementById('buybox-portal')!)
        : null}
    </div>
  )
}
