import { NextResponse } from 'next/server'
import { getEventEntreePublicStats } from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')?.trim() ?? ''

  if (!eventId) {
    return NextResponse.json({ error: 'Événement requis.' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const stats = await getEventEntreePublicStats(supabase, eventId)
    if (!stats) {
      return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
    }

    return NextResponse.json(stats)
  } catch (err) {
    console.error('[api/events/entree-stats]', err)
    return NextResponse.json({ error: 'Impossible de charger les stats.' }, { status: 500 })
  }
}
