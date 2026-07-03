/** Schéma config JSONB des widgets Accueil (entity_home_widgets.config).
    Chaque widget pioche dans le contenu des menus existants. */

import type { CarouselSelectionMode } from './carousel-items'

export const SHOP_WIDGET_CATEGORY_LIMIT = 6
export const SERVICE_WIDGET_COLLECTION_LIMIT = 6

export type ShopWidgetConfig =
  | { mode: 'product'; product_id: string }
  | { mode: 'collection'; category_id: string; limit?: number }

export type ServiceWidgetConfig =
  | { mode: 'service'; appointment_type_id: string }
  | { mode: 'collection'; limit?: number }

export type EventWidgetConfig =
  | { mode: 'featured'; event_id: string }
  | { mode: 'list'; limit?: number }

/** Contenu référençable dans un widget Mise en avant. */
export const HIGHLIGHT_CONTENT_KINDS = ['product', 'service', 'event', 'news'] as const
export type HighlightContentKind = (typeof HIGHLIGHT_CONTENT_KINDS)[number]

export type HighlightWidgetConfig = {
  mode: 'single'
  item: { kind: HighlightContentKind; id: string }
}

/** Sources prédéfinies pour le widget Carrousel. */
export const CAROUSEL_SOURCE_KINDS = ['shop_category', 'services', 'events', 'news'] as const
export type CarouselSourceKind = (typeof CAROUSEL_SOURCE_KINDS)[number]

export const CAROUSEL_SHOP_CATEGORY_LIMIT = 6
export const CAROUSEL_SERVICES_LIMIT = 6
export const CAROUSEL_EVENTS_LIMIT = 6
export const CAROUSEL_NEWS_LIMIT = 3

export type CarouselWidgetConfig = {
  mode: 'collection'
  source_kind: CarouselSourceKind
  /** Boutique : category | popular | top_rated. Services : popular | top_rated. */
  selection_mode?: CarouselSelectionMode
  category_id?: string
  limit?: number
}

export const CAROUSEL_SOURCE_LABELS: Record<CarouselSourceKind, string> = {
  shop_category: 'Ouvrir la boutique',
  services: 'Voir les services',
  events: 'Parcourir les événements',
  news: 'Découvrir les news',
}

export const CAROUSEL_SOURCE_HASH: Record<CarouselSourceKind, string> = {
  shop_category: '#shop',
  services: '#appointments',
  events: '#events',
  news: '#news',
}

export function carouselSourceLimit(kind: CarouselSourceKind): number {
  switch (kind) {
    case 'shop_category':
      return CAROUSEL_SHOP_CATEGORY_LIMIT
    case 'services':
      return CAROUSEL_SERVICES_LIMIT
    case 'events':
      return CAROUSEL_EVENTS_LIMIT
    case 'news':
      return CAROUSEL_NEWS_LIMIT
  }
}

export function parseHighlightConfig(raw: unknown): HighlightWidgetConfig | null {
  const o = normalizeWidgetConfig(raw)
  if (o.mode !== 'single' || !isRecord(o.item)) return null
  const kind = o.item.kind
  const id = o.item.id
  if (
    kind !== 'product' &&
    kind !== 'service' &&
    kind !== 'event' &&
    kind !== 'news'
  ) {
    return null
  }
  if (!nonEmptyId(id)) return null
  return { mode: 'single', item: { kind, id } }
}

