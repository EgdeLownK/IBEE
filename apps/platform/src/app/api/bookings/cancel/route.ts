import { NextResponse } from 'next/server'
import { canCancelBookingByPolicy, getBookingById, updateBookingStatus } from '@ibee/supabase'
import { verifyBookingCancelToken } from '@/lib/booking-cancel-token'
import { refundBookingPayment } from '@/lib/booking-refund'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''

    const parsed = verifyBookingCancelToken(token)
    if (!parsed) {
      return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const booking = await getBookingById(supabase, parsed.bookingId)

    if (!booking) {
      return NextResponse.json({ error: 'Rendez-vous introuvable.' }, { status: 404 })
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: true, alreadyCancelled: true })
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Ce rendez-vous ne peut plus être annulé.' },
        { status: 400 },
      )
    }

    const cancelMinHours = booking.appointment_types?.cancel_min_hours ?? 24
    if (!canCancelBookingByPolicy(booking.start_at, cancelMinHours)) {
      return NextResponse.json(
        { error: 'Le délai d’annulation est dépassé pour ce rendez-vous.' },
        { status: 400 },
      )
    }

    if (booking.payment_status === 'paid' && booking.stripe_payment_intent_id) {
      await refundBookingPayment(supabase, booking.id, booking.stripe_payment_intent_id)
    }

    await updateBookingStatus(supabase, booking.id, 'cancelled', 'booker')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/bookings/cancel]', err)
    return NextResponse.json({ error: 'Erreur lors de l’annulation.' }, { status: 500 })
  }
}
