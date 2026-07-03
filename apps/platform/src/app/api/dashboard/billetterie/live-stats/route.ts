import { NextResponse } from 'next/server'
import { getEventCheckInLiveStats } from '@ibee/supabase'
import { requireDashboardContext } from '@/lib/dashboard-context'

export async function GET(request: Request) {
  const ctx = await requireDashboardContext().catch(() => null)
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eventId = new URL(request.url).searchParams.get('eventId')
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  try {
    const stats = await getEventCheckInLiveStats(ctx.supabase, ctx.entity.id, eventId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[billetterie/live-stats]', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
