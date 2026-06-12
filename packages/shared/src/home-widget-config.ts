/** Schéma config JSONB des widgets Accueil (entity_home_widgets.config).
    Chaque widget pioche dans le contenu des menus existants. */

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

/** Référence le contenu du menu FAQ (entity_faq_items). */
export type FaqWidgetConfig = { mode: 'menu' }

export const NEWS_WIDGET_LIMIT = 3

export type NewsWidgetConfig = { mode: 'latest'; limit: typeof NEWS_WIDGET_LIMIT }

/** Référence les infos pro (entity_contact_info). */
export type BioWidgetConfig = { mode: 'profile' }

/** Ratio largeur/hauteur : 1 (carré) … 16/9 (paysage). */
export const BANNER_ASPECT_MIN = 1
export const BANNER_ASPECT_MAX = 16 / 9
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

/** 1 image → paysage ; 2–3 images → carré 1:1. */
export function normalizeBannerImages(images: BannerWidgetImage[]): BannerWidgetImage[] {
  if (images.length <= 1) {
    return images.map((img) => ({
      url: img.url,
      aspect_ratio: clampBannerAspectRatio(img.aspect_ratio),
    }))
  }
  return images.map((img) => ({ url: img.url, aspect_ratio: 1 }))
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
export const AUTOMATIC_HOME_WIDGET_TYPES = new Set([
  'widget_news',
  'widget_faq',
])

/** Un seul exemplaire par profil (les autres types peuvent être dupliqués). */
export const SINGLE_INSTANCE_HOME_WIDGET_TYPES = new Set([
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
