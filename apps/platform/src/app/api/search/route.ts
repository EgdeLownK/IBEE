import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = Number.parseInt(searchParams.get('limit') ?? '15', 10)

  if (!q) {
    return NextResponse.json(
      { results: [], hasMore: false },
      { headers: { 'Cache-Control': 'no-cache' } }
    )
  }

  const pattern = `%${q}%`
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity')
    .select('slug, display_name, role, location, avatar_url')
    .or(
      `slug.ilike.${pattern},display_name.ilike.${pattern},role.ilike.${pattern},location.ilike.${pattern}`
    )
    .order('display_name', { ascending: true })
    .range(offset, offset + limit)

  if (error) {
    console.error('[api/search]', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const results = data ?? []
  const hasMore = results.length > limit
  const trimmed = hasMore ? results.slice(0, limit) : results

  return NextResponse.json(
    { results: trimmed, hasMore },
    { headers: { 'Cache-Control': 'no-cache' } }
  )
}
