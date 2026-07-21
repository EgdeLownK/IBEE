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

export function toEmbedPublicHref(href: string, context: 'preview' | 'dashboard' = 'preview'): string {
  if (!href || href.startsWith('http') || href.startsWith('#')) return href

  const hashIndex = href.indexOf('#')
  const pathPart = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const hash = hashIndex >= 0 ? href.slice(hashIndex + 1) : undefined

  const parts = pathPart.split('/').filter(Boolean)
  if (parts.length === 0) return href

  if (parts.length === 1) {
    return context === 'dashboard' ? '/dashboard/site' : embedProfileHref(parts[0]!, hash)
  }

  if (parts.length === 2 && DETAIL_SECTIONS.has(parts[1]!)) {
    return context === 'dashboard' ? `/dashboard/site#${parts[1]}` : embedProfileHref(parts[0]!, parts[1]!)
  }

  if (parts.length === 3 && DETAIL_SECTIONS.has(parts[1]!)) {
    const [entity, section, item] = parts
    return `/feed-detail/${entity}/${section}/${item}`
  }

  return href
}

export function mapProductDataForEmbed<T extends {
  entity: { slug: string }
  basePath: string
  backHref: string
  profileHref: string
  profileRelated: RelatedItem[]
  similarRelated: RelatedItem[]
}>(data: T, context: 'preview' | 'dashboard' = 'preview'): T {
  return {
    ...data,
    basePath: toEmbedPublicHref(data.basePath, context),
    backHref: toEmbedPublicHref(data.backHref, context),
    profileHref: context === 'dashboard' ? '/dashboard/site' : embedProfileHref(data.entity.slug),
    profileRelated: data.profileRelated.map((it) => ({ ...it, href: it.href ? toEmbedPublicHref(it.href, context) : undefined })),
    similarRelated: data.similarRelated.map((it) => ({ ...it, href: it.href ? toEmbedPublicHref(it.href, context) : undefined })),
  }
}

export function mapEventDataForEmbed<T extends {
  entity: { slug: string }
  backHref: string
  profileHref: string
  profileRelated: RelatedItem[]
  similarRelated: RelatedItem[]
}>(data: T, context: 'preview' | 'dashboard' = 'preview'): T {
  return {
    ...data,
    backHref: toEmbedPublicHref(data.backHref, context),
    profileHref: context === 'dashboard' ? '/dashboard/site' : embedProfileHref(data.entity.slug),
    profileRelated: data.profileRelated.map((it) => ({ ...it, href: it.href ? toEmbedPublicHref(it.href, context) : undefined })),
    similarRelated: data.similarRelated.map((it) => ({ ...it, href: it.href ? toEmbedPublicHref(it.href, context) : undefined })),
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
}>(data: T, context: 'preview' | 'dashboard' = 'preview'): T {
  return {
    ...data,
    basePath: toEmbedPublicHref(data.basePath, context),
    backHref: toEmbedPublicHref(data.backHref, context),
    profileHref: context === 'dashboard' ? '/dashboard/site' : embedProfileHref(data.entity.slug),
    bookingHref: toEmbedPublicHref(data.bookingHref, context),
    profileRelated: data.profileRelated.map((it) => ({ ...it, href: it.href ? toEmbedPublicHref(it.href, context) : undefined })),
    similarRelated: data.similarRelated.map((it) => ({ ...it, href: it.href ? toEmbedPublicHref(it.href, context) : undefined })),
  }
}
