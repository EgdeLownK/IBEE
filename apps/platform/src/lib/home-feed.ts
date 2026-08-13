import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import type {
  HomeFeedCursor,
  HomeFeedNewsItem,
  HomeFeedPage,
  HomeFeedPost,
  HomeFeedPostKind,
  HomeFeedProfile,
  HomeFeedRow,
} from '@ibee/shared'
import {
  compareHomeFeedPosts,
  encodeHomeFeedCursor,
  isHomeFeedPostBeforeCursor,
} from '@ibee/shared'

type Client = SupabaseClient<Database>

type EntityEmbed = {
  id: string
  slug: string
  display_name: string
  avatar_url: string | null
}

const POOL_PER_KIND = 48
const DEFAULT_LIMIT = 12

function mapEntity(row: EntityEmbed | null | undefined) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }
}

function formatPrice(cents: number | null | undefined, currency: string) {
  if (cents == null) return null
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(
    cents / 100,
  )
}

function getProductImageUrl(product: {
  og_image_url: string | null
  product_media: { url: string; media_type: string; display_order: number }[] | null
}) {
  const media = [...(product.product_media ?? [])].sort((a, b) => a.display_order - b.display_order)
  const image = media.find((m) => m.media_type === 'image')
  if (image?.url) return image.url
  if (product.og_image_url) return product.og_image_url
  return null
}

function getGalleryImageUrl(images: string[] | null | undefined) {
  const url = images?.find((item) => typeof item === 'string' && item.trim().length > 0)
  return url?.trim() ?? null
}

