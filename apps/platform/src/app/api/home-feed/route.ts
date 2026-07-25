import { NextResponse } from 'next/server'
import { decodeHomeFeedCursor } from '@ibee/shared'
import { getHomeFeedPage } from '@/lib/home-feed'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = decodeHomeFeedCursor(searchParams.get('cursor'))
  const limit = Math.min(
    24,
    Math.max(4, Number.parseInt(searchParams.get('limit') ?? '12', 10) || 12),
  )

  try {
    const supabase = await createClient()
    const page = await getHomeFeedPage(supabase, { cursor, limit })

    return NextResponse.json(page, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (err) {
    console.error('[api/home-feed]', err)
    return NextResponse.json({ error: 'Impossible de charger le feed.' }, { status: 500 })
  }
}
