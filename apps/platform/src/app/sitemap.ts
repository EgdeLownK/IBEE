import type { MetadataRoute } from 'next'
import { createPublicSupabaseClient, getSiteUrl } from '@/lib/site-url'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const supabase = createPublicSupabaseClient()

  const [entitiesResult, publicationsResult, servicesResult] = await Promise.all([
    supabase.from('entity').select('slug, updated_at').order('updated_at', { ascending: false }),
    supabase
      .from('publications')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    supabase
      .from('appointment_types')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
  ])

  if (entitiesResult.error || publicationsResult.error || servicesResult.error) {
    throw new Error('Sitemap: erreur Supabase')
  }

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  for (const entity of entitiesResult.data ?? []) {
    if (entity.slug.startsWith('__')) continue
    entries.push({
      url: `${siteUrl}/${entity.slug}`,
      lastModified: new Date(entity.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const pub of publicationsResult.data ?? []) {
    const entitySlug = (pub.entity as { slug: string }).slug
    entries.push({
      url: `${siteUrl}/${entitySlug}/news/${pub.slug}`,
      lastModified: new Date(pub.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const svc of servicesResult.data ?? []) {
    const entitySlug = (svc.entity as { slug: string }).slug
    entries.push({
      url: `${siteUrl}/${entitySlug}/services/${svc.slug}`,
      lastModified: new Date(svc.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  return entries
}
