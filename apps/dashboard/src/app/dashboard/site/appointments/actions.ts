'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  createAppointmentType,
  updateAppointmentType,
  deleteAppointmentType,
  setAvailabilitySchedule,
  addAvailabilityException,
  removeAvailabilityException,
  updateBookingStatus,
  purgeEntityCache,
} from '@agora/supabase'

const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'

// --- Appointment Type ---

const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string().max(5000) }),
  z.object({ type: z.literal('image'), url: z.string().url(), alt: z.string().max(300).optional() }),
  z.object({ type: z.literal('list'), items: z.array(z.string().max(300)).max(20) }),
])

const appointmentTypeSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(120).trim(),
  description: z.string().max(2000).trim().nullable().optional().transform(v => v === '' ? null : v),
  duration_minutes: z.number().int().min(5).max(480),
  location_type: z.enum(['in_person', 'video', 'phone']),
  location_details: z.string().nullable().optional().transform(v => v === '' ? null : v),
  price_cents: z.number().int().min(0).nullable().optional(),
  promo_price_cents: z.number().int().positive().nullable().optional(),
  currency: z.string().default('EUR'),
  buffer_before_minutes: z.number().int().min(0).default(0),
  buffer_after_minutes: z.number().int().min(0).default(0),
  min_notice_hours: z.number().int().min(0).default(24),
  max_advance_days: z.number().int().min(1).max(365).default(90),
  color: z.string().nullable().optional(),
  highlights: z.array(z.string().min(1).max(100)).max(4).default([]),
  gallery_images: z.array(z.string().url()).max(10).default([]),
  content_blocks: z.array(contentBlockSchema).max(50).default([]),
  is_active: z.boolean().default(true),
  auto_accept_bookings: z.boolean().default(true),
}).refine(
  data => data.promo_price_cents == null || (data.price_cents != null && data.promo_price_cents < data.price_cents),
  { message: 'Le prix promo doit être inférieur au prix normal', path: ['promo_price_cents'] }
)

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

export type CreateActionResult =
  | { success: true; id: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

async function ensureAppointmentsSectionActive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string
) {
  const { data: existing } = await supabase
    .from('entity_menu_sections')
    .select('id, is_active')
    .eq('entity_id', entityId)
    .eq('type', 'appointments')
    .maybeSingle()

  if (!existing) {
    await supabase.from('entity_menu_sections').insert({
      entity_id: entityId,
      type: 'appointments',
      is_active: true,
      is_configured: true,
      position: 2,
    })
  } else if (!existing.is_active) {
    await supabase
      .from('entity_menu_sections')
      .update({ is_active: true })
      .eq('id', existing.id)
  }
}

export async function createAppointmentTypeAction(input: z.input<typeof appointmentTypeSchema>): Promise<CreateActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = appointmentTypeSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.issues.forEach(issue => {
      const key = issue.path[0]
      if (key) fieldErrors[String(key)] = issue.message
    })
    return { success: false, error: 'Données invalides', fieldErrors }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    const created = await createAppointmentType(supabase, entity.id, parsed.data)
    await ensureAppointmentsSectionActive(supabase, entity.id)
    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/appointments')
    return { success: true, id: created.id }
  } catch (err) {
    console.error('[createAppointmentType]', err)
    return { success: false, error: 'Erreur lors de la création' }
  }
}

export async function updateAppointmentTypeAction(
  id: string,
  input: Partial<z.input<typeof appointmentTypeSchema>> & { is_active?: boolean; position?: number }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await updateAppointmentType(supabase, id, input)
    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/appointments')
  } catch (err) {
    console.error('[updateAppointmentType]', err)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  return { success: true }
}

export async function deleteAppointmentTypeAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await deleteAppointmentType(supabase, id)
    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/appointments')
  } catch (err) {
    console.error('[deleteAppointmentType]', err)
    return { success: false, error: 'Erreur lors de la suppression' }
  }

  return { success: true }
}

// --- Availability ---

const scheduleSchema = z.array(z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
}))

export async function saveAvailabilityAction(
  schedules: z.input<typeof scheduleSchema>
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = scheduleSchema.safeParse(schedules)
  if (!parsed.success) return { success: false, error: 'Horaires invalides' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await setAvailabilitySchedule(supabase, entity.id, parsed.data)
    revalidatePath('/dashboard/site/appointments')
  } catch (err) {
    console.error('[saveAvailability]', err)
    return { success: false, error: 'Erreur lors de la sauvegarde' }
  }

  return { success: true }
}

export async function addExceptionAction(data: {
  date: string
  is_blocked?: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await addAvailabilityException(supabase, entity.id, data)
    revalidatePath('/dashboard/site/appointments')
  } catch (err) {
    console.error('[addException]', err)
    return { success: false, error: 'Erreur lors de l\'ajout' }
  }

  return { success: true }
}

export async function removeExceptionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  try {
    await removeAvailabilityException(supabase, id)
    revalidatePath('/dashboard/site/appointments')
  } catch (err) {
    console.error('[removeException]', err)
    return { success: false, error: 'Erreur lors de la suppression' }
  }

  return { success: true }
}

// --- Bookings ---

export async function updateBookingStatusAction(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show',
  cancelledBy?: 'booker' | 'owner'
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  try {
    await updateBookingStatus(supabase, bookingId, status, cancelledBy)
    revalidatePath('/dashboard/site/appointments')
  } catch (err) {
    console.error('[updateBookingStatus]', err)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  return { success: true }
}
