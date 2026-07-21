import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { selfCheckInEventRegistration } from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
  const ticketCode = typeof body?.ticketCode === 'string' ? body.ticketCode.trim() : ''

  if (!eventId || !ticketCode) {
    return NextResponse.json({ error: 'Code billet requis.' }, { status: 400 })
  }

  if (ticketCode.length > 64) {
    return NextResponse.json({ error: 'Code billet invalide.' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const result = await selfCheckInEventRegistration(supabase, { eventId, ticketCode })

    if (result.status === 'invalid') {
      return NextResponse.json({ error: 'Code billet introuvable.' }, { status: 404 })
    }
    if (result.status === 'not_open') {
      return NextResponse.json({ error: 'Les entrées ne sont pas encore ouvertes pour cet événement.' }, { status: 403 })
    }
    if (result.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce billet a été annulé.' }, { status: 409 })
    }

    if (result.status === 'checked_in') {
      revalidatePath('/dashboard/billetterie')
      revalidatePath('/dashboard/billetterie/check-in')
    }

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[api/events/self-check-in]', err)
    return NextResponse.json({ error: 'Impossible de valider l’entrée.' }, { status: 500 })
  }
}
