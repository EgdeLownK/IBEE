import type { APIRoute } from 'astro'
import { supabase } from '../lib/supabase/client'

export const GET: APIRoute = async () => {
  const siteUrl = import.meta.env.SITE_URL

  const [entitiesResult, publicationsResult, servicesResult] = await Promise.all([
    supabase
      .from('entity')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('publications')
      .select('id, slug, entity_id, updated_at, entity!inner(slug)')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    (supabase as any)
      .from('appointment_types')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
  ])

  if (entitiesResult.error || publicationsResult.error || servicesResult.error) {
    return new Response('Internal Server Error', { status: 500 })
  }

  const entityUrls = (entitiesResult.data ?? [])
    .filter((entity) => !entity.slug.startsWith('__'))
    .map(
      (entity) => `  <url>
    <loc>${siteUrl}/${entity.slug}</loc>
    <lastmod>${new Date(entity.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n')

  const pubUrls = (publicationsResult.data ?? [])
    .map((pub) => {
      const entityData = pub.entity as unknown as { slug: string }
      return `  <url>
    <loc>${siteUrl}/${entityData.slug}/news/${pub.slug}</loc>
    <lastmod>${new Date(pub.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    })
    .join('\n')

  const serviceUrls = (servicesResult.data ?? [])
    .map((svc: any) => {
      const entityData = svc.entity as { slug: string }
      return `  <url>
    <loc>${siteUrl}/${entityData.slug}/services/${svc.slug}</loc>
    <lastmod>${new Date(svc.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${entityUrls}
${pubUrls}
${serviceUrls}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
