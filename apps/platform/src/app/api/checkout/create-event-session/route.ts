import { NextResponse } from 'next/server'
import {
  attachStripeSessionToOrder,
  createEventTicketCheckout,
  getOrderById,
  getTicketTypeById,
  resolveEventTicketPriceCents,
  trackEvent,
} from '@ibee/supabase'
import { parseEventRegistrationFields, validateFormAnswers } from '@/lib/event-registration-fields'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getWebBaseUrl } from '@/lib/stripe'

type Body = {
  entityId?: string
  entitySlug?: string
  eventSlug?: string
  eventId?: string
  ticketTypeId?: string
  attendeeName?: string
  attendeeEmail?: string
  attendeePhone?: string | null
  attendeeMessage?: string | null
  promoCode?: string | null
  formAnswers?: Record<string, string | boolean> | null
  autoRegister?: boolean
}

function mapPromoError(detail: string): string {
  if (detail.includes('promo_invalid')) return 'Code promo invalide.'
  if (detail.includes('promo_expired')) return 'Ce code promo a expiré.'
  if (detail.includes('promo_not_started')) return 'Ce code promo n’est pas encore actif.'
  if (detail.includes('promo_not_applicable'))
    return 'Ce code promo ne s’applique pas à cet événement.'
  if (detail.includes('promo_min_purchase')) return 'Montant minimum non atteint pour ce code.'
  if (detail.includes('promo_max_uses')) return 'Ce code promo n’est plus disponible.'
  return 'Code promo invalide.'
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Le paiement en ligne n’est pas encore configuré.' },
        { status: 503 },
      )
    }

    const body = (await request.json()) as Body
    const entityId = body.entityId?.trim()
    const eventId = body.eventId?.trim()
    const ticketTypeId = body.ticketTypeId?.trim()
    const attendeeName = body.attendeeName?.trim()
    const attendeeEmail = body.attendeeEmail?.trim()
    const entitySlug = body.entitySlug?.trim()
    const eventSlug = body.eventSlug?.trim()
    const promoCode = body.promoCode?.trim() || null

    if (!entityId || !eventId || !ticketTypeId || !attendeeName || !attendeeEmail) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: eventRow } = await supabase
      .from('events')
      .select('title, registration_fields')
      .eq('id', eventId)
      .maybeSingle()

    const fields = parseEventRegistrationFields(eventRow?.registration_fields)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    const skipCustomFields = body.autoRegister === true && !!authUser
    const validatedAnswers = skipCustomFields
      ? { ok: true as const, answers: {} as Record<string, string | boolean> }
      : validateFormAnswers(fields, body.formAnswers ?? {})
    if (!validatedAnswers.ok) {
      return NextResponse.json({ error: validatedAnswers.error }, { status: 400 })
    }

    const ticketType = await getTicketTypeById(supabase, ticketTypeId)
    if (!ticketType || ticketType.entity_id !== entityId || ticketType.event_id !== eventId) {
      return NextResponse.json({ error: 'Type de billet introuvable.' }, { status: 404 })
    }

    const priceCents = resolveEventTicketPriceCents(ticketType)
    if (priceCents <= 0) {
      return NextResponse.json(
        { error: 'Ce billet ne nécessite pas de paiement en ligne.' },
        { status: 400 },
      )
    }

    const orderId = await createEventTicketCheckout(supabase, {
      entityId,
      eventId,
      ticketTypeId,
      attendeeName,
      attendeeEmail,
      attendeePhone: body.attendeePhone ?? null,
      attendeeMessage: body.attendeeMessage ?? null,
      promoCode,
      formAnswers: validatedAnswers.answers,
    })

    const order = await getOrderById(supabase, orderId)
    const chargeCents = order?.total_cents ?? priceCents

    const baseUrl = getWebBaseUrl()
    const slug = entitySlug ?? ''
    const evtSlug = eventSlug ?? ''
    const eventPath = slug && evtSlug ? `/${slug}/events/${evtSlug}` : '/'
    const confirmedPath = slug && evtSlug ? `/${slug}/events/${evtSlug}/confirmed` : '/'

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (ticketType.currency ?? 'EUR').toLowerCase(),
            unit_amount: chargeCents,
            product_data: {
              name: ticketType.title,
              description: eventRow?.title ?? 'Billet événement',
            },
          },
        },
      ],
      metadata: {
        checkout_kind: 'event',
        order_id: orderId,
        entity_id: entityId,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
      },
      success_url: `${baseUrl}${confirmedPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${eventPath}?checkout=cancelled`,
      customer_email: attendeeEmail,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Impossible de démarrer le paiement.' }, { status: 500 })
    }

    await attachStripeSessionToOrder(supabase, orderId, session.id)

    await trackEvent(supabase, {
      entity_id: entityId,
      event_type: 'event_checkout_started',
      resource_id: eventId,
      metadata: {
        order_id: orderId,
        ticket_type_id: ticketTypeId,
        amount_cents: chargeCents,
        promo_code: promoCode,
      },
    })

    return NextResponse.json({ url: session.url, orderId })
  } catch (err: unknown) {
    console.error('[api/checkout/create-event-session]', err)
    const message = err instanceof Error ? err.message : ''
    const detail =
      typeof err === 'object' && err !== null && 'details' in err
        ? String((err as { details?: string }).details)
        : message

    if (detail.includes('promo_')) {
      return NextResponse.json({ error: mapPromoError(detail) }, { status: 400 })
    }

    const isFull =
      detail.includes('event_full') ||
      detail.includes('ticket_quota_reached') ||
      message.includes('event_full')
    return NextResponse.json(
      { error: isFull ? 'Plus de places disponibles pour ce billet.' : 'Erreur lors du paiement.' },
      { status: isFull ? 409 : 400 },
    )
  }
}
