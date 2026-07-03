import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  countEventActivityHolds,
  countEventTicketHolds,
  createEventRegistration,
  getActivityById,
  getEntityByUserId,
  getTicketTypeById,
  isEventActivityPast,
  listActivitiesByEvent,
  resolveEventTicketPriceCents,
  isEntityEmailBanned,
} from '@ibee/supabase'
import { notifyEventRegistrationCreated } from '@/lib/event-registration-notifications'
import { parseEventRegistrationFields, validateFormAnswers } from '@/lib/event-registration-fields'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))

  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
  const activityId =
    typeof body?.activityId === 'string' && body.activityId.trim().length > 0
      ? body.activityId.trim()
      : null
  const ticketTypeId =
    typeof body?.ticketTypeId === 'string' && body.ticketTypeId.trim().length > 0
      ? body.ticketTypeId.trim()
      : null
  let name = typeof body?.name === 'string' ? body.name.trim() : ''
  let email = typeof body?.email === 'string' ? body.email.trim() : ''
  const phone =
    typeof body?.phone === 'string' && body.phone.trim().length > 0 ? body.phone.trim() : null
  const message =
    typeof body?.message === 'string' && body.message.trim().length > 0 ? body.message.trim() : null

  if (!eventId) {
    return NextResponse.json({ error: 'Événement introuvable.' }, { status: 400 })
  }

  const supabase = await createClient()
  const autoRegister = body?.autoRegister === true
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!name || !email) {
    if (authUser?.email) {
      email = email || authUser.email
      if (!name) {
        try {
          const userEntity = await getEntityByUserId(supabase, authUser.id)
          name = userEntity?.display_name ?? authUser.email.split('@')[0]
        } catch {
          name = authUser.email.split('@')[0]
        }
      }
    }
  }

  if (name.length < 1 || name.length > 200) {
    return NextResponse.json({ error: 'Le nom est obligatoire (200 caractères max).' }, { status: 400 })
  }
  if (email.length < 5 || email.length > 320 || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
  }
  if (phone && phone.length > 30) {
    return NextResponse.json({ error: 'Téléphone invalide.' }, { status: 400 })
  }
  if (message && message.length > 2000) {
    return NextResponse.json({ error: 'Le message ne peut pas dépasser 2000 caractères.' }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, entity_id, start_at, capacity, is_published, price_cents, registration_fields')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    console.error('[api/events/register] fetch event', eventError)
    return NextResponse.json({ error: 'Erreur lors de la vérification de l\'événement.' }, { status: 500 })
  }
  if (!event || !event.is_published) {
    return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  }

  let publishedActivities: Awaited<ReturnType<typeof listActivitiesByEvent>> = []
  try {
    publishedActivities = await listActivitiesByEvent(supabase, event.id, { publishedOnly: true })
  } catch (err) {
    console.error('[api/events/register] list activities', err)
    return NextResponse.json({ error: 'Erreur lors de la vérification de l\'événement.' }, { status: 500 })
  }

  const hasActivities = publishedActivities.length > 0
  let resolvedActivityId: string | null = null

  if (hasActivities) {
    if (!activityId) {
      return NextResponse.json({ error: 'Sélectionnez une activité.' }, { status: 400 })
    }
    const activity = await getActivityById(supabase, activityId)
    if (!activity || activity.event_id !== event.id || !activity.is_published) {
      return NextResponse.json({ error: 'Activité introuvable.' }, { status: 404 })
    }
    if (isEventActivityPast(activity)) {
      return NextResponse.json({ error: 'Cette activité est déjà passée.' }, { status: 400 })
    }
    if (activity.capacity != null) {
      try {
        const count = await countEventActivityHolds(supabase, activity.id)
        if (count >= activity.capacity) {
          return NextResponse.json({ error: 'Cette activité est complète.' }, { status: 409 })
        }
      } catch (err) {
        console.error('[api/events/register] activity count', err)
        return NextResponse.json({ error: 'Erreur lors de la vérification des places.' }, { status: 500 })
      }
    }
    resolvedActivityId = activity.id
  } else if (new Date(event.start_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Cet événement est déjà passé.' }, { status: 400 })
  }

  try {
    if (await isEntityEmailBanned(supabase, event.entity_id, email)) {
      return NextResponse.json(
        { error: 'Inscription impossible pour cette adresse email.' },
        { status: 403 }
      )
    }
  } catch (err) {
    console.error('[api/events/register] ban check', err)
    return NextResponse.json({ error: 'Erreur lors de la vérification.' }, { status: 500 })
  }

  const fields = parseEventRegistrationFields(event.registration_fields)
  const skipCustomFields = autoRegister && !!authUser
  const validatedAnswers = skipCustomFields
    ? { ok: true as const, answers: {} as Record<string, string | boolean> }
    : validateFormAnswers(
        fields,
        (body?.formAnswers as Record<string, string | boolean> | undefined) ?? {}
      )
  if (!validatedAnswers.ok) {
    return NextResponse.json({ error: validatedAnswers.error }, { status: 400 })
  }

  let ticketPriceCents = 0
  if (ticketTypeId) {
    const ticketType = await getTicketTypeById(supabase, ticketTypeId)
    if (!ticketType || ticketType.event_id !== event.id) {
      return NextResponse.json({ error: 'Type de billet introuvable.' }, { status: 404 })
    }
    if (hasActivities) {
      if (!ticketType.activity_id || ticketType.activity_id !== resolvedActivityId) {
        return NextResponse.json({ error: 'Ce billet ne correspond pas à l\'activité sélectionnée.' }, { status: 400 })
      }
    } else if (ticketType.activity_id) {
      return NextResponse.json({ error: 'Type de billet introuvable.' }, { status: 404 })
    }
    ticketPriceCents = resolveEventTicketPriceCents(ticketType)
    if (ticketPriceCents > 0) {
      return NextResponse.json(
        { error: 'Ce billet nécessite un paiement en ligne.', requiresPayment: true },
        { status: 400 }
      )
    }
  } else if ((event.price_cents ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Sélectionnez un type de billet.', requiresPayment: true },
      { status: 400 }
    )
  }

  if (!hasActivities && event.capacity != null) {
    try {
      const count = await countEventTicketHolds(supabase, event.id)
      if (count >= event.capacity) {
        return NextResponse.json({ error: 'Cet événement est complet.' }, { status: 409 })
      }
    } catch (err) {
      console.error('[api/events/register] count', err)
      return NextResponse.json({ error: 'Erreur lors de la vérification des places.' }, { status: 500 })
    }
  }

  try {
    const registration = await createEventRegistration(supabase, {
      event_id: event.id,
      entity_id: event.entity_id,
      activity_id: resolvedActivityId,
      attendee_name: name,
      attendee_email: email,
      attendee_phone: phone,
      message,
      ticket_type_id: ticketTypeId,
      price_cents: ticketPriceCents,
      form_answers: validatedAnswers.answers,
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

    return NextResponse.json({
      success: true,
      ticketCode: registration.ticket_code,
    })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505') {
      return NextResponse.json({
        error: hasActivities
          ? 'Cet email est déjà inscrit à cette activité.'
          : 'Cet email est déjà inscrit à cet événement.',
      }, { status: 409 })
    }
    console.error('[api/events/register] insert', err)
    return NextResponse.json({ error: 'Erreur lors de l\'inscription.' }, { status: 500 })
  }
}
