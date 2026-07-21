'use server'

import { revalidatePath } from 'next/cache'
import {
  cancelEventRegistration,
  checkInEventRegistration,
  banClientByEmail,
  unbanClient,
  countEventActivityHolds,
  countEventRegistrations,
  createEventRegistration,
  getEventById,
  getTicketTypeById,
  isEntityEmailBanned,
  listActivitiesByEvent,
  listTicketTypesByEvent,
  createManualRegContactSession,
  getManualRegContactSessionById,
  consumeManualRegContactSession,
} from '@ibee/supabase'
import { refundEventOrderPayment } from '@/lib/event-refund'
import { sendEventCancellationEmail } from '@/lib/event-registration-email'
import { requireDashboardContext } from '@/lib/dashboard-context'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import { randomBytes } from 'crypto'

const BILLETTERIE_PATH = '/dashboard/billetterie'
const CHECKIN_PATH = '/dashboard/billetterie/check-in'
const MANUAL_REG_CONTACT_TTL_MS = 15 * 60 * 1000

function createManualRegContactToken(): string {
  return randomBytes(9).toString('base64url')
}

function revalidateBilletterie() {
  revalidatePath(BILLETTERIE_PATH)
  revalidatePath(CHECKIN_PATH)
  revalidatePath('/dashboard/participants')
}

export async function cancelRegistrationAction(registrationId: string) {
  const ctx = await requireDashboardContext()

  try {
    const { data: existing } = await ctx.supabase
      .from('event_registrations')
      .select('id, entity_id, status, attendee_name, attendee_email, order_id, events(title, start_at, cancel_min_hours)')
      .eq('id', registrationId)
      .maybeSingle()

    if (!existing || existing.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Inscription introuvable.' }
    }

    if (existing.status === 'cancelled') {
      return { ok: true as const }
    }

    const event = existing.events as { title: string; start_at: string; cancel_min_hours: number } | null
    // Owner dashboard : annulation toujours autorisée (politique visiteur ignorée).

    let refundCents = 0
    if (existing.order_id) {
      const { data: order } = await ctx.supabase
        .from('orders')
        .select('stripe_payment_intent_id, status')
        .eq('id', existing.order_id)
        .maybeSingle()

      if (order?.stripe_payment_intent_id && order.status === 'paid') {
        refundCents = await refundEventOrderPayment(
          ctx.supabase,
          existing.order_id,
          order.stripe_payment_intent_id
        )
      }
    }

    await cancelEventRegistration(ctx.supabase, registrationId)

    if (refundCents > 0) {
      await ctx.supabase
        .from('event_registrations')
        .update({ refund_cents: refundCents })
        .eq('id', registrationId)
    }

    if (event) {
      void sendEventCancellationEmail({
        attendeeName: existing.attendee_name,
        attendeeEmail: existing.attendee_email,
        eventTitle: event.title,
        refunded: refundCents > 0,
        refundCents,
        currency: 'EUR',
      })
    }

    revalidateBilletterie()
    return { ok: true as const }
  } catch (err) {
    console.error('[cancelRegistrationAction]', err)
    return { ok: false as const, error: 'Impossible d’annuler l’inscription.' }
  }
}

export async function checkInRegistrationAction(input: {
  ticketCode: string
  eventId: string
}) {
  const ctx = await requireDashboardContext()

  try {
    const result = await checkInEventRegistration(ctx.supabase, {
      entityId: ctx.entity.id,
      ticketCode: input.ticketCode,
      eventId: input.eventId,
    })

    if (result.status === 'checked_in') {
      revalidateBilletterie()
    }

    return { ok: true as const, result }
  } catch (err) {
    console.error('[checkInRegistrationAction]', err)
    return { ok: false as const, error: 'Impossible de valider ce billet.' }
  }
}

