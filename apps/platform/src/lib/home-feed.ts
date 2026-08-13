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
import { contractPill } from '@/components/public/jobs/contract-labels'

type Client = SupabaseClient<Database>

type EntityEmbed = {
  id: string
  slug: string
  display_name: string
  avatar_url: string | null
  location: string | null
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
    location: row.location,
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

function getOfferImageUrl(
  media: { url: string; media_type: 'image' | 'video'; display_order: number }[] | null | undefined,
) {
  const sorted = [...(media ?? [])].sort((a, b) => a.display_order - b.display_order)
  const image = sorted.find((m) => m.media_type === 'image')
  return image?.url ?? null
}

// MORTES, NON SUPPRIMÉES (mission accueil #3, filtrage) — le flux accueil
// n'affiche plus que des offres actives (entity_job_offers), ces 3 fetchers
// ne sont donc plus appelés depuis getHomeFeedPage. Gardées intactes en cas
// de retour futur de ces types de carte au flux (décision produit, pas prise
// ici) — préfixe `_` pour rester dans varsIgnorePattern de la config ESLint
// (apps/platform/eslint.config.mjs) sans quoi @typescript-eslint/no-unused-vars
// ferait remonter un warning neuf et casserait le plafond --max-warnings de
// pnpm lint. Renommer sans le `_` dès qu'un appelant réel réapparaît.
async function _fetchProductPosts(client: Client): Promise<HomeFeedPost[]> {
  const { data, error } = await client
    .from('products')
    .select(
      `
      id, title, slug, type, price_cents, sale_price_cents, currency, published_at,
      og_image_url,
      product_media (url, media_type, display_order),
      entity:entity_id (id, slug, display_name, avatar_url, location)
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

async function _fetchEventPosts(client: Client): Promise<HomeFeedPost[]> {
  const now = new Date().toISOString()
  const { data, error } = await client
    .from('events')
    .select(
      `
      id, title, slug, price_cents, currency, start_at, created_at, gallery_images,
      entity:entity_id (id, slug, display_name, avatar_url, location)
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

async function _fetchServicePosts(client: Client): Promise<HomeFeedPost[]> {
  const { data, error } = await client
    .from('appointment_types')
    .select(
      `
      id, title, slug, price_cents, promo_price_cents, currency, created_at, gallery_images,
      entity:entity_id (id, slug, display_name, avatar_url, location)
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
      entity:entity_id (id, slug, display_name, avatar_url, location)
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

/**
 * Offres actives (mission accueil #3, filtrage) — seul type de carte restant
 * dans le flux. Une seule requête (media + aptitudes + entité en jointure,
 * même motif que getProjectJobOffer, packages/supabase/src/project-talent.ts)
 * : zéro N+1. RLS anonyme confirmée sur les 3 tables jointes (rapport phase 0
 * — entity_job_offers_public_select, entity_job_offer_media_public_select,
 * entity_job_offer_skills_public_select, toutes USING (status = 'active') ou
 * EXISTS équivalent, TO anon, authenticated).
 *
 * VOLONTAIRE — contrairement aux fetchers produits/événements/services
 * ci-dessus, une offre SANS image n'est PAS ignorée (pas de `continue` sur
 * imageUrl manquant) : sur un flux qui peut n'avoir que 2-3 offres actives au
 * total, masquer les offres sans photo viderait l'accueil pour rien. Le
 * placeholder visuel (.home-feed-card__media-placeholder, HomeFeedCard.tsx,
 * mission cartes) existe déjà précisément pour ce cas — imageUrl passe `''`
 * (chaîne vide, falsy en JSX) plutôt que null, le type HomeFeedPost.imageUrl
 * restant `string` sans modification du package partagé.
 */
async function fetchJobOfferPosts(client: Client): Promise<HomeFeedPost[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select(
      `
      id, title, contract_type, created_at, location_text,
      entity_job_offer_media (url, media_type, display_order),
      entity_job_offer_skills (offer_id, skill_id, display_order, created_at, job_skills (id, label)),
      entity:entity_id (id, slug, display_name, avatar_url, location)
    `,
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(POOL_PER_KIND)

  if (error) throw error

  const posts: HomeFeedPost[] = []
  for (const row of data ?? []) {
    const mappedEntity = mapEntity(row.entity as EntityEmbed | null)
    if (!mappedEntity) continue

    // location_text (spécifique à l'offre) prioritaire sur entity.location
    // (générique) — décision Killian, rapport phase 0 Q4 : c'est le lieu que
    // cherche un candidat, pas celui de l'entité qui recrute. formatFeedContextLine
    // (HomeFeedCard.tsx) ne lit que post.entity.location : on l'ajuste ici,
    // à la source, plutôt que d'ajouter un second champ de lieu partout.
    // .trim() : bug croisé en vérif navigateur (offre réelle "Nîmes " avec
    // espace de fin en base) — corrigé ici, à l'affichage, pas en base (hors
    // périmètre, aucune mutation de données dans cette mission).
    const locationText = row.location_text?.trim() || null
    const entity = { ...mappedEntity, location: locationText ?? mappedEntity.location }

    const imageUrl = getOfferImageUrl(row.entity_job_offer_media) ?? ''
    const skills = (row.entity_job_offer_skills ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .flatMap((s) => (s.job_skills ? [{ id: s.job_skills.id, label: s.job_skills.label }] : []))

    posts.push({
      kind: 'offer',
      id: row.id,
      sortAt: row.created_at,
      title: row.title,
      imageUrl,
      href: `/${entity.slug}/offres/${row.id}`,
      priceLabel: null,
      ctaLabel: 'Rejoindre',
      entity,
      priceCents: null,
      currency: 'EUR',
      viewCount: 0,
      skills: skills.length > 0 ? skills : undefined,
      badgeLabel: contractPill(row.contract_type).label,
    })
  }
  return posts
}

// MORTE, NON SUPPRIMÉE (mission accueil #3, filtrage) — le carrousel Profils
// recommandés disparaît du rendu (HomeFeed.tsx ne l'affiche plus, mais le
// composant HomeFeedProfilesRow.tsx reste importé/référencé dans son JSX,
// branche simplement jamais atteinte puisque plus aucune row 'profiles'
// n'est produite). Même motif `_` que le groupe de fetchers ci-dessus.
async function _fetchRecommendedProfiles(client: Client, limit = 12): Promise<HomeFeedProfile[]> {
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

// MORTES, NON SUPPRIMÉES (mission accueil #3, filtrage) — les compteurs de
// vues n'étaient déjà affichés nulle part dans HomeFeedCard.tsx (vérifié :
// post.viewCount n'y est lu par aucun JSX) avant cette mission ; ils
// devenaient de toute façon sans objet une fois product/event/service retirés
// du flux. Pas d'équivalent 'job_offer_view' dans analytics_event_type
// (packages/supabase/src/types.ts) — ajouter les offres ici demanderait une
// migration, hors périmètre. Même motif `_` que les fetchers ci-dessus ;
// Record non exhaustif sur HomeFeedPostKind volontairement laissé tel quel
// (pas de clé 'offer') plutôt que d'y ajouter une entrée qui ne serait
// jamais consommée.
const _VIEW_EVENT_BY_KIND: Partial<
  Record<HomeFeedPostKind, Database['public']['Enums']['analytics_event_type']>
> = {
  product: 'product_view',
  event: 'event_view',
  service: 'service_view',
}

async function _attachViewCounts(client: Client, posts: HomeFeedPost[]) {
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
          p_event_type: _VIEW_EVENT_BY_KIND[kind],
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

    // VOLONTAIRE — index 5 (6 cartes), pas 3 : position choisie par Killian
    // (mission accueil #3, filtrage — le carrousel News doit apparaître plus
    // bas). Toute valeur PAIRE fonctionne ici sans casser la grille 2
    // colonnes desktop (home-feed.css) : le repli insertCarouselKeepingParity
    // ci-dessous absorbe déjà tous les cas où moins de 6 offres existent
    // (resimulé 0 à 12, rapport phase 0) — ce n'est PAS ce nombre qui garantit
    // la parité, c'est cette fonction de repli, quel que soit le déclencheur.
    if (!newsInserted && index === 5 && news.length > 0) {
      rows.push({ type: 'news', items: news })
      newsInserted = true
    }
    // MORT EN PRATIQUE (mission accueil #3, filtrage) — profiles est toujours
    // [] depuis getHomeFeedPage (fetchRecommendedProfiles n'est plus appelée,
    // voir plus haut), donc cette condition n'est jamais vraie. Branche
    // gardée, pas supprimée, au cas où le carrousel Profils reviendrait au
    // flux (décision produit, pas prise ici).
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
 * un déclencheur ci-dessus (index 5) — insère quand même le carrousel
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

  // Flux offres-seules (mission accueil #3, filtrage) — plus de Promise.all
  // multi-kind à fusionner/trier : une seule source, déjà triée par la
  // requête (order('created_at', { ascending: false })). news reste
  // récupéré (carrousel gardé, décision Killian) ; profiles n'est plus
  // récupéré du tout (pas de requête jetée pour un résultat inutilisé).
  const [offers, news] = await Promise.all([
    fetchJobOfferPosts(client),
    includeCarousels ? fetchNewsItems(client) : Promise.resolve([]),
  ])
  const profiles: HomeFeedProfile[] = []

  // Un seul kind désormais, mais le tri JS est gardé (pas juste l'ORDER BY
  // de la requête) : compareHomeFeedPosts départage aussi par id à egalité
  // de created_at, ce que Postgres ne garantit pas sans second critère de
  // tri — c'est ce départage qui rend le curseur (isHomeFeedPostBeforeCursor,
  // même comparateur) stable d'une page à l'autre.
  let merged = [...offers].sort(compareHomeFeedPosts)

  if (opts.cursor) {
    merged = merged.filter((post) => isHomeFeedPostBeforeCursor(post, opts.cursor!))
  }

  const slice = merged.slice(0, limit)
  const rows = buildFeedRows(slice, news, profiles, includeCarousels)

  const last = slice[slice.length - 1]
  const nextCursor =
    slice.length === limit && last
      ? encodeHomeFeedCursor({ sortAt: last.sortAt, kind: last.kind, id: last.id })
      : null

  return { rows, nextCursor }
}
