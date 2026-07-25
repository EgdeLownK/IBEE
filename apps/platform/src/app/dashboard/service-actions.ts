'use server'

import { revalidatePath } from 'next/cache'
import {
  addAvailabilityException,
  getClientById,
  removeAvailabilityException,
  setAvailabilitySchedule,
  updateBookingNotes,
  updateBookingStatus,
  updateClient,
} from '@ibee/supabase'
import { requireDashboardContext } from '@/lib/dashboard-context'

const SERVICE_PATH = '/dashboard/service'

function revalidateService() {
  revalidatePath(SERVICE_PATH)
  revalidatePath('/dashboard/rendez-vous')
}

export async function confirmBookingAction(bookingId: string) {
  const ctx = await requireDashboardContext()

  try {
    await updateBookingStatus(ctx.supabase, bookingId, 'confirmed')
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[confirmBookingAction]', err)
    return { ok: false as const, error: 'Impossible de confirmer le rendez-vous.' }
  }
}

export async function cancelBookingAction(bookingId: string) {
  const ctx = await requireDashboardContext()

  try {
    await updateBookingStatus(ctx.supabase, bookingId, 'cancelled', 'owner')
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[cancelBookingAction]', err)
    return { ok: false as const, error: 'Impossible d’annuler le rendez-vous.' }
  }
}

export async function completeBookingAction(bookingId: string) {
  const ctx = await requireDashboardContext()

  try {
    await updateBookingStatus(ctx.supabase, bookingId, 'completed')
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[completeBookingAction]', err)
    return { ok: false as const, error: 'Impossible de terminer le rendez-vous.' }
  }
}

export async function markBookingNoShowAction(bookingId: string) {
  const ctx = await requireDashboardContext()

  try {
    await updateBookingStatus(ctx.supabase, bookingId, 'no_show')
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[markBookingNoShowAction]', err)
    return { ok: false as const, error: 'Impossible de marquer le no-show.' }
  }
}

export async function updateServiceBookingNotesAction(bookingId: string, notes: string | null) {
  const ctx = await requireDashboardContext()

  try {
    await updateBookingNotes(ctx.supabase, bookingId, notes)
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[updateServiceBookingNotesAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer les notes.' }
  }
}

export async function updateClientNotesAction(clientId: string, notes: string | null) {
  const ctx = await requireDashboardContext()

  try {
    const existing = await getClientById(ctx.supabase, clientId)
    if (!existing || existing.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Client introuvable.' }
    }

    await updateClient(ctx.supabase, clientId, { notes })
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[updateClientNotesAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer les notes client.' }
  }
}

export async function saveWeeklyAvailabilityAction(
  schedules: Array<{ day_of_week: number; start_time: string; end_time: string }>,
) {
  const ctx = await requireDashboardContext()

  for (const row of schedules) {
    if (row.start_time >= row.end_time) {
      return { ok: false as const, error: 'Les horaires de fin doivent être après le début.' }
    }
  }

  try {
    await setAvailabilitySchedule(ctx.supabase, ctx.entity.id, schedules)
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[saveWeeklyAvailabilityAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer les horaires.' }
  }
}

export async function blockAvailabilityDateAction(input: { date: string; reason?: string | null }) {
  const ctx = await requireDashboardContext()

  try {
    await addAvailabilityException(ctx.supabase, ctx.entity.id, {
      date: input.date,
      is_blocked: true,
      reason: input.reason?.trim() || null,
    })
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[blockAvailabilityDateAction]', err)
    return { ok: false as const, error: 'Impossible de bloquer cette date.' }
  }
}

export async function removeAvailabilityExceptionAction(exceptionId: string) {
  const ctx = await requireDashboardContext()

  try {
    await removeAvailabilityException(ctx.supabase, exceptionId)
    revalidateService()
    return { ok: true as const }
  } catch (err) {
    console.error('[removeAvailabilityExceptionAction]', err)
    return { ok: false as const, error: 'Impossible de supprimer l’exception.' }
  }
}
