import { PRIVATE_NO_STORE } from '@/lib/api-cache-headers'
import { NextResponse } from 'next/server'
import { getNotifications, getUnreadCount } from '@ibee/supabase'
import { getDashboardContext } from '@/lib/dashboard-context'

export async function GET() {
  const ctx = await getDashboardContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const [unreadCount, notifications] = await Promise.all([
      getUnreadCount(ctx.supabase, ctx.user.id),
      getNotifications(ctx.supabase, ctx.user.id, { limit: 5 }),
    ])

    return NextResponse.json(
      { unreadCount, notifications },
      { headers: { 'Cache-Control': PRIVATE_NO_STORE } }
    )
  } catch (err) {
    console.error('[api/dashboard/notifications]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