export function parseCarouselConfig(raw: unknown): CarouselWidgetConfig | null {
  const o = normalizeWidgetConfig(raw)
  if (o.mode !== 'collection') return null
  const sourceKind = o.source_kind
  if (
    sourceKind !== 'shop_category' &&
    sourceKind !== 'services' &&
    sourceKind !== 'events' &&
    sourceKind !== 'news'
  ) {
    return null
  }
  const defaultLimit = carouselSourceLimit(sourceKind)
  const limit = typeof o.limit === 'number' ? o.limit : defaultLimit
  const selectionRaw = o.selection_mode

  if (sourceKind === 'shop_category') {
    const selection_mode =
      selectionRaw === 'popular' || selectionRaw === 'top_rated' || selectionRaw === 'category'
        ? selectionRaw
        : 'category'
    if (selection_mode === 'category' && !nonEmptyId(o.category_id)) return null
    return {
      mode: 'collection',
      source_kind: sourceKind,
      selection_mode,
      ...(selection_mode === 'category' ? { category_id: o.category_id as string } : {}),
      limit,
    }
  }

  if (sourceKind === 'services') {
    const selection_mode =
      selectionRaw === 'top_rated' || selectionRaw === 'popular' ? selectionRaw : 'popular'
    return {
      mode: 'collection',
      source_kind: sourceKind,
      selection_mode,
      limit,
    }
  }

  return {
    mode: 'collection',
    source_kind: sourceKind,
    limit,
  }
}

/** Référence le contenu du menu FAQ (entity_faq_items). */
export type FaqWidgetConfig = { mode: 'menu' }

export const NEWS_WIDGET_LIMIT = 3

export type NewsWidgetConfig = { mode: 'latest'; limit: typeof NEWS_WIDGET_LIMIT }

/** Référence les infos pro (entity_contact_info). */
export type BioWidgetConfig = { mode: 'profile' }

/** Ratio largeur/hauteur : 1 (carré) … 4 (paysage 4:1, bannière accueil pleine largeur). */
export const BANNER_ASPECT_MIN = 1
export const BANNER_ASPECT_MAX = 4
/** Format d'affichage widget bannière accueil (800×200 à l'échelle du shell). */
export const BANNER_WIDGET_DISPLAY_ASPECT = 4
export const BANNER_MAX_IMAGES = 3

export type BannerWidgetImage = {
  url: string
  aspect_ratio: number
}

export type AnnouncementWidgetConfig = {
  /** Optionnel — référencement uniquement, non affiché. */
  title?: string
  /** Optionnel — référencement uniquement, non affiché. */
  description?: string
  /** Nombre de zones (1 paysage, 2 ou 3 carrées). */
  slot_count?: 1 | 2 | 3
  images?: BannerWidgetImage[]
}

export function clampBannerAspectRatio(value: unknown): number {
  const n = typeof value === 'number' ? value : BANNER_ASPECT_MAX
  return Math.min(BANNER_ASPECT_MAX, Math.max(BANNER_ASPECT_MIN, n))
}

/** 1 image → paysage 4:1 ; 2–3 images → tuiles 4:1. */
export function normalizeBannerImages(images: BannerWidgetImage[]): BannerWidgetImage[] {
  if (images.length <= 1) {
    return images.map((img) => ({
      url: img.url,
      aspect_ratio: clampBannerAspectRatio(img.aspect_ratio),
    }))
  }
  return images.map((img) => ({ url: img.url, aspect_ratio: BANNER_WIDGET_DISPLAY_ASPECT }))
}

/** Ratio CSS pour le rendu bannière accueil (existing 16:9 → affiché en 2:1 min). */
export function bannerWidgetMediaAspect(imageCount: number, storedAspect?: number): number {
  if (imageCount > 1) return BANNER_WIDGET_DISPLAY_ASPECT
  return Math.max(clampBannerAspectRatio(storedAspect), BANNER_WIDGET_DISPLAY_ASPECT)
}

function parseBannerImages(raw: unknown, legacyUrl?: unknown): BannerWidgetImage[] | undefined {
  if (Array.isArray(raw)) {
    const images: BannerWidgetImage[] = []
    for (const item of raw.slice(0, BANNER_MAX_IMAGES)) {
      if (!isRecord(item)) continue
      const url = typeof item.url === 'string' ? item.url.trim() : ''
      if (!url) continue
      images.push({ url, aspect_ratio: clampBannerAspectRatio(item.aspect_ratio) })
    }
    if (images.length) return normalizeBannerImages(images)
    return []
  }
  if (typeof legacyUrl === 'string' && legacyUrl.trim()) {
    return normalizeBannerImages([{ url: legacyUrl.trim(), aspect_ratio: BANNER_ASPECT_MAX }])
  }
  return undefined
}

