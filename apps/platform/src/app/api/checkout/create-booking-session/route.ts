import { NextResponse } from 'next/server'
import {
  attachStripeSessionToBooking,
  createBookingCheckout,
  getAppointmentTypeById,
  resolveAppointmentChargeCents,
  trackEvent,
} from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getWebBaseUrl } from '@/lib/stripe'

type Body = {
  entityId?: string
  entitySlug?: string
  serviceSlug?: string
  appointmentTypeId?: string
  bookerName?: string
  bookerEmail?: string
  bookerPhone?: string | null
  startAt?: string
  endAt?: string
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Le paiement en ligne n’est pas encore configuré.' },
        { status: 503 }
      )
    }

    const body = (await request.json()) as Body
    const entityId = body.entityId?.trim()
    const appointmentTypeId = body.appointmentTypeId?.trim()
    const bookerName = body.bookerName?.trim()
    const bookerEmail = body.bookerEmail?.trim()
    const startAt = body.startAt?.trim()
    const endAt = body.endAt?.trim()
    const entitySlug = body.entitySlug?.trim()
    const serviceSlug = body.serviceSlug?.trim()

    if (!entityId || !appointmentTypeId || !bookerName || !bookerEmail || !startAt || !endAt) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    const supabase = await createClient()
    const service = await getAppointmentTypeById(supabase, appointmentTypeId)
    if (!service || service.entity_id !== entityId || !service.is_active) {
      return NextResponse.json({ error: 'Service introuvable.' }, { status: 404 })
    }

    const chargeCents = resolveAppointmentChargeCents(service)
    if (chargeCents <= 0) {
      return NextResponse.json({ error: 'Ce service ne nécessite pas de paiement en ligne.' }, { status: 400 })
    }

    const bookingId = await createBookingCheckout(supabase, {
      entityId,
      appointmentTypeId,
      bookerName,
      bookerEmail,
      bookerPhone: body.bookerPhone ?? null,
      startAt,
      endAt,
      source: 'web',
    })

    const baseUrl = getWebBaseUrl()
    const slug = entitySlug ?? ''
    const svcSlug = serviceSlug ?? service.slug
    const bookingPath = slug
      ? `/${slug}/services/${svcSlug}/booking`
      : '/'
    const confirmedPath = slug
      ? `/${slug}/services/${svcSlug}/confirmed`
      : '/'

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (service.currency ?? 'EUR').toLowerCase(),
            unit_amount: chargeCents,
            product_data: {
              name: service.title,
              description:
                service.deposit_percent < 100
                  ? `Acompte ${service.deposit_percent}% — rendez-vous`
                  : 'Réservation de rendez-vous',
            },
          },
        },
      ],
      metadata: {
        checkout_kind: 'booking',
        booking_id: bookingId,
        entity_id: entityId,
        appointment_type_id: appointmentTypeId,
      },
      success_url: `${baseUrl}${confirmedPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${bookingPath}?checkout=cancelled`,
      customer_email: bookerEmail,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Impossible de démarrer le paiement.' }, { status: 500 })
    }

    await attachStripeSessionToBooking(supabase, bookingId, session.id)

    await trackEvent(supabase, {
      entity_id: entityId,
      event_type: 'booking_checkout_started',
      resource_id: appointmentTypeId,
      metadata: { booking_id: bookingId, amount_cents: chargeCents },
    })

    return NextResponse.json({ url: session.url, bookingId })
  } catch (err: unknown) {
    console.error('[api/checkout/create-booking-session]', err)
    const message = err instanceof Error ? err.message : 'Erreur lors du checkout'
    const isSlot =
      typeof message === 'string' &&
      (message.includes('slot_unavailable') || message.includes('plus disponible'))
    return NextResponse.json(
      { error: isSlot ? 'Ce créneau n’est plus disponible.' : 'Erreur lors du paiement.' },
      { status: isSlot ? 409 : 400 }
    )
  }
}