export async function banClientAction(input: {
  email: string
  name?: string
  phone?: string | null
}) {
  const ctx = await requireDashboardContext()
  const email = input.email.trim()
  if (!email || !email.includes('@')) {
    return { ok: false as const, error: 'Email invalide.' }
  }

  try {
    await banClientByEmail(ctx.supabase, {
      entityId: ctx.entity.id,
      email,
      name: input.name,
      phone: input.phone,
    })
    revalidateBilletterie()
    revalidatePath('/dashboard/service')
    return { ok: true as const }
  } catch (err) {
    console.error('[banClientAction]', err)
    return { ok: false as const, error: 'Impossible de bannir ce client.' }
  }
}

export async function unbanClientAction(clientId: string) {
  const ctx = await requireDashboardContext()
  if (!clientId) {
    return { ok: false as const, error: 'Client introuvable.' }
  }

  try {
    await unbanClient(ctx.supabase, ctx.entity.id, clientId)
    revalidateBilletterie()
    revalidatePath('/dashboard/service')
    return { ok: true as const }
  } catch (err) {
    console.error('[unbanClientAction]', err)
    return { ok: false as const, error: 'Impossible de débannir ce client.' }
  }
}

export async function loadManualParticipantFormAction(eventId: string) {
  const ctx = await requireDashboardContext()
  if (!eventId) return { ok: false as const, error: 'Événement introuvable.' }

  const event = await getEventById(ctx.supabase, eventId)
  if (!event || event.entity_id !== ctx.entity.id) {
    return { ok: false as const, error: 'Événement introuvable.' }
  }

  const [activities, ticketTypes] = await Promise.all([
    listActivitiesByEvent(ctx.supabase, eventId, { publishedOnly: false }),
    listTicketTypesByEvent(ctx.supabase, eventId, { activeOnly: true }),
  ])

  return {
    ok: true as const,
    event: { id: event.id, title: event.title, slug: event.slug },
    entitySlug: ctx.entity.slug,
    places: activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
    })),
    ticketTypes: ticketTypes.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      activityId: ticket.activity_id,
      priceCents: ticket.price_cents,
    })),
  }
}

export async function createManualRegistrationAction(input: {
  eventId: string
  name: string
  email: string
  phone?: string | null
  activityId?: string | null
  ticketTypeId?: string | null
}) {
  const ctx = await requireDashboardContext()
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone?.trim() || null

  if (name.length < 1 || name.length > 200) {
    return { ok: false as const, error: 'Nom invalide.' }
  }
  if (email.length < 5 || !email.includes('@')) {
    return { ok: false as const, error: 'Email invalide.' }
  }
  if (phone && phone.length > 30) {
    return { ok: false as const, error: 'Téléphone invalide.' }
  }

  const event = await getEventById(ctx.supabase, input.eventId)
  if (!event || event.entity_id !== ctx.entity.id) {
    return { ok: false as const, error: 'Événement introuvable.' }
  }

  const activities = await listActivitiesByEvent(ctx.supabase, event.id, { publishedOnly: false })
  const hasActivities = activities.length > 0
  let resolvedActivityId: string | null = null

  if (hasActivities) {
    if (!input.activityId) {
      return { ok: false as const, error: 'Sélectionnez une place.' }
    }
    const activity = activities.find((item) => item.id === input.activityId)
    if (!activity) {
      return { ok: false as const, error: 'Place introuvable.' }
    }
    if (activity.capacity != null) {
      const holds = await countEventActivityHolds(ctx.supabase, activity.id)
      if (holds >= activity.capacity) {
        return { ok: false as const, error: 'Cette place est complète.' }
      }
    }
    resolvedActivityId = activity.id
  } else if (event.capacity != null) {
    const holds = await countEventRegistrations(ctx.supabase, event.id)
    if (holds >= event.capacity) {
      return { ok: false as const, error: 'Événement complet.' }
    }
  }

  let ticketTypeId: string | null = input.ticketTypeId?.trim() || null
  if (ticketTypeId) {
    const ticketType = await getTicketTypeById(ctx.supabase, ticketTypeId)
    if (!ticketType || ticketType.event_id !== event.id) {
      return { ok: false as const, error: 'Type de billet introuvable.' }
    }
    if (hasActivities && ticketType.activity_id !== resolvedActivityId) {
      return { ok: false as const, error: 'Ce billet ne correspond pas à la place.' }
    }
  }

  try {
    const banned = await isEntityEmailBanned(ctx.supabase, ctx.entity.id, email)
    if (banned) {
      return { ok: false as const, error: 'Cette adresse email est bannie.' }
    }
  } catch {
    return { ok: false as const, error: 'Impossible de vérifier l’email.' }
  }

  try {
    const registration = await createEventRegistration(ctx.supabase, {
      event_id: event.id,
      entity_id: event.entity_id,
      activity_id: resolvedActivityId,
      attendee_name: name,
      attendee_email: email,
      attendee_phone: phone,
      ticket_type_id: ticketTypeId,
      price_cents: 0,
      form_answers: {},
    })

    revalidateBilletterie()
    revalidateAfterEntityMutation(ctx.entity.slug, { eventSlug: event.slug })

    return {
      ok: true as const,
      ticketCode: registration.ticket_code,
      registrationId: registration.id,
    }
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505') {
      return { ok: false as const, error: 'Cet email est déjà inscrit à cet événement.' }
    }
    console.error('[createManualRegistrationAction]', err)
    return { ok: false as const, error: 'Impossible d’ajouter ce participant.' }
  }
}

