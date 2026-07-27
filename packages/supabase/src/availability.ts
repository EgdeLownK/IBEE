import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type AvailabilitySchedule = {
  id: string
  entity_id: string
  day_of_week: number
  start_time: string
  end_time: string
  created_at: string
}

type AvailabilityException = {
  id: string
  entity_id: string
  date: string
  is_blocked: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
  created_at: string
}

type TimeSlot = {
  start: string // ISO datetime UTC
  end: string   // ISO datetime UTC
}

// --- Schedules ---

export async function getAvailabilitySchedule(
  client: SupabaseClient<Database>,
  entityId: string
) {
  const { data, error } = await client
    .from('availability_schedules')
    .select('*')
    .eq('entity_id', entityId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data ?? []) as AvailabilitySchedule[]
}

export async function setAvailabilitySchedule(
  client: SupabaseClient<Database>,
  entityId: string,
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
) {
  // Delete existing schedules then insert new ones
  const { error: deleteError } = await client
    .from('availability_schedules')
    .delete()
    .eq('entity_id', entityId)

  if (deleteError) throw deleteError

  if (schedules.length === 0) return []

  const rows = schedules.map(s => ({
    entity_id: entityId,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
  }))

  const { data, error } = await client
    .from('availability_schedules')
    .insert(rows)
    .select()

  if (error) throw error
  return (data ?? []) as AvailabilitySchedule[]
}

// --- Exceptions ---

export async function getAvailabilityExceptions(
  client: SupabaseClient<Database>,
  entityId: string,
  fromDate: string,
  toDate: string
) {
  const { data, error } = await client
    .from('availability_exceptions')
    .select('*')
    .eq('entity_id', entityId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true })

  if (error) throw error
  return (data ?? []) as AvailabilityException[]
}

export async function addAvailabilityException(
  client: SupabaseClient<Database>,
  entityId: string,
  data: {
    date: string
    is_blocked?: boolean
    start_time?: string | null
    end_time?: string | null
    reason?: string | null
  }
) {
  const { data: result, error } = await client
    .from('availability_exceptions')
    .insert({
      entity_id: entityId,
      date: data.date,
      is_blocked: data.is_blocked ?? true,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      reason: data.reason ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return result as AvailabilityException
}

export async function removeAvailabilityException(
  client: SupabaseClient<Database>,
  id: string
) {
  const { error } = await client
    .from('availability_exceptions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// --- Available slots computation ---

export async function getAvailableSlots(
  client: SupabaseClient<Database>,
  entityId: string,
  appointmentTypeId: string,
  date: string // YYYY-MM-DD
): Promise<TimeSlot[]> {
  // 1. Get appointment type details
  const { data: apptType, error: typeErr } = await client
    .from('appointment_types')
    .select('duration_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_hours, max_advance_days')
    .eq('id', appointmentTypeId)
    .eq('is_active', true)
    .maybeSingle()

  if (typeErr) throw typeErr
  if (!apptType) return []

  const dateObj = new Date(date + 'T00:00:00Z')
  const dayOfWeek = dateObj.getUTCDay()
  const now = new Date()

  // Check max advance days
  const maxDate = new Date(now)
  maxDate.setDate(maxDate.getDate() + apptType.max_advance_days)
  if (dateObj > maxDate) return []

  // Check if date is in the past
  if (dateObj < new Date(now.toISOString().split('T')[0] + 'T00:00:00Z')) return []

  // 2. Check exceptions for this date (RPC restreinte -- pas de lecture
  // directe de la table, voir migration 20260727100000_availability_exceptions_public_rpc.sql)
  const { data: exceptionRows } = await client.rpc('get_availability_exception_for_date', {
    p_entity_id: entityId,
    p_date: date,
  })

  const exception = exceptionRows?.[0] as
    | { is_blocked: boolean; start_time: string | null; end_time: string | null }
    | undefined
  if (exception?.is_blocked) return [] // Day is blocked

  // 3. Get schedule for this day of week (or custom hours from exception)
  let timeRanges: { start: string; end: string }[] = []

  if (exception && !exception.is_blocked && exception.start_time && exception.end_time) {
    timeRanges = [{ start: exception.start_time, end: exception.end_time }]
  } else {
    const { data: schedules } = await client
      .from('availability_schedules')
      .select('start_time, end_time')
      .eq('entity_id', entityId)
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true })

    timeRanges = (schedules ?? []).map((s: any) => ({ start: s.start_time, end: s.end_time }))
  }

  if (timeRanges.length === 0) return []

  // 4. Generate all possible slots
  const totalDuration = apptType.buffer_before_minutes + apptType.duration_minutes + apptType.buffer_after_minutes
  const slotDuration = apptType.duration_minutes
  const allSlots: TimeSlot[] = []

  for (const range of timeRanges) {
    const [sh, sm] = range.start.split(':').map(Number)
    const [eh, em] = range.end.split(':').map(Number)
    const rangeStartMin = sh * 60 + sm
    const rangeEndMin = eh * 60 + em

    let cursor = rangeStartMin + apptType.buffer_before_minutes
    while (cursor + slotDuration + apptType.buffer_after_minutes <= rangeEndMin) {
      const startH = String(Math.floor(cursor / 60)).padStart(2, '0')
      const startM = String(cursor % 60).padStart(2, '0')
      const endMin = cursor + slotDuration
      const endH = String(Math.floor(endMin / 60)).padStart(2, '0')
      const endM = String(endMin % 60).padStart(2, '0')

      allSlots.push({
        start: `${date}T${startH}:${startM}:00Z`,
        end: `${date}T${endH}:${endM}:00Z`,
      })

      cursor += slotDuration + apptType.buffer_after_minutes
    }
  }

  // 5. Remove slots that conflict with existing bookings
  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  const { data: existingBookings } = await client.rpc('get_booked_time_ranges', {
    p_entity_id: entityId,
    p_from: dayStart,
    p_to: dayEnd,
  })

  const bookedSlots = (existingBookings ?? []) as { start_at: string; end_at: string }[]

  const availableSlots = allSlots.filter(slot => {
    const slotStart = new Date(slot.start).getTime()
    const slotEnd = new Date(slot.end).getTime()

    // Check min notice
    const minNoticeMs = apptType.min_notice_hours * 60 * 60 * 1000
    if (slotStart - now.getTime() < minNoticeMs) return false

    // Check overlap with existing bookings (including their buffers)
    for (const booked of bookedSlots) {
      const bStart = new Date(booked.start_at).getTime()
      const bEnd = new Date(booked.end_at).getTime()
      if (slotStart < bEnd && slotEnd > bStart) return false
    }

    return true
  })

  return availableSlots
}
