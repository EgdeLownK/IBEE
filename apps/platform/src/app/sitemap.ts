import type { MetadataRoute } from 'next'
import { createPublicSupabaseClient, getSiteUrl } from '@/lib/site-url'

export const revalidate = 300

export async function generateSitemaps() {
  // 0: static pages
  // 1: profiles
  // 2: publications
  // 3: services
  // 4: products
  // 5: events
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const supabase = createPublicSupabaseClient()
  const now = new Date().toISOString()
  const entries: MetadataRoute.Sitemap = []

  if (id === 0) {
    entries.push(
      { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
      { url: `${siteUrl}/explore`, changeFrequency: 'daily', priority: 0.9 },
    )
  }

  if (id === 1) {
    const { data, error } = await supabase
      .from('entity')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50000)
    if (error) throw new Error('Sitemap: erreur Supabase profiles')
    for (const entity of data ?? []) {
      if (entity.slug.startsWith('__')) continue
      entries.push({
        url: `${siteUrl}/${entity.slug}`,
        lastModified: new Date(entity.updated_at),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  if (id === 2) {
    const { data, error } = await supabase
      .from('publications')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .limit(50000)
    if (error) throw new Error('Sitemap: erreur Supabase publications')
    for (const pub of data ?? []) {
      const entitySlug = (pub.entity as { slug: string }).slug
      entries.push({
        url: `${siteUrl}/${entitySlug}/news/${pub.slug}`,
        lastModified: new Date(pub.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  if (id === 3) {
    const { data, error } = await supabase
      .from('appointment_types')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50000)
    if (error) throw new Error('Sitemap: erreur Supabase services')
    for (const svc of data ?? []) {
      const entitySlug = (svc.entity as { slug: string }).slug
      entries.push({
        url: `${siteUrl}/${entitySlug}/services/${svc.slug}`,
        lastModified: new Date(svc.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  if (id === 4) {
    const { data, error } = await supabase
      .from('products')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .order('updated_at', { ascending: false })
      .limit(50000)
    if (error) throw new Error('Sitemap: erreur Supabase products')
    for (const product of data ?? []) {
      const entitySlug = (product.entity as { slug: string }).slug
      entries.push({
        url: `${siteUrl}/${entitySlug}/shop/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  if (id === 5) {
    const { data, error } = await supabase
      .from('events')
      .select('slug, updated_at, entity!inner(slug)')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(50000)
    if (error) throw new Error('Sitemap: erreur Supabase events')
    for (const event of data ?? []) {
      const entitySlug = (event.entity as { slug: string }).slug
      entries.push({
        url: `${siteUrl}/${entitySlug}/events/${event.slug}`,
        lastModified: new Date(event.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  return entries
}