function getPublicationImageUrl(
  media: { url: string; type: string | null; position: number | null }[] | null | undefined,
) {
  const sorted = [...(media ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const image = sorted.find((m) => m.type !== 'video')
  return image?.url ?? null
}

async function fetchProductPosts(client: Client): Promise<HomeFeedPost[]> {
  const { data, error } = await client
    .from('products')
    .select(
      `
      id, title, slug, type, price_cents, sale_price_cents, currency, published_at,
      og_image_url,
      product_media (url, media_type, display_order),
      entity:entity_id (id, slug, display_name, avatar_url)
    `,
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(POOL_PER_KIND)

  if (error) throw error

  const posts: HomeFeedPost[] = []
  for (const row of data ?? []) {
    const imageUrl = getProductImageUrl(row)
    const entity = mapEntity(row.entity as EntityEmbed | null)
    if (!imageUrl || !entity || !row.published_at) continue

    const priceCents = row.sale_price_cents ?? row.price_cents
    posts.push({
      kind: 'product',
      id: row.id,
      sortAt: row.published_at,
      title: row.title,
      imageUrl,
      href: `/${entity.slug}/shop/${row.slug}`,
      priceLabel: formatPrice(priceCents, row.currency),
      ctaLabel: 'Acheter',
      entity,
      priceCents,
      currency: row.currency,
      viewCount: 0,
      productType: row.type === 'digital' ? 'digital' : 'physical',
    })
  }
  return posts
}

async function fetchEventPosts(client: Client): Promise<HomeFeedPost[]> {
  const now = new Date().toISOString()
  const { data, error } = await client
    .from('events')
    .select(
      `
      id, title, slug, price_cents, currency, start_at, created_at, gallery_images,
      entity:entity_id (id, slug, display_name, avatar_url)
    `,
    )
    .eq('is_published', true)
    .gte('start_at', now)
    .order('created_at', { ascending: false })
    .limit(POOL_PER_KIND)

  if (error) throw error

  const posts: HomeFeedPost[] = []
  for (const row of data ?? []) {
    const imageUrl = getGalleryImageUrl(row.gallery_images)
    const entity = mapEntity(row.entity as EntityEmbed | null)
    if (!imageUrl || !entity) continue

    posts.push({
      kind: 'event',
      id: row.id,
      sortAt: row.created_at,
      title: row.title,
      imageUrl,
      href: `/${entity.slug}/events/${row.slug}`,
      priceLabel: formatPrice(row.price_cents, row.currency),
      ctaLabel: 'Participer',
      entity,
      priceCents: row.price_cents,
      currency: row.currency,
      viewCount: 0,
    })
  }
  return posts
}

async function fetchServicePosts(client: Client): Promise<HomeFeedPost[]> {
  const { data, error } = await client
    .from('appointment_types')
    .select(
      `
      id, title, slug, price_cents, promo_price_cents, currency, created_at, gallery_images,
      entity:entity_id (id, slug, display_name, avatar_url)
    `,
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(POOL_PER_KIND)

  if (error) throw error

  const posts: HomeFeedPost[] = []
  for (const row of data ?? []) {
    const imageUrl = getGalleryImageUrl(row.gallery_images)
    const entity = mapEntity(row.entity as EntityEmbed | null)
    if (!imageUrl || !entity) continue

    const priceCents = row.promo_price_cents ?? row.price_cents
    posts.push({
      kind: 'service',
      id: row.id,
      sortAt: row.created_at,
      title: row.title,
      imageUrl,
      href: `/${entity.slug}/services/${row.slug}`,
      priceLabel: formatPrice(priceCents, row.currency),
      ctaLabel: 'Réserver',
      entity,
      priceCents,
      currency: row.currency,
      viewCount: 0,
    })
  }
  return posts
}

async function fetchNewsItems(client: Client, limit = 16): Promise<HomeFeedNewsItem[]> {
  const { data, error } = await client
    .from('publications')
    .select(
      `
      id, title, slug, published_at,
      publication_media (url, type, position),
      entity:entity_id (id, slug, display_name, avatar_url)
    `,
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const items: HomeFeedNewsItem[] = []
  for (const row of data ?? []) {
    const imageUrl = getPublicationImageUrl(row.publication_media)
    const entity = mapEntity(row.entity as EntityEmbed | null)
    if (!imageUrl || !entity || !row.published_at) continue

    items.push({
      id: row.id,
      title: row.title,
      imageUrl,
      href: `/${entity.slug}/news/${row.slug}`,
      publishedAt: row.published_at,
      entity,
    })
  }
  return items
}

async function fetchRecommendedProfiles(client: Client, limit = 12): Promise<HomeFeedProfile[]> {
  const { data, error } = await client
    .from('entity')
    .select('slug, display_name, role, avatar_url')
    .not('avatar_url', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? [])
    .filter((row) => row.avatar_url)
    .map((row) => ({
      slug: row.slug,
      displayName: row.display_name,
      role: row.role,
      avatarUrl: row.avatar_url as string,
    }))
}

const VIEW_EVENT_BY_KIND: Record<
  HomeFeedPostKind,
  Database['public']['Enums']['analytics_event_type']
> = {
  product: 'product_view',
  event: 'event_view',
  service: 'service_view',
}

async function attachViewCounts(client: Client, posts: HomeFeedPost[]) {
  const byKind = new Map<HomeFeedPostKind, string[]>()
  for (const post of posts) {
    const ids = byKind.get(post.kind) ?? []
    ids.push(post.id)
    byKind.set(post.kind, ids)
  }

  const counts = new Map<string, number>()

  for (const [kind, ids] of byKind) {
    if (ids.length === 0) continue
    try {
      const { data, error } = (await client.rpc(
        'get_public_resource_view_counts' as never,
        {
          p_resource_ids: ids,
          p_event_type: VIEW_EVENT_BY_KIND[kind],
        } as never,
      )) as {
        data: { resource_id: string; view_count: number }[] | null
        error: { message: string } | null
      }
      if (error) {
        console.error('[home-feed] view counts', kind, error.message)
        continue
      }
      for (const row of data ?? []) {
        if (row.resource_id) counts.set(row.resource_id, Number(row.view_count ?? 0))
      }
    } catch (err) {
      console.error('[home-feed] view counts', kind, err)
    }
  }

  return posts.map((post) => ({
    ...post,
    viewCount: counts.get(post.id) ?? 0,
  }))
}

function buildFeedRows(
  posts: HomeFeedPost[],
  news: HomeFeedNewsItem[],
  profiles: HomeFeedProfile[],
  includeCarousels: boolean,
): HomeFeedRow[] {
  const rows: HomeFeedRow[] = []
  let newsInserted = false
  let profilesInserted = false

  posts.forEach((post, index) => {
    rows.push({ type: 'post', post })

    if (!includeCarousels) return

    // VOLONTAIRE — index 3 (4 cartes), pas 2 (3 cartes) : le flux accueil
    // est une grille 2 colonnes en desktop (home-feed.css, mission enveloppe
    // accueil) ; un carrousel pleine largeur inséré après un nombre IMPAIR
    // de cartes laisse une case vide sur la rangée précédente (rapport
    // vérif navigateur, Killian). 4 est pair, et l'écart jusqu'au
    // déclencheur profils ci-dessous (index 5) reste pair (5 − 3 = 2) : un
    // seul changement corrige les deux trous, aucune retouche du
    // déclencheur profils nécessaire.
    if (!newsInserted && index === 3 && news.length > 0) {
      rows.push({ type: 'news', items: news })
      newsInserted = true
    }
    if (!profilesInserted && index === 5 && profiles.length > 0) {
      rows.push({ type: 'profiles', items: profiles })
      profilesInserted = true
    }
  })

  if (includeCarousels) {
    if (!newsInserted && news.length > 0) {
      insertCarouselKeepingParity(rows, { type: 'news', items: news })
    }
    if (!profilesInserted && profiles.length > 0) {
      insertCarouselKeepingParity(rows, { type: 'profiles', items: profiles })
    }
  }

  return rows
}

/**
 * Cas de repli : moins de cartes au total que ce qu'il faut pour atteindre
 * un déclencheur ci-dessus (index 3 ou 5) — insère quand même le carrousel
 * en fin de flux, sans casser la parité de la grille 2 colonnes desktop
 * (home-feed.css). Compte les cartes consécutives en toute fin de tableau
 * (depuis le dernier carrousel, ou depuis le début) : si ce nombre est pair,
 * le carrousel s'ajoute normalement après elles ; s'il est impair, il se
 * place juste AVANT la dernière carte plutôt qu'après elle — cette carte se
 * retrouve alors seule en TOUTE fin de flux, seul cas de carte orpheline
 * accepté par Killian (contrairement à un trou en milieu de grille).
 */
function insertCarouselKeepingParity(rows: HomeFeedRow[], row: HomeFeedRow) {
  let trailingPosts = 0
  for (let i = rows.length - 1; i >= 0 && rows[i].type === 'post'; i--) trailingPosts++
  const insertAt = trailingPosts % 2 === 0 ? rows.length : rows.length - 1
  rows.splice(insertAt, 0, row)
}

export async function getHomeFeedPage(
  client: Client,
  opts: { cursor?: HomeFeedCursor | null; limit?: number } = {},
): Promise<HomeFeedPage> {
  const limit = opts.limit ?? DEFAULT_LIMIT
  const includeCarousels = !opts.cursor

  const [products, events, services, news, profiles] = await Promise.all([
    fetchProductPosts(client),
    fetchEventPosts(client),
    fetchServicePosts(client),
    includeCarousels ? fetchNewsItems(client) : Promise.resolve([]),
    includeCarousels ? fetchRecommendedProfiles(client) : Promise.resolve([]),
  ])

  let merged = [...products, ...events, ...services].sort(compareHomeFeedPosts)

  if (opts.cursor) {
    merged = merged.filter((post) => isHomeFeedPostBeforeCursor(post, opts.cursor!))
  }

  const slice = merged.slice(0, limit)
  const withViews = await attachViewCounts(client, slice)
  const rows = buildFeedRows(withViews, news, profiles, includeCarousels)

  const last = withViews[withViews.length - 1]
  const nextCursor =
    withViews.length === limit && last
      ? encodeHomeFeedCursor({ sortAt: last.sortAt, kind: last.kind, id: last.id })
      : null

  return { rows, nextCursor }
}
