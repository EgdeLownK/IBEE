import { NextResponse } from 'next/server'
import { cancelEventRegistration } from '@ibee/supabase'
import { canCancelRegistrationByPolicy } from '@/lib/event-registration-fields'
import { verifyEventCancelToken } from '@/lib/event-cancel-token'
import { refundEventOrderPayment } from '@/lib/event-refund'
import { sendEventCancellationEmail } from '@/lib/event-registration-email'
import { createServiceClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token.trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })
  }

  const parsed = verifyEventCancelToken(token)
  if (!parsed) {
    return NextResponse.json({ error: 'Lien expiré ou invalide.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: registration, error } = await supabase
    .from('event_registrations')
    .select(
      '*, events(title, start_at, cancel_min_hours), orders(stripe_payment_intent_id, status, total_cents)',
    )
    .eq('id', parsed.registrationId)
    .maybeSingle()

  if (error || !registration || registration.status !== 'confirmed') {
    return NextResponse.json({ error: 'Inscription introuvable.' }, { status: 404 })
  }

  const event = registration.events as {
    title: string
    start_at: string
    cancel_min_hours: number
  } | null
  if (!event) {
    return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  }

  if (!canCancelRegistrationByPolicy(event.start_at, event.cancel_min_hours ?? 24)) {
    return NextResponse.json(
      { error: 'Le délai d’annulation est dépassé pour cet événement.' },
      { status: 403 },
    )
  }

  try {
    await cancelEventRegistration(supabase, registration.id)

    const order = registration.orders as
      | { stripe_payment_intent_id: string | null; status: string; total_cents: number }
      | null
      | undefined

    let refundCents = 0
    if (registration.order_id && order?.stripe_payment_intent_id && order.status === 'paid') {
      refundCents = await refundEventOrderPayment(
        supabase,
        registration.order_id,
        order.stripe_payment_intent_id,
      )
      await supabase
        .from('event_registrations')
        .update({ refund_cents: refundCents })
        .eq('id', registration.id)
    }

    void sendEventCancellationEmail({
      attendeeName: registration.attendee_name,
      attendeeEmail: registration.attendee_email,
      eventTitle: event.title,
      refunded: refundCents > 0,
      refundCents,
      currency: 'EUR',
    })

    return NextResponse.json({ success: true, refunded: refundCents > 0 })
  } catch (err) {
    console.error('[api/events/cancel]', err)
    return NextResponse.json({ error: 'Impossible d’annuler l’inscription.' }, { status: 500 })
  }
}
