import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase/client'
import { createAuthClient } from '../../../lib/supabase/auth'
import { countEventRegistrations, createEventRegistration, getEntityByUserId } from '@ibee/supabase'

/**
 * Inscription publique à un event (anonyme ou connecté).
 * Anonyme : nom + email obligatoires dans le body.
 * Connecté sans nom/email : dérivés du compte (entity.display_name + user.email)
 * — évite d'exposer l'email du user dans le HTML public.
 * Contrôles : event publié, à venir, jauge non atteinte, pas de doublon email
 * (contrainte unique DB). Le statut est auto-confirmé (défaut DB).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}))

  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
  let name = typeof body?.name === 'string' ? body.name.trim() : ''
  let email = typeof body?.email === 'string' ? body.email.trim() : ''
  const phone = typeof body?.phone === 'string' && body.phone.trim().length > 0 ? body.phone.trim() : null
  const message = typeof body?.message === 'string' && body.message.trim().length > 0 ? body.message.trim() : null

  if (!eventId) {
    return new Response(JSON.stringify({ error: 'Event introuvable.' }), { status: 400 })
  }

  // Participation 1-clic : visiteur connecté sans nom/email → infos du compte
  if (!name || !email) {
    const authClient = createAuthClient(request, cookies)
    const { data: { user } } = await authClient.auth.getUser()
    if (user?.email) {
      email = email || user.email
      if (!name) {
        try {
          const userEntity = await getEntityByUserId(authClient, user.id)
          name = userEntity?.display_name ?? user.email.split('@')[0]
        } catch {
          name = user.email.split('@')[0]
        }
      }
    }
  }
  if (name.length < 1 || name.length > 200) {
    return new Response(JSON.stringify({ error: 'Le nom est obligatoire (200 caractères max).' }), { status: 400 })
  }
  if (email.length < 5 || email.length > 320 || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Email invalide.' }), { status: 400 })
  }
  if (phone && phone.length > 30) {
    return new Response(JSON.stringify({ error: 'Téléphone invalide.' }), { status: 400 })
  }
  if (message && message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Le message ne peut pas dépasser 2000 caractères.' }), { status: 400 })
  }

  // Event publié et à venir (lecture anon — RLS events_public_select)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, entity_id, start_at, capacity, is_published')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    console.error('[api/events/register] fetch event', eventError)
    return new Response(JSON.stringify({ error: 'Erreur lors de la vérification de l\'event.' }), { status: 500 })
  }
  if (!event || !event.is_published) {
    return new Response(JSON.stringify({ error: 'Event introuvable.' }), { status: 404 })
  }
  if (new Date(event.start_at).getTime() <= Date.now()) {
    return new Response(JSON.stringify({ error: 'Cet event est déjà passé.' }), { status: 400 })
  }

  // Jauge (best-effort : la course entre deux inscriptions simultanées est
  // acceptée en v1 — pas de lock, le dépassement éventuel est d'une place)
  if (event.capacity != null) {
    try {
      const count = await countEventRegistrations(supabase, event.id)
      if (count >= event.capacity) {
        return new Response(JSON.stringify({ error: 'Cet event est complet.' }), { status: 409 })
      }
    } catch (err) {
      console.error('[api/events/register] count', err)
      return new Response(JSON.stringify({ error: 'Erreur lors de la vérification des places.' }), { status: 500 })
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
  } catch (err) {
    // Contrainte unique (event_id, attendee_email) → déjà inscrit
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505') {
      return new Response(JSON.stringify({ error: 'Cet email est déjà inscrit à cet event.' }), { status: 409 })
    }
    console.error('[api/events/register] insert', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'inscription.' }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }))
}
