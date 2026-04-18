import type { APIRoute } from 'astro'
import { supabase } from '../../lib/supabase/client'

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? ''
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const limit = parseInt(url.searchParams.get('limit') ?? '15', 10)

  if (!q) {
    return new Response(JSON.stringify({ results: [], hasMore: false }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    })
  }

  const pattern = `%${q}%`

  const { data, error } = await supabase
    .from('entity')
    .select('slug, display_name, role, location, avatar_url')
    .or(`slug.ilike.${pattern},display_name.ilike.${pattern},role.ilike.${pattern},location.ilike.${pattern}`)
    .order('display_name', { ascending: true })
    .range(offset, offset + limit)

  if (error) {
    return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500 })
  }

  const results = data ?? []
  const hasMore = results.length > limit
  const trimmed = hasMore ? results.slice(0, limit) : results

  return new Response(JSON.stringify({ results: trimmed, hasMore }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
  })
}