export type HomeWidgetConfig =
  | ShopWidgetConfig
  | ServiceWidgetConfig
  | EventWidgetConfig
  | HighlightWidgetConfig
  | CarouselWidgetConfig
  | NewsWidgetConfig
  | BioWidgetConfig
  | AnnouncementWidgetConfig
  | FaqWidgetConfig

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function nonEmptyId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

/** Normalise config JSONB (string ou objet) avant parse / rendu. */
export function normalizeWidgetConfig(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return isRecord(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return isRecord(raw) ? raw : {}
}

export function parseShopConfig(raw: unknown): ShopWidgetConfig | null {
  const o = normalizeWidgetConfig(raw)
  if (o.mode === 'product' && nonEmptyId(o.product_id)) {
    return { mode: 'product', product_id: o.product_id }
  }
  if (o.mode === 'collection' && nonEmptyId(o.category_id)) {
    return {
      mode: 'collection',
      category_id: o.category_id,
      limit: typeof o.limit === 'number' ? o.limit : SHOP_WIDGET_CATEGORY_LIMIT,
    }
  }
  return null
}

export function parseAnnouncementConfig(raw: unknown): AnnouncementWidgetConfig | null {
  const o = normalizeWidgetConfig(raw)
  const images = Array.isArray(o.images)
    ? parseBannerImages(o.images, undefined)
    : parseBannerImages(o.images, o.image_url)
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const description = typeof o.description === 'string' ? o.description.trim() : ''
  const slotRaw = o.slot_count
  const hasSlotCount = slotRaw === 1 || slotRaw === 2 || slotRaw === 3

  if (!images?.length && !title && !description && !hasSlotCount) return null

  const slot_count =
    slotRaw === 2 || slotRaw === 3 ? slotRaw
      : slotRaw === 1 ? 1
        : images?.length === 2 || images?.length === 3 ? (images.length as 2 | 3)
          : 1

  return {
    title: title || undefined,
    description: description || undefined,
    slot_count,
    images: Array.isArray(o.images) ? (images ?? []) : images,
  }
}

export function parseServiceConfig(raw: unknown): ServiceWidgetConfig | null {
  const o = normalizeWidgetConfig(raw)
  if (o.mode === 'service' && nonEmptyId(o.appointment_type_id)) {
    return { mode: 'service', appointment_type_id: o.appointment_type_id }
  }
  if (o.mode === 'collection') {
    return {
      mode: 'collection',
      limit: typeof o.limit === 'number' ? o.limit : SERVICE_WIDGET_COLLECTION_LIMIT,
    }
  }
  // Rétrocompat configs sauvegardées avant alignement shop
  if (o.mode === 'featured' && nonEmptyId(o.appointment_type_id)) {
    return { mode: 'service', appointment_type_id: o.appointment_type_id }
  }
  if (o.mode === 'list') {
    return {
      mode: 'collection',
      limit: typeof o.limit === 'number' ? o.limit : SERVICE_WIDGET_COLLECTION_LIMIT,
    }
  }
  return null
}

export function parseEventConfig(raw: unknown): EventWidgetConfig | null {
  const o = normalizeWidgetConfig(raw)
  if (o.mode === 'featured' && nonEmptyId(o.event_id)) {
    return { mode: 'featured', event_id: o.event_id }
  }
  if (o.mode === 'list') {
    return { mode: 'list', limit: typeof o.limit === 'number' ? o.limit : 6 }
  }
  return null
}

export function parseFaqConfig(_raw: unknown): FaqWidgetConfig | null {
  return { mode: 'menu' }
}

export function parseNewsConfig(_raw: unknown): NewsWidgetConfig | null {
  return { mode: 'latest', limit: NEWS_WIDGET_LIMIT }
}

/** Widgets sans réglages : le contenu est dérivé automatiquement des menus. */
export const AUTOMATIC_HOME_WIDGET_TYPES = new Set(['widget_faq'])

/** Un seul exemplaire par profil (les autres types peuvent être dupliqués). */
export const SINGLE_INSTANCE_HOME_WIDGET_TYPES = new Set([
  'widget_highlight',
  'widget_faq',
  'widget_bio',
])

export function isSingleInstanceHomeWidget(type: string): boolean {
  return SINGLE_INSTANCE_HOME_WIDGET_TYPES.has(type)
}

export function parseBioConfig(_raw: unknown): BioWidgetConfig | null {
  return { mode: 'profile' }
}

export function isWidgetConfigured(type: string, config: unknown): boolean {
  switch (type) {
    case 'widget_highlight':
      return parseHighlightConfig(config) !== null
    case 'widget_carousel':
      return parseCarouselConfig(config) !== null
    case 'widget_shop': return parseShopConfig(config) !== null
    case 'widget_service': return parseServiceConfig(config) !== null
    case 'widget_event': return parseEventConfig(config) !== null
    case 'widget_news': return parseNewsConfig(config) !== null
    case 'widget_bio': return parseBioConfig(config) !== null
    case 'widget_announcement': return parseAnnouncementConfig(config) !== null
    case 'widget_faq': return parseFaqConfig(config) !== null
    default: return false
  }
}

/** Types qui supportent un mode liste / collection (plusieurs éléments). */
export const WIDGET_SUPPORTS_COLLECTION = new Set(['widget_shop', 'widget_service', 'widget_event'])

export const HOME_WIDGET_CAROUSEL_OPEN_LABELS: Record<string, string> = {
  widget_shop: 'Ouvrir la boutique',
  widget_service: 'Voir les services',
  widget_event: 'Parcourir les événements',
  widget_news: 'Découvrir les news',
}

export type HomeWidgetCarouselSectionLink = {
  label: string
  href: string
}

/** Vue « un seul élément » (mise en avant ou anciens widgets shop/service/event). */
export function isHomeWidgetFeaturedSingle(widgetType: string, config: unknown): boolean {
  if (widgetType === 'widget_highlight') return parseHighlightConfig(config) !== null
  const normalized = normalizeWidgetConfig(config)
  switch (widgetType) {
    case 'widget_shop':
      return parseShopConfig(normalized)?.mode === 'product'
    case 'widget_service':
      return parseServiceConfig(normalized)?.mode === 'service'
    case 'widget_event':
      return parseEventConfig(normalized)?.mode === 'featured'
    default:
      return false
  }
}

/** Lien d'en-tête pour les carousels (scroll horizontal). */
export function homeWidgetCarouselSectionLink(
  widgetType: string,
  config: unknown,
  baseUrl: string
): HomeWidgetCarouselSectionLink | null {
  const normalized = normalizeWidgetConfig(config)
  if (widgetType === 'widget_carousel') {
    const cfg = parseCarouselConfig(normalized)
    if (!cfg) return null
    return {
      label: CAROUSEL_SOURCE_LABELS[cfg.source_kind],
      href: `${baseUrl}${CAROUSEL_SOURCE_HASH[cfg.source_kind]}`,
    }
  }
  switch (widgetType) {
    case 'widget_shop': {
      const cfg = parseShopConfig(normalized)
      if (!cfg || cfg.mode === 'product') return null
      return { label: HOME_WIDGET_CAROUSEL_OPEN_LABELS.widget_shop!, href: `${baseUrl}#shop` }
    }
    case 'widget_service': {
      const cfg = parseServiceConfig(normalized)
      if (!cfg || cfg.mode === 'service') return null
      return { label: HOME_WIDGET_CAROUSEL_OPEN_LABELS.widget_service!, href: `${baseUrl}#appointments` }
    }
    case 'widget_event': {
      const cfg = parseEventConfig(normalized)
      if (!cfg || cfg.mode === 'featured') return null
      return { label: HOME_WIDGET_CAROUSEL_OPEN_LABELS.widget_event!, href: `${baseUrl}#events` }
    }
    case 'widget_news': {
      parseNewsConfig(normalized)
      return { label: HOME_WIDGET_CAROUSEL_OPEN_LABELS.widget_news!, href: `${baseUrl}#news` }
    }
    default:
      return null
  }
}
