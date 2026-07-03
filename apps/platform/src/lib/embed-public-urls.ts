type RelatedItem = {
  kind: string
  title: string
  meta: string
  href?: string
}

const DETAIL_SECTIONS = new Set(['shop', 'events', 'services'])

export function embedProfileHref(entitySlug: string, hash?: string): string {
  const base = `/profile-preview/${entitySlug}`
  return hash ? `${base}#${hash}` : base
}

export function embedDetailBase(entitySlug: string): string {
  return `/feed-detail/${entitySlug}`
}

/** Convertit un chemin public (/slug, /slug/shop/x, /slug#shop) en route embed iframe. */
export function toEmbedPublicHref(href: string): string {
  if (!href || href.startsWith('http') || href.startsWith('#')) return href

  const hashIndex = href.indexOf('#')
  const pathPart = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const hash = hashIndex >= 0 ? href.slice(hashIndex + 1) : undefined

  const parts = pathPart.split('/').filter(Boolean)
  if (parts.length === 0) return href

  if (parts.length === 1) {
    return embedProfileHref(parts[0]!, hash)
  }

  if (parts.length === 2 && DETAIL_SECTIONS.has(parts[1]!)) {
    return embedProfileHref(parts[0]!, parts[1]!)
  }

  if (parts.length === 3 && DETAIL_SECTIONS.has(parts[1]!)) {
    const [entity, section, item] = parts
    return `/feed-detail/${entity}/${section}/${item}`
  }

  return href
}

function mapRelatedItems(items: RelatedItem[]): RelatedItem[] {
  return items.map((it) => ({
    ...it,
    href: it.href ? toEmbedPublicHref(it.href) : undefined,
  }))
}

export function mapProductDataForEmbed<T extends {
  entity: { slug: string }
  basePath: string
  backHref: string
  profileHref: string
  profileRelated: RelatedItem[]
  similarRelated: RelatedItem[]
}>(data: T): T {
  return {
    ...data,
    basePath: toEmbedPublicHref(data.basePath),
    backHref: toEmbedPublicHref(data.backHref),
    profileHref: embedProfileHref(data.entity.slug),
    profileRelated: mapRelatedItems(data.profileRelated),
    similarRelated: mapRelatedItems(data.similarRelated),
  }
}

export function mapEventDataForEmbed<T extends {
  entity: { slug: string }
  backHref: string
  profileHref: string
  profileRelated: RelatedItem[]
  similarRelated: RelatedItem[]
}>(data: T): T {
  return {
    ...data,
    backHref: toEmbedPublicHref(data.backHref),
    profileHref: embedProfileHref(data.entity.slug),
    profileRelated: mapRelatedItems(data.profileRelated),
    similarRelated: mapRelatedItems(data.similarRelated),
  }
}

export function mapServiceDataForEmbed<T extends {
  entity: { slug: string }
  basePath: string
  backHref: string
  profileHref: string
  bookingHref: string
  profileRelated: RelatedItem[]
  similarRelated: RelatedItem[]
}>(data: T): T {
  return {
    ...data,
    basePath: toEmbedPublicHref(data.basePath),
    backHref: toEmbedPublicHref(data.backHref),
    profileHref: embedProfileHref(data.entity.slug),
    bookingHref: toEmbedPublicHref(data.bookingHref),
    profileRelated: mapRelatedItems(data.profileRelated),
    similarRelated: mapRelatedItems(data.similarRelated),
  }
}
