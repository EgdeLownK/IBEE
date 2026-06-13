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
import { useMemo, useState } from 'react'
import { useHorizontalCarousel } from '@/hooks/useHorizontalCarousel'
import type { DetailContentBlock } from '@/lib/entity-content-blocks'
import { formatDetailPrice } from '@/lib/detail-format'
import type { PublicProductData, PublishedProduct, PublishedProductVariant } from '@/lib/load-public-product'
import { EntityMoreDetails } from './EntityMoreDetails'
import { NewsWidget } from './NewsWidget'

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

function buildDetailRows(product: PublishedProduct, customDetails: CustomDetail[]) {
  const rows: { label: string; value: string }[] = []
  if (product.type === 'digital') {
    if (product.digital_file_format) {
      rows.push({
        label: 'Format',
        value: FORMAT_LABELS[product.digital_file_format] ?? product.digital_file_format,
      })
    }
    if (product.digital_license) {
      rows.push({
        label: 'Licence',
        value: LICENSE_LABELS[product.digital_license] ?? product.digital_license,
      })
    }
    if (product.digital_language) {
      rows.push({ label: 'Langue', value: product.digital_language.toUpperCase() })
    }
    if (product.digital_pages_or_duration != null) {
      rows.push({
        label: product.digital_file_format === 'mp4' || product.digital_file_format === 'mp3' ? 'Durée' : 'Pages',
        value: String(product.digital_pages_or_duration),
      })
    }
    for (const d of customDetails) {
      rows.push({ label: d.family ?? d.label, value: d.value })
    }
  }
  return rows
}

function computeStock(
  product: PublishedProduct,
  variants: PublishedProductVariant[],
  selectedVariantId: string | null
) {
  const activeVariants = (variants ?? []).filter((v) => v.is_active)
  if (selectedVariantId) {
    const v = activeVariants.find((x) => x.id === selectedVariantId)
    return (v?.stock_quantity ?? 0) > 0
  }
  if (activeVariants.length > 0) {
    return activeVariants.some((v) => v.stock_quantity > 0)
  }
  if (product.type === 'digital') return true
  return !!product.physical_stock_unlimited || (product.physical_stock_quantity ?? 0) > 0
}

export function ProductDetail({
  product,
  bulletPoints = [],
  contentBlocks = [],
  saleActive = false,
  customDetails = [],
  aggregates = null,
  entitySlug = '',
  hasNews = false,
}: Props) {
  const variants = ((product.product_variants ?? []) as PublishedProductVariant[]).filter(
    (v) => v.is_active
  )
  const allMedia = [...(product.product_media ?? [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  )
  const images = allMedia.filter((m) => !m.media_type || m.media_type === 'image')
  const video = allMedia.find((m) => m.media_type === 'video') ?? null
  const galleryMedia = [...images, ...(video ? [video] : [])]

  const attrKeys = Array.from(
    new Set(
      variants.flatMap((v) => Object.keys((v.attributes ?? {}) as Record<string, string>))
    )
  )
  const attrOptions: Record<string, string[]> = {}
  for (const key of attrKeys) {
    attrOptions[key] = Array.from(
      new Set(
        variants
          .map((v) => String((v.attributes as Record<string, unknown> | null)?.[key] ?? ''))
          .filter(Boolean)
      )
    )
  }

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({})
  const { trackRef, canPrev, canNext, scrollPrev, scrollNext } = useHorizontalCarousel(12, 'product-detail__slide')

  const selectedVariant = useMemo(() => {
    const keys = Object.keys(selectedAttrs)
    if (keys.length !== attrKeys.length || attrKeys.length === 0) return null
    return (
      variants.find((v) =>
        keys.every((k) => String((v.attributes as Record<string, unknown> | null)?.[k]) === selectedAttrs[k])
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
  const detailRows = buildDetailRows(product, customDetails)

  const deliveryTags =
    product.type === 'physical'
      ? [
          { label: 'Main propre', Icon: Handshake },
          ...(product.pickup_enabled ? [{ label: 'Click & collect', Icon: Store }] : []),
          ...(product.delivery_enabled ? [{ label: 'Livraison', Icon: Truck }] : []),
        ]
      : [{ label: 'Téléchargement', Icon: Download }]

  return (
    <div className="product-detail">
      <div className="product-detail__stats">
        <a href="#avis" className="product-detail__stat product-detail__stat--link">
          <span className="product-detail__stat-label">{reviewCount > 0 ? `${reviewCount} avis` : 'Avis'}</span>
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
          <span className="product-detail__stat-label">Type</span>
          <span className="product-detail__stat-value product-detail__stat-value--sm">
            {product.type === 'digital' ? 'Numérique' : 'Physique'}
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
        {deliveryTags.map(({ label, Icon }) => (
          <div key={label} className="product-detail__stat">
            <span className="product-detail__stat-label">{label}</span>
            <span className="product-detail__stat-value product-detail__stat-icon">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        ))}
      </div>

      <div className="product-detail__media">
        <div ref={trackRef} className="product-detail__carousel gallery-strip">
          {galleryMedia.length > 0 ? (
            galleryMedia.map((m, i) => (
              <div key={m.id ?? i} className="product-detail__slide carousel-slide">
                {m.media_type === 'video' ? (
                  <video src={m.url} controls preload="metadata" playsInline className="h-full w-full bg-black object-cover" />
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
              <div className="ph flex h-full w-full items-center justify-center" aria-hidden="true">
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

      {detailRows.length > 0 && (
        <div className="product-detail__buybox-card">
          <div id="tous-les-details" className="product-detail__buybox-info scroll-mt-20">
            <h3 className="product-detail__info-title">Information</h3>
            <div className="product-detail__info-menus">
              <details className="product-detail__tech-menu">
                <summary>
                  <span>Information générale</span>
                  <span className="product-detail__tech-chevron" aria-hidden="true">
                    <ChevronRight className="h-[18px] w-[18px]" />
                  </span>
                </summary>
                <div className="product-detail__tech-panel">
                  {detailRows.map((row, i) => (
                    <div key={i} className="product-detail__tech-line">
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div className="product-detail__variants" id="variant-selector">
          {attrKeys.map((key) => (
            <div key={key}>
              <p className="product-detail__variant-label">{key}</p>
              <div className="flex flex-wrap gap-2">
                {attrOptions[key]?.map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-selected={selectedAttrs[key] === value ? 'true' : 'false'}
                    className="product-detail__variant-btn"
                    onClick={() => setSelectedAttrs((prev) => ({ ...prev, [key]: value }))}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityMoreDetails
        entityKind="product"
        contentBlocks={contentBlocks}
        bulletPoints={bulletPoints}
        fallbackText={product.description_long}
      />
      {hasNews && entitySlug && <NewsWidget entitySlug={entitySlug} />}
    </div>
  )
}
