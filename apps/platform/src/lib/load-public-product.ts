import { createClient } from '@/lib/supabase/server'
import {
  descriptionFromBlocks,
  parseBulletPoints,
  parseCustomDetails,
  parseDetailContentBlocks,
  parseFaqItems,
} from '@/lib/entity-content-blocks'
import type { DetailContentBlock } from '@/lib/entity-content-blocks'
import { parseReviewRatings } from '@/lib/detail-format'
import { PROFILE_RELATED_MOCK, SIMILAR_RELATED_MOCK } from '@/lib/load-public-service'
import {
  getEntityBySlug,
  getEntityMenuSections,
  getPublishedProductBySlug,
  getReviewAggregates,
  listPublishedProductsByEntity,
  getPublicationsByEntity,
  listPublishedReviews,
  lookupProductSlugHistory,
} from '@ibee/supabase'
import type { Database, ReviewAggregates } from '@ibee/supabase'

type ProductMediaRow = Database['public']['Tables']['product_media']['Row']
type ProductReviewRow = Database['public']['Tables']['product_reviews']['Row'] & {
  product_review_photos?: Database['public']['Tables']['product_review_photos']['Row'][]
}
type RelatedMockItem = (typeof PROFILE_RELATED_MOCK)[number]

export type PublishedProduct = Database['public']['Tables']['products']['Row'] & {
  entity_product_categories?: { name: string } | { name: string }[] | null
  product_media?: ProductMediaRow[]
  product_variants?: Database['public']['Tables']['product_variants']['Row'][]
}
export type PublishedProductVariant = Database['public']['Tables']['product_variants']['Row']

export type PublicProductData = {
  entity: {
    id: string
    slug: string
    display_name: string
    avatar_url: string | null
    banner_url: string | null
  }
  product: PublishedProduct
  categoryName: string | null
  bulletPoints: string[]
  contentBlocks: DetailContentBlock[]
  faq: { question: string; answer: string }[]
  customDetails: { label: string; value: string; family: string | null }[]
  saleActive: boolean
  reviews: ProductReviewRow[]
  aggregates: ReviewAggregates
  distribution: Record<number, number>
  activeRatings: number[]
  activeSort: 'recent' | 'oldest'
  images: string[]
  video: { url: string; name: string } | null
  reviewSamples: {
    rating: number
    title: string | null
    content: string | null
    created_at: string
    authorName: string
  }[]
  hasNews: boolean
  newsItems: {
    id: string
    title: string
    slug: string
    cover_url: string | null
    published_at: string | null
  }[]
  siteUrl: string
  profileUrl: string
  productUrl: string
  basePath: string
  backHref: string
  profileHref: string
  metaTitle: string
  metaDescription: string
  ogImage: string | undefined
  profileRelated: RelatedMockItem[]
  similarRelated: RelatedMockItem[]
  subtitle: string
  description: string
}

import { getDashboardContext } from '@/lib/dashboard-context'

export type ProductLoadResult =
  | { kind: 'not_found' }
  | { kind: 'redirect'; newSlug: string }
  | { kind: 'ok'; data: PublicProductData }

