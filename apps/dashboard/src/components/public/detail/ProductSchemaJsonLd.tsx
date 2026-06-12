import type { PublicProductData, PublishedProductVariant } from '@/lib/load-public-product'

interface Props {
  data: Pick<
    PublicProductData,
    | 'product'
    | 'productUrl'
    | 'images'
    | 'aggregates'
    | 'reviewSamples'
    | 'categoryName'
    | 'saleActive'
    | 'video'
    | 'entity'
    | 'profileUrl'
  >
}

export function ProductSchemaJsonLd({ data }: Props) {
  const {
    product,
    productUrl,
    images,
    aggregates,
    reviewSamples,
    categoryName,
    saleActive,
    video,
    entity,
    profileUrl,
  } = data

  const variants = (product.product_variants ?? []).filter((v: PublishedProductVariant) => v.is_active)
  const currency = product.currency

  const variantPrices = variants.map((v) => v.price_cents_override ?? product.price_cents)
  const minCents = variantPrices.length > 0 ? Math.min(...variantPrices) : product.price_cents
  const maxCents = variantPrices.length > 0 ? Math.max(...variantPrices) : product.price_cents
  const isMultiPrice = variants.length > 0 && minCents !== maxCents

  const toPrice = (cents: number) => (cents / 100).toFixed(2)

  let inStock: boolean
  if (variants.length > 0) {
    inStock = variants.some((v) => v.stock_quantity > 0)
  } else if (product.type === 'digital') {
    inStock = true
  } else {
    inStock = !!product.physical_stock_unlimited || (product.physical_stock_quantity ?? 0) > 0
  }
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'

  const conditionMap: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    like_new: 'https://schema.org/UsedCondition',
    very_good: 'https://schema.org/UsedCondition',
    good: 'https://schema.org/UsedCondition',
    acceptable: 'https://schema.org/UsedCondition',
  }
  const itemCondition =
    product.type === 'physical' && product.physical_condition
      ? (conditionMap[product.physical_condition] ?? 'https://schema.org/UsedCondition')
      : undefined

  const offerPriceCents =
    saleActive && product.sale_price_cents != null ? product.sale_price_cents : minCents
  const offers = isMultiPrice
    ? {
        '@type': 'AggregateOffer',
        priceCurrency: currency,
        lowPrice: toPrice(minCents),
        highPrice: toPrice(maxCents),
        offerCount: variants.length,
        availability,
        ...(itemCondition && { itemCondition }),
        url: productUrl,
      }
    : {
        '@type': 'Offer',
        priceCurrency: currency,
        price: toPrice(offerPriceCents),
        ...(saleActive && product.sale_ends_at && { priceValidUntil: product.sale_ends_at }),
        availability,
        ...(itemCondition && { itemCondition }),
        url: productUrl,
      }

  const description = product.description_long ?? product.description_short

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description,
    ...(categoryName && { category: categoryName }),
    ...(images.length > 0 && { image: images }),
    ...(video && {
      video: {
        '@type': 'VideoObject',
        contentUrl: video.url,
        name: video.name,
      },
    }),
    ...(product.type === 'digital' && {
      additionalType: 'https://schema.org/DigitalDocument',
    }),
    brand: {
      '@type': 'Person',
      name: entity.display_name,
      url: profileUrl,
    },
    offers,
  }

  if (aggregates.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregates.average.toFixed(1),
      reviewCount: aggregates.count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  if (reviewSamples.length > 0) {
    schema.review = reviewSamples.map((r: (typeof reviewSamples)[number]) => ({
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { '@type': 'Person', name: r.authorName },
      datePublished: r.created_at,
      ...(r.title && { name: r.title }),
      reviewBody: r.content,
    }))
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  )
}
