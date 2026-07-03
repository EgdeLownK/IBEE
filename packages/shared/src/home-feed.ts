export type HomeFeedPostKind = 'product' | 'event' | 'service'

export type HomeFeedEntity = {
  id: string
  slug: string
  displayName: string
  avatarUrl: string | null
}

export type HomeFeedPost = {
  kind: HomeFeedPostKind
  id: string
  sortAt: string
  title: string
  imageUrl: string
  href: string
  priceLabel: string | null
  ctaLabel: string
  entity: HomeFeedEntity
  priceCents: number | null
  currency: string
  viewCount: number
  productType?: 'physical' | 'digital'
}

export type HomeFeedNewsItem = {
  id: string
  title: string
  imageUrl: string
  href: string
  publishedAt: string
  entity: HomeFeedEntity
}

export type HomeFeedProfile = {
  slug: string
  displayName: string
  role: string | null
  avatarUrl: string
}

export type HomeFeedRow =
  | { type: 'post'; post: HomeFeedPost }
  | { type: 'news'; items: HomeFeedNewsItem[] }
  | { type: 'profiles'; items: HomeFeedProfile[] }

export type HomeFeedCursor = {
  sortAt: string
  kind: HomeFeedPostKind
  id: string
}

export type HomeFeedPage = {
  rows: HomeFeedRow[]
  nextCursor: string | null
}

const KIND_ORDER: Record<HomeFeedPostKind, number> = {
  product: 0,
  event: 1,
  service: 2,
}

export function encodeHomeFeedCursor(cursor: HomeFeedCursor): string {
  return `${cursor.sortAt}|${cursor.kind}|${cursor.id}`
}

export function decodeHomeFeedCursor(raw: string | null | undefined): HomeFeedCursor | null {
  if (!raw) return null
  const parts = raw.split('|')
  if (parts.length !== 3) return null
  const [sortAt, kind, id] = parts
  if (!sortAt || !id || !['product', 'event', 'service'].includes(kind)) return null
  return { sortAt, kind: kind as HomeFeedPostKind, id }
}

export function compareHomeFeedPosts(a: HomeFeedPost, b: HomeFeedPost): number {
  const byDate = b.sortAt.localeCompare(a.sortAt)
  if (byDate !== 0) return byDate
  const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  if (byKind !== 0) return byKind
  return b.id.localeCompare(a.id)
}

export function isHomeFeedPostBeforeCursor(post: HomeFeedPost, cursor: HomeFeedCursor): boolean {
  if (post.sortAt < cursor.sortAt) return true
  if (post.sortAt > cursor.sortAt) return false
  const kindDelta = KIND_ORDER[post.kind] - KIND_ORDER[cursor.kind]
  if (kindDelta < 0) return true
  if (kindDelta > 0) return false
  return post.id < cursor.id
}

/** Chemin embed (iframe) pour l’aperçu desktop du feed accueil. */
export function getHomeFeedDetailPreviewPath(post: HomeFeedPost): string {
  const section =
    post.kind === 'product' ? 'shop' : post.kind === 'event' ? 'events' : 'services'
  const segments = post.href.split('/').filter(Boolean)
  const itemSlug = segments[segments.length - 1]
  return `/feed-detail/${post.entity.slug}/${section}/${itemSlug}`
}
