import { createClient } from '@/lib/supabase/server'
import {
  descriptionFromBlocks,
  parseBulletPoints,
  parseCustomDetails,
  parseDetailContentBlocks,
  parseFaqItems,
} from '@/lib/entity-content-blocks'
import { parseReviewRatings } from '@/lib/detail-format'
import { PROFILE_RELATED_MOCK, SIMILAR_RELATED_MOCK } from '@/lib/load-public-service'
import {
  getEntityBySlug,
  getEntityMenuSections,
  getPublishedProductBySlug,
  getReviewAggregates,
  listPublishedReviews,
  lookupProductSlugHistory,
} from '@ibee/supabase'

export async function loadPublicProduct(
  slug: string,
  productSlug: string,
  searchParams?: { rating?: string; sort?: string }
) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return { kind: 'not_found' as const }

  let product = await getPublishedProductBySlug(supabase, slug, productSlug)
  if (!product) {
    const history = await lookupProductSlugHistory(supabase, entity.id, productSlug)
    if (history?.new_slug) return { kind: 'redirect' as const, newSlug: history.new_slug }
    return { kind: 'not_found' as const }
  }

  const activeRatings = parseReviewRatings(searchParams?.rating)
  const activeSort: 'recent' | 'oldest' = searchParams?.sort === 'oldest' ? 'oldest' : 'recent'

  const [reviews, aggregates, allRatings, menuSections] = await Promise.all([
    listPublishedReviews(supabase, product.id, { ratings: activeRatings, sortBy: activeSort, limit: 50 }),
    getReviewAggregates(supabase, product.id),
    listPublishedReviews(supabase, product.id, { limit: 500 }),
    getEntityMenuSections(supabase, entity.id),
  ])

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of allRatings) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1
  }

  const saleActive =
    product.sale_price_cents != null &&
    (product.sale_ends_at == null || new Date(product.sale_ends_at).getTime() > Date.now())

  const catEmbed = product.entity_product_categories as { name: string } | { name: string }[] | null
  const categoryName =
    (Array.isArray(catEmbed) ? catEmbed[0]?.name : catEmbed?.name) ?? product.category ?? null

  const bulletPoints = parseBulletPoints(product.bullet_points)
  const contentBlocks = parseDetailContentBlocks({
    content_blocks: product.content_blocks,
    description: product.description_long,
  })
  const faq = parseFaqItems(product.faq)
  const customDetails = parseCustomDetails(product.custom_details)

  const images = (product.product_media ?? [])
    .filter((m) => !m.media_type || m.media_type === 'image')
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((m) => m.url)

  const videoMedia = (product.product_media ?? []).find((m) => m.media_type === 'video') ?? null
  const video = videoMedia ? { url: videoMedia.url, name: product.title } : null

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const profileUrl = `${siteUrl}/${entity.slug}`
  const productUrl = `${siteUrl}/${entity.slug}/shop/${product.slug}`
  const basePath = `/${entity.slug}/shop/${product.slug}`

  const metaTitle = product.seo_title ?? `${product.title} — ${entity.display_name}`
  const metaDescription = product.seo_description ?? product.description_short ?? ''
  const ogImage = product.og_image_url ?? images[0] ?? entity.avatar_url ?? undefined

  const reviewSamples = reviews.slice(0, 5).map((r) => ({
    rating: r.rating,
    title: r.title,
    content: r.content,
    created_at: r.created_at,
    authorName: 'Client vérifié',
  }))

  const data = {
    entity: {
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
    },
    product,
    categoryName,
    bulletPoints,
    contentBlocks,
    faq,
    customDetails,
    saleActive,
    reviews,
    aggregates,
    distribution,
    activeRatings,
    activeSort,
    images,
    video,
    reviewSamples,
    hasNews: menuSections.some((s) => s.type === 'news'),
    siteUrl,
    profileUrl,
    productUrl,
    basePath,
    backHref: `/${entity.slug}#shop`,
    profileHref: `/${entity.slug}`,
    metaTitle,
    metaDescription,
    ogImage,
    profileRelated: PROFILE_RELATED_MOCK,
    similarRelated: SIMILAR_RELATED_MOCK,
    subtitle: [categoryName, product.type === 'digital' ? 'Produit numérique' : 'Produit physique']
      .filter(Boolean)
      .join(' · '),
    description:
      metaDescription ||
      descriptionFromBlocks(contentBlocks, `${product.title} — Produit par ${entity.display_name}`),
  }

  return { kind: 'ok' as const, data }
}

export type ProductLoadResult = Awaited<ReturnType<typeof loadPublicProduct>>
export type PublicProductData = Extract<ProductLoadResult, { kind: 'ok' }>['data']
export type PublishedProduct = PublicProductData['product']
export type PublishedProductVariant = NonNullable<PublishedProduct['product_variants']>[number]
