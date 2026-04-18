/**
 * Purge Cloudflare cache par liste d'URLs.
 *
 * En dev (variables absentes) : log + return.
 * En prod : appel API Cloudflare Purge Cache par URL.
 * Ne throw jamais — la mutation Supabase est déjà committée.
 */
async function purgeUrls(urls: string[], label: string): Promise<void> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!zoneId || !apiToken) {
    console.log(`[cache] purge skip (dev) — ${label}`)
    return
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
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

/**
 * Purge Cloudflare cache pour une entity (profil + homepage).
 */
export async function purgeEntityCache(
  slug: string,
  siteUrl: string
): Promise<void> {
  await purgeUrls(
    [`${siteUrl}/${slug}`, `${siteUrl}/`],
    `/${slug}`
  )
}

/**
 * Purge Cloudflare cache pour une publication (permalien + profil + homepage).
 */
export async function purgePublicationCache(
  entitySlug: string,
  publicationSlug: string,
  siteUrl: string
): Promise<void> {
  await purgeUrls(
    [
      `${siteUrl}/${entitySlug}/news/${publicationSlug}`,
      `${siteUrl}/${entitySlug}`,
      `${siteUrl}/`,
    ],
    `/${entitySlug}/news/${publicationSlug}`
  )
}
