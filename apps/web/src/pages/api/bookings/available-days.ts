import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase/client'
import { getAvailableSlots } from '@ibee/supabase'

export const GET: APIRoute = async ({ url }) => {
  const entityId = url.searchParams.get('entityId')
  const typeId = url.searchParams.get('typeId')
  const month = url.searchParams.get('month') // format: 2026-04

  if (!entityId || !typeId || !month) {
    return new Response(JSON.stringify({ error: 'Parametres manquants' }), { status: 400 })
  }

  try {
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)
    const daysInMonth = new Date(year, m, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const availableDays: string[] = []

    // Check each day of the month in parallel (batched)
    const checks = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, m - 1, d)
      if (dateObj < today) continue
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`
      checks.push(
        getAvailableSlots(supabase, entityId, typeId, dateStr)
          .then(slots => { if (slots.length > 0) availableDays.push(dateStr) })
          .catch(() => {})
      )
    }

    await Promise.all(checks)

    return new Response(JSON.stringify({ days: availableDays.sort() }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    console.error('[available-days]', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur', days: [] }), { status: 500 })
  }
}
