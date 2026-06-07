import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'service'
}

export type ServiceContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'list'; items: string[] }

export type ServiceFaqItem = { question: string; answer: string }

type AppointmentType = {
  id: string
  entity_id: string
  title: string
  slug: string
  description: string | null
  duration_minutes: number
  location_type: 'in_person' | 'video' | 'phone'
  location_details: string | null
  price_cents: number | null
  promo_price_cents: number | null
  currency: string
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_hours: number
  max_advance_days: number
  is_active: boolean
  auto_accept_bookings: boolean
  position: number
  color: string | null
  highlights: string[]
  gallery_images: string[]
  content_blocks: ServiceContentBlock[]
  faq: ServiceFaqItem[]
  created_at: string
  updated_at: string
}

export async function getAppointmentTypesByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { activeOnly?: boolean } = {}
) {
  const { activeOnly = false } = opts

  let query = client
    .from('appointment_types')
    .select('*')
    .eq('entity_id', entityId)
    .order('position', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AppointmentType[]
}

export async function getAppointmentTypeById(
  client: SupabaseClient<Database>,
  id: string
) {
  const { data, error } = await client
    .from('appointment_types')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as AppointmentType | null
}

export async function getAppointmentTypeBySlug(
  client: SupabaseClient<Database>,
  entityId: string,
  slug: string
) {
  const { data, error } = await client
    .from('appointment_types')
    .select('*')
    .eq('entity_id', entityId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as AppointmentType | null
}

export async function createAppointmentType(
  client: SupabaseClient<Database>,
  entityId: string,
  data: {
    title: string
    slug?: string
    description?: string | null
    duration_minutes: number
    location_type: 'in_person' | 'video' | 'phone'
    location_details?: string | null
    price_cents?: number | null
    promo_price_cents?: number | null
    currency?: string
    buffer_before_minutes?: number
    buffer_after_minutes?: number
    min_notice_hours?: number
    max_advance_days?: number
    color?: string | null
    highlights?: string[]
    gallery_images?: string[]
    content_blocks?: ServiceContentBlock[]
    faq?: ServiceFaqItem[]
    is_active?: boolean
    auto_accept_bookings?: boolean
  }
) {
  const insertPayload = {
    entity_id: entityId,
    title: data.title,
    slug: data.slug ?? slugify(data.title),
    description: data.description ?? null,
    duration_minutes: data.duration_minutes,
    location_type: data.location_type,
    location_details: data.location_details ?? null,
    price_cents: data.price_cents ?? null,
    promo_price_cents: data.promo_price_cents ?? null,
    currency: data.currency ?? 'EUR',
    buffer_before_minutes: data.buffer_before_minutes ?? 0,
    buffer_after_minutes: data.buffer_after_minutes ?? 0,
    min_notice_hours: data.min_notice_hours ?? 24,
    max_advance_days: data.max_advance_days ?? 90,
    color: data.color ?? null,
    highlights: data.highlights ?? [],
    gallery_images: data.gallery_images ?? [],
    content_blocks: data.content_blocks ?? [],
    faq: data.faq ?? [],
    is_active: data.is_active ?? true,
    auto_accept_bookings: data.auto_accept_bookings ?? true,
  }
  const { data: result, error } = await client
    .from('appointment_types')
    .insert(insertPayload)
    .select()
    .single()

  if (error) throw error
  return result as AppointmentType
}

export async function updateAppointmentType(
  client: SupabaseClient<Database>,
  id: string,
  data: Partial<{
    title: string
    description: string | null
    duration_minutes: number
    location_type: 'in_person' | 'video' | 'phone'
    location_details: string | null
    price_cents: number | null
    promo_price_cents: number | null
    currency: string
    buffer_before_minutes: number
    buffer_after_minutes: number
    min_notice_hours: number
    max_advance_days: number
    is_active: boolean
    auto_accept_bookings: boolean
    position: number
    color: string | null
    highlights: string[]
    gallery_images: string[]
    content_blocks: ServiceContentBlock[]
    faq: ServiceFaqItem[]
  }>
) {
  const { data: result, error } = await client
    .from('appointment_types')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as AppointmentType
}

export async function deleteAppointmentType(
  client: SupabaseClient<Database>,
  id: string
) {
  const { error } = await client
    .from('appointment_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}