export async function createManualRegContactSessionAction(eventId: string) {
  const ctx = await requireDashboardContext()
  if (!eventId) return { ok: false as const, error: 'Événement introuvable.' }

  const event = await getEventById(ctx.supabase, eventId)
  if (!event || event.entity_id !== ctx.entity.id) {
    return { ok: false as const, error: 'Événement introuvable.' }
  }

  try {
    const token = createManualRegContactToken()
    const expiresAt = new Date(Date.now() + MANUAL_REG_CONTACT_TTL_MS).toISOString()
    const session = await createManualRegContactSession(ctx.supabase, {
      entityId: ctx.entity.id,
      eventId: event.id,
      token,
      createdBy: ctx.user.id,
      expiresAt,
    })

    return {
      ok: true as const,
      sessionId: session.id,
      token: session.token,
      entitySlug: ctx.entity.slug,
      eventSlug: event.slug,
      expiresAt: session.expiresAt,
    }
  } catch (err) {
    console.error('[createManualRegContactSessionAction]', err)
    return { ok: false as const, error: 'Impossible de créer le QR contact.' }
  }
}

export async function pollManualRegContactSessionAction(sessionId: string) {
  const ctx = await requireDashboardContext()
  if (!sessionId) return { ok: false as const, error: 'Session introuvable.' }

  try {
    const session = await getManualRegContactSessionById(ctx.supabase, sessionId)
    if (!session || session.entityId !== ctx.entity.id) {
      return { ok: false as const, error: 'Session introuvable.' }
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return { ok: true as const, status: 'expired' as const }
    }

    if (session.status === 'filled' && session.attendeeEmail) {
      return {
        ok: true as const,
        status: 'filled' as const,
        contact: {
          name: session.attendeeName ?? '',
          email: session.attendeeEmail,
          phone: session.attendeePhone ?? '',
        },
      }
    }

    return { ok: true as const, status: session.status }
  } catch (err) {
    console.error('[pollManualRegContactSessionAction]', err)
    return { ok: false as const, error: 'Impossible de récupérer la session.' }
  }
}

export async function consumeManualRegContactSessionAction(sessionId: string) {
  const ctx = await requireDashboardContext()
  if (!sessionId) return { ok: false as const, error: 'Session introuvable.' }

  try {
    const session = await getManualRegContactSessionById(ctx.supabase, sessionId)
    if (!session || session.entityId !== ctx.entity.id) {
      return { ok: false as const, error: 'Session introuvable.' }
    }

    await consumeManualRegContactSession(ctx.supabase, sessionId)
    return { ok: true as const }
  } catch (err) {
    console.error('[consumeManualRegContactSessionAction]', err)
    return { ok: false as const, error: 'Impossible de clôturer la session.' }
  }
}
