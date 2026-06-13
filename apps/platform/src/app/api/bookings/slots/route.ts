import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@ibee/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entityId = searchParams.get('entityId')
  const typeId = searchParams.get('typeId')
  const date = searchParams.get('date')

  if (!entityId || !typeId || !date) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const slots = await getAvailableSlots(supabase, entityId, typeId, date)
    return NextResponse.json({ slots }, { headers: { 'Cache-Control': 'no-cache' } })
  } catch (err) {
    console.error('[api/bookings/slots]', err)
    return NextResponse.json({ error: 'Erreur serveur', slots: [] }, { status: 500 })
  }
}