export async function loadPublicProduct(
  slug: string,
  productSlug: string,
  searchParams?: { rating?: string; sort?: string; preview?: string },
): Promise<ProductLoadResult> {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return { kind: 'not_found' }

  const entityRow = entity as typeof entity & { banner_url?: string | null }

  let productRaw: any = null

  if (searchParams?.preview === '1') {
    try {
      const ctx = await getDashboardContext()
      if (ctx?.entity.slug === slug) {
        const { data } = await supabase
          .from('products')
          .select(
            `
            *,
            entity_product_categories(name),
            product_media(*),
            product_variants(*)
          `,
          )
          .eq('entity_id', entityRow.id)
          .eq('slug', productSlug)
          .maybeSingle()
        productRaw = data
      }
    } catch {}
  }

  if (!productRaw) {
    productRaw = await getPublishedProductBySlug(supabase, slug, productSlug)
  }

  if (!productRaw) {
    const history = await lookupProductSlugHistory(supabase, entity.id, productSlug)
    if (history?.new_slug) return { kind: 'redirect', newSlug: history.new_slug }
    return { kind: 'not_found' }
  }

  const product = productRaw as PublishedProduct

  const activeRatings = parseReviewRatings(searchParams?.rating)
  const activeSort: 'recent' | 'oldest' = searchParams?.sort === 'oldest' ? 'oldest' : 'recent'

  const [reviews, aggregates, allRatings, menuSections] = await Promise.all([
    listPublishedReviews(supabase, product.id, {
      ratings: activeRatings,
      sortBy: activeSort,
      limit: 50,
    }),
    getReviewAggregates(supabase, product.id),
    listPublishedReviews(supabase, product.id, { limit: 500 }),
    getEntityMenuSections(supabase, entity.id),
  ])

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of allRatings) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1
  }

  // Fetch actual real data for related sections
  const entityProducts = await listPublishedProductsByEntity(supabase, entity.id, { limit: 12 })

  // Exclude current product
  const availableProducts = entityProducts.filter((p) => p.id !== product.id)

  // For "À découvrir aussi", try to find products in the same category first
  const sameCategoryProducts = availableProducts.filter((p) => p.category === product.category)
  const differentCategoryProducts = availableProducts.filter((p) => p.category !== product.category)

  const similarProductsRaw = [...sameCategoryProducts, ...differentCategoryProducts].slice(0, 4)

  // For "Autres contenus", pick the next ones
  const otherProductsRaw = availableProducts
    .filter((p) => !similarProductsRaw.find((s) => s.id === p.id))
    .slice(0, 4)

  const toRelatedItem = (p: (typeof availableProducts)[number]) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    entity_slug: entity.slug,
    entity_name: entity.display_name,
    price_cents: p.price_cents,
    cover_url: Array.isArray(p.product_media)
      ? (p.product_media.find((m) => m.display_order === 0)?.url ?? p.product_media[0]?.url ?? null)
      : null,
    type: p.type as any,
    kind: 'product' as const,
    meta: '',
  })

  const otherEntityProducts = otherProductsRaw.map(toRelatedItem)
  const similarEntityProducts = similarProductsRaw.map(toRelatedItem)

  // Fetch actual news
  const entityNews = await getPublicationsByEntity(supabase, entity.id, { limit: 4 })
  const newsItems = (entityNews ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    cover_url: Array.isArray(n.publication_media)
      ? ((n.publication_media[0] as any)?.url ?? null)
      : null,
    published_at: n.published_at,
  }))

  const saleActive =
    product.sale_price_cents != null &&
    (product.sale_ends_at == null || new Date(product.sale_ends_at).getTime() > Date.now())

  const catEmbed = product.entity_product_categories
  const categoryName =
    (Array.isArray(catEmbed) ? catEmbed[0]?.name : catEmbed?.name) ?? product.category ?? null

  const bulletPoints = parseBulletPoints(product.bullet_points)
  const contentBlocks = parseDetailContentBlocks({
    content_blocks: product.content_blocks,
    description: product.description_long,
  })
  const faq = parseFaqItems(product.faq)
  const customDetails = parseCustomDetails(product.custom_details)

  const productMedia = product.product_media ?? []

  const images = productMedia
    .filter((m) => !m.media_type || m.media_type === 'image')
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((m) => m.url)

  const videoMedia = productMedia.find((m) => m.media_type === 'video') ?? null
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

  const data: PublicProductData = {
    entity: {
      id: entity.id,
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
      banner_url: entityRow.banner_url ?? null,
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
    hasNews: menuSections.some((s) => s.type === 'news') && newsItems.length > 0,
    newsItems,
    siteUrl,
    profileUrl,
    productUrl,
    basePath,
    backHref: `/${entity.slug}#shop`,
    profileHref: `/${entity.slug}`,
    metaTitle,
    metaDescription,
    ogImage,
    profileRelated: otherEntityProducts,
    similarRelated: similarEntityProducts,
    subtitle: [categoryName, product.type === 'digital' ? 'Produit numérique' : 'Produit physique']
      .filter(Boolean)
      .join(' · '),
    description:
      metaDescription ||
      descriptionFromBlocks(contentBlocks, `${product.title} — Produit par ${entity.display_name}`),
  }

  return { kind: 'ok', data }
}
