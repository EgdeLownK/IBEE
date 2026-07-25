import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  completeBookingCheckout,
  completeCheckoutOrder,
  completeEventTicketCheckout,
  getBookingById,
  getOrderById,
  getRegistrationByOrderId,
  trackEvent,
} from '@ibee/supabase'
import { notifyBookingCreated } from '@/lib/booking-notifications'
import { notifyEventRegistrationCreated } from '@/lib/event-registration-notifications'
import { createServiceClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[api/checkout/webhook] STRIPE_WEBHOOK_SECRET manquante')
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    console.error('[api/checkout/webhook] signature', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (!session.id) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 400 })
  }

  const checkoutKind = session.metadata?.checkout_kind
  const isBooking = checkoutKind === 'booking' || Boolean(session.metadata?.booking_id)
  const isEvent = checkoutKind === 'event' || Boolean(session.metadata?.event_id)

  try {
    const supabase = createServiceClient()

    if (isBooking) {
      const bookingId = await completeBookingCheckout(supabase, {
        stripeSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
      })

      const booking = await getBookingById(supabase, bookingId)
      if (booking) {
        await trackEvent(supabase, {
          entity_id: booking.entity_id,
          event_type: 'booking_checkout_completed',
          resource_id: booking.appointment_type_id,
          metadata: {
            booking_id: bookingId,
            amount_cents: booking.price_cents,
          },
        })

        void notifyBookingCreated({
          id: booking.id,
          entity_id: booking.entity_id,
          appointment_type_id: booking.appointment_type_id,
          booker_name: booking.booker_name,
          booker_email: booking.booker_email,
          start_at: booking.start_at,
          end_at: booking.end_at,
          status: booking.status,
        })
      }

      return NextResponse.json({ received: true, bookingId })
    }

    if (isEvent) {
      const orderId = await completeEventTicketCheckout(supabase, {
        stripeSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
      })

      const registration = await getRegistrationByOrderId(supabase, orderId)
      if (registration) {
        await trackEvent(supabase, {
          entity_id: registration.entity_id,
          event_type: 'event_checkout_completed',
          resource_id: registration.event_id,
          metadata: {
            order_id: orderId,
            registration_id: registration.id,
            amount_cents: registration.price_cents,
          },
        })

        void notifyEventRegistrationCreated({
          id: registration.id,
          entity_id: registration.entity_id,
          event_id: registration.event_id,
          attendee_name: registration.attendee_name,
          attendee_email: registration.attendee_email,
          ticket_type_id: registration.ticket_type_id,
          ticket_code: registration.ticket_code,
          price_cents: registration.price_cents,
        })
      }

      return NextResponse.json({ received: true, orderId })
    }

    const orderId = await completeCheckoutOrder(supabase, {
      stripeSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      buyerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      buyerName: session.customer_details?.name ?? null,
    })

    const order = await getOrderById(supabase, orderId)
    if (order) {
      const productId = order.order_lines?.[0]?.product_id ?? null
      await trackEvent(supabase, {
        entity_id: order.entity_id,
        event_type: 'checkout_completed',
        resource_id: productId,
        metadata: {
          order_id: orderId,
          total_cents: order.total_cents,
        },
      })
    }

    return NextResponse.json({ received: true, orderId })
  } catch (err: unknown) {
    console.error('[api/checkout/webhook] complete', err)
    return NextResponse.json({ error: 'Traitement webhook échoué' }, { status: 500 })
  }
}
