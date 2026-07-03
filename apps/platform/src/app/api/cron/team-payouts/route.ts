import { NextResponse } from 'next/server'
import { runDuePayoutSchedules } from '@ibee/supabase'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true

  return request.headers.get('x-cron-secret') === secret
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Non autorisé.' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const result = await runDuePayoutSchedules(supabase)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[cron/team-payouts]', error)
    const message = error instanceof Error ? error.message : 'Erreur interne.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
