import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase/client'
import { getAvailableSlots } from '@agora/supabase'

export const GET: APIRoute = async ({ url }) => {
  const entityId = url.searchParams.get('entityId')
  const typeId = url.searchParams.get('typeId')
  const date = url.searchParams.get('date')

  if (!entityId || !typeId || !date) {
    return new Response(JSON.stringify({ error: 'Paramètres manquants' }), { status: 400 })
  }

  try {
    const slots = await getAvailableSlots(supabase, entityId, typeId, date)
    return new Response(JSON.stringify({ slots }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('[slots]', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur', slots: [] }), { status: 500 })
  }
}
