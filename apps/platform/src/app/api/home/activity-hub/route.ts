import { PRIVATE_NO_STORE } from '@/lib/api-cache-headers'
import { NextResponse } from 'next/server'
import { getActivityHub } from '@ibee/supabase'
import { getDashboardContext } from '@/lib/dashboard-context'
import { getActivityCapabilities } from '@/lib/activity-capabilities'
import { filterActivitySignals } from '@/lib/load-activity-hub'

export async function GET() {
  const ctx = await getDashboardContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const [data, capabilities] = await Promise.all([
      getActivityHub(ctx.supabase, ctx.user.id, ctx.entity.id, {
        notificationLimit: 20,
      }),
      getActivityCapabilities(ctx.supabase, ctx.entity.id),
    ])

    return NextResponse.json(
      {
        ...data,
        capabilities,
        signals: filterActivitySignals(data.signals, capabilities),
      },
      { headers: { 'Cache-Control': PRIVATE_NO_STORE } },
    )
  } catch (err) {
    console.error('[api/home/activity-hub]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
