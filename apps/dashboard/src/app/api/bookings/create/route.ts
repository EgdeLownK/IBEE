import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBooking } from '@ibee/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      appointment_type_id,
      entity_id,
      booker_name,
      booker_email,
      booker_phone,
      booker_message,
      start_at,
      end_at,
    } = body

    if (!appointment_type_id || !entity_id || !booker_name || !booker_email || !start_at || !end_at) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = await createClient()
    const booking = await createBooking(supabase, {
      appointment_type_id,
      entity_id,
      booker_name: String(booker_name).trim(),
      booker_email: String(booker_email).trim(),
      booker_phone: booker_phone || null,
      booker_message: booker_message || null,
      start_at,
      end_at,
    })

    return NextResponse.json({ success: true, booking })
  } catch (err: unknown) {
    console.error('[api/bookings/create]', err)
    const message = err instanceof Error ? err.message : 'Erreur lors de la réservation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
