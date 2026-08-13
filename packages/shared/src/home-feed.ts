export type HomeFeedPostKind = 'product' | 'event' | 'service' | 'offer'

export type HomeFeedEntity = {
  id: string
  slug: string
  displayName: string
  avatarUrl: string | null
  /** entity.location (colonne réelle, nullable) — pas propre au recrutement,
   *  utilisable par les 4 types de carte du flux. */
  location: string | null
}

/** Aptitude demandée sur une offre (entity_job_offer_skills → job_skills.label). */
export type HomeFeedSkill = {
  id: string
  label: string
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
  /** Aptitudes demandées (entity_job_offer_skills → job_skills.label) —
   *  toujours absent pour product/event/service, structurellement présent
   *  uniquement pour kind 'offer' (FK scopée à entity_job_offers.id). */
  skills?: HomeFeedSkill[]
  /** Libellé de badge déjà formaté côté fetch (ex. "Alternance" pour une
   *  offre, dérivé de contract_type via contractPill — apps/platform,
   *  hors périmètre de ce package). Absent → HomeFeedCard replie sur
   *  KIND_LABELS[kind] ("Produit"/"Événement"/"Service"). Champ ajouté
   *  plutôt que de déplacer contract-labels.ts dans packages/shared : ce
   *  package ne connaît aucune règle métier de libellé de contrat, il ne
   *  transporte que la chaîne déjà résolue. */
  badgeLabel?: string
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
  offer: 3,
}

export function encodeHomeFeedCursor(cursor: HomeFeedCursor): string {
  return `${cursor.sortAt}|${cursor.kind}|${cursor.id}`
}

export function decodeHomeFeedCursor(raw: string | null | undefined): HomeFeedCursor | null {
  if (!raw) return null
  const parts = raw.split('|')
  if (parts.length !== 3) return null
  const [sortAt, kind, id] = parts
  if (!sortAt || !id || !['product', 'event', 'service', 'offer'].includes(kind)) return null
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
  const section = post.kind === 'product' ? 'shop' : post.kind === 'event' ? 'events' : 'services'
  const segments = post.href.split('/').filter(Boolean)
  const itemSlug = segments[segments.length - 1]
  return `/feed-detail/${post.entity.slug}/${section}/${itemSlug}`
}

/**
 * Initiales à 2 lettres d'un nom d'entité (repli avatar), fidèle à la
 * maquette accueil ("Atelier Grézan" → "AG"). Extrait de la fonction
 * `initials` locale à MessagesChatPanel.tsx (dupliquée par ailleurs dans
 * HomeSidebar.tsx/ProjectAccountSwitcher.tsx en version 1 lettre, non
 * concernées ici) — seule HomeFeedCard.tsx est migrée vers cette version
 * partagée dans cette mission, les autres copies existantes restent en
 * l'état (hors périmètre accueil, signalé au rapport).
 */
export function formatFeedEntityInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Ancienneté relative en français ("il y a 2 heures", "hier", "il y a 3
 * jours"), au-delà de 7 jours une date courte ("13 août"). Même logique que
 * `formatNotifDate` (GlobalHeader.tsx, non partagée) plutôt qu'un nouveau
 * format inventé. VOLONTAIRE — mots entiers ("heures"), pas l'abréviation
 * "h" de la maquette (Prototype desktop.dc.html : "il y a 2 h") : aligné sur
 * le seul autre endroit de l'app qui formate déjà une ancienneté relative,
 * à valider visuellement par Killian si l'abréviation est préférée.
 */
export function formatFeedAge(sortAt: string, now: Date = new Date()): string {
  const date = new Date(sortAt)
  const diffMs = now.getTime() - date.getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (diffMs < sevenDays) {
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 60) return rtf.format(-diffMin, 'minute')
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24) return rtf.format(-diffH, 'hour')
    return rtf.format(-Math.round(diffH / 24), 'day')
  }
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date)
}

/**
 * Ligne de contexte "lieu · ancienneté" (maquette : "Bouillargues · il y a
 * 2 h", segment distance "· 9 km" omis — décision Killian, aucune
 * géolocalisation réelle). Lieu absent (entity.location null) → ancienneté
 * seule, sans séparateur orphelin (aucune valeur de repli inventée).
 */
export function formatFeedContextLine(location: string | null, sortAt: string, now?: Date): string {
  const age = formatFeedAge(sortAt, now)
  return location ? `${location} · ${age}` : age
}
