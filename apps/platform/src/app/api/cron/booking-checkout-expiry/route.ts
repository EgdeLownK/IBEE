import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { expireStaleBookingCheckouts, expireStaleEventTicketCheckouts } from '@ibee/supabase'

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
    const [bookingExpired, eventExpired] = await Promise.all([
      expireStaleBookingCheckouts(supabase),
      expireStaleEventTicketCheckouts(supabase),
    ])
    return NextResponse.json({ ok: true, bookingExpired, eventExpired })
  } catch (err) {
    console.error('[cron:booking-checkout-expiry]', err)
    return NextResponse.json({ ok: false, error: 'Erreur interne.' }, { status: 500 })
  }
}
