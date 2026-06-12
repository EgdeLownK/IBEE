import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  countEventRegistrations,
  createEventRegistration,
  getEntityByUserId,
} from '@ibee/supabase'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))

  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
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

  if (!name || !email) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.email) {
      email = email || user.email
      if (!name) {
        try {
          const userEntity = await getEntityByUserId(supabase, user.id)
          name = userEntity?.display_name ?? user.email.split('@')[0]
        } catch {
          name = user.email.split('@')[0]
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
    .select('id, entity_id, start_at, capacity, is_published')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    console.error('[api/events/register] fetch event', eventError)
    return NextResponse.json({ error: 'Erreur lors de la vérification de l\'événement.' }, { status: 500 })
  }
  if (!event || !event.is_published) {
    return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  }
  if (new Date(event.start_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Cet événement est déjà passé.' }, { status: 400 })
  }

  if (event.capacity != null) {
    try {
      const count = await countEventRegistrations(supabase, event.id)
      if (count >= event.capacity) {
        return NextResponse.json({ error: 'Cet événement est complet.' }, { status: 409 })
      }
    } catch (err) {
      console.error('[api/events/register] count', err)
      return NextResponse.json({ error: 'Erreur lors de la vérification des places.' }, { status: 500 })
    }
  }

  try {
    await createEventRegistration(supabase, {
      event_id: event.id,
      entity_id: event.entity_id,
      attendee_name: name,
      attendee_email: email,
      attendee_phone: phone,
      message,
    })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Cet email est déjà inscrit à cet événement.' }, { status: 409 })
    }
    console.error('[api/events/register] insert', err)
    return NextResponse.json({ error: 'Erreur lors de l\'inscription.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
