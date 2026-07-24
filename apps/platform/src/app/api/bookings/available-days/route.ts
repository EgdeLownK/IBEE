import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@ibee/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entityId = searchParams.get('entityId')
  const typeId = searchParams.get('typeId')
  const month = searchParams.get('month')

  if (!entityId || !typeId || !month) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)
    const daysInMonth = new Date(year, m, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const availableDays: string[] = []
    const checks: Promise<void>[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, m - 1, d)
      if (dateObj < today) continue
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`
      checks.push(
        getAvailableSlots(supabase, entityId, typeId, dateStr)
          .then((slots) => {
            if (slots.length > 0) availableDays.push(dateStr)
          })
          .catch(() => {}),
      )
    }

    await Promise.all(checks)

    return NextResponse.json(
      { days: availableDays.sort() },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    )
  } catch (err) {
    console.error('[api/bookings/available-days]', err)
    return NextResponse.json({ error: 'Erreur serveur', days: [] }, { status: 500 })
  }
}
