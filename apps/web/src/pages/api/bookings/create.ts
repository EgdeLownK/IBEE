import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase/client'
import { createBooking } from '@ibee/supabase'

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()

    const { appointment_type_id, entity_id, booker_name, booker_email, booker_phone, booker_message, start_at, end_at } = body

    console.log('[booking create] payload:', { appointment_type_id, entity_id, booker_name, booker_email, start_at, end_at })

    if (!appointment_type_id || !entity_id || !booker_name || !booker_email || !start_at || !end_at) {
      return new Response(JSON.stringify({ error: 'Champs obligatoires manquants' }), { status: 400 })
    }

    const booking = await createBooking(supabase, {
      appointment_type_id,
      entity_id,
      booker_name,
      booker_email,
      booker_phone: booker_phone || null,
      booker_message: booker_message || null,
      start_at,
      end_at,
    })

    return new Response(JSON.stringify({ success: true, booking }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[create booking]', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur lors de la réservation' }), { status: 400 })
  }
}
