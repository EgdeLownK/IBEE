/**
 * Invalidation cache public IBEE.
 *
 * - Vercel / Next.js : `getRevalidatePaths` + `revalidatePath` côté dashboard.
 * - Astro / Cloudflare Pages (transition) : `purgeEntityCache` / `purgePublicationCache`.
 *
 * La purge Cloudflare est ignorée sur Vercel et en dev (vars absentes).
 * Ne throw jamais — la mutation Supabase est déjà committée.
 */

export type RevalidatePathsOptions = {
  publicationSlug?: string
  productSlug?: string
  serviceSlug?: string
  eventSlug?: string
}

function isCloudflarePurgeEnabled(): boolean {
  if (process.env.VERCEL) return false
  return Boolean(process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN)
}

/** Chemins Next.js à revalider après mutation studio (profil public). */
export function getRevalidatePaths(
  entitySlug: string,
  options?: RevalidatePathsOptions
): readonly string[] {
  const paths = new Set<string>(['/', `/${entitySlug}`])

  if (options?.publicationSlug) {
    paths.add(`/${entitySlug}/news/${options.publicationSlug}`)
  }
  if (options?.productSlug) {
    paths.add(`/${entitySlug}/shop/${options.productSlug}`)
  }
  if (options?.serviceSlug) {
    paths.add(`/${entitySlug}/services/${options.serviceSlug}`)
  }
  if (options?.eventSlug) {
    paths.add(`/${entitySlug}/events/${options.eventSlug}`)
  }

  return [...paths]
}

function entityPurgeUrls(slug: string, siteUrl: string): string[] {
  return getRevalidatePaths(slug).map((path) =>
    path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`
  )
}

function publicationPurgeUrls(
  entitySlug: string,
  publicationSlug: string,
  siteUrl: string
): string[] {
  return getRevalidatePaths(entitySlug, { publicationSlug }).map((path) =>
    path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`
  )
}

async function purgeUrls(urls: string[], label: string): Promise<void> {
  if (!isCloudflarePurgeEnabled()) {
    const reason = process.env.VERCEL ? 'vercel' : 'dev'
    console.log(`[cache] purge skip (${reason}) — ${label}`)
    return
  }

  const zoneId = process.env.CLOUDFLARE_ZONE_ID!
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    )

    if (!res.ok) {
      const body = await res.text()
      console.error(`[cache] purge failed (${res.status}) — ${body}`)
    }
  } catch (err) {
    console.error('[cache] purge error —', err)
  }
}

/** Purge Cloudflare cache pour une entity (profil + homepage). */
export async function purgeEntityCache(slug: string, siteUrl: string): Promise<void> {
  await purgeUrls(entityPurgeUrls(slug, siteUrl), `/${slug}`)
}

/** Purge Cloudflare cache pour une publication (permalien + profil + homepage). */
export async function purgePublicationCache(
  entitySlug: string,
  publicationSlug: string,
  siteUrl: string
): Promise<void> {
  await purgeUrls(
    publicationPurgeUrls(entitySlug, publicationSlug, siteUrl),
    `/${entitySlug}/news/${publicationSlug}`
  )
}
