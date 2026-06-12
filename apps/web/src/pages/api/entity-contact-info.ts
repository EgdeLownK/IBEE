/** @deprecated Phase 9 — contact via dashboard. Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId, purgeEntityCache, upsertEntityContactInfo } from '@ibee/supabase'
import type { OpeningHourSlot } from '@ibee/supabase'

function parseOpeningHours(raw: unknown): OpeningHourSlot[] | null {
  if (!Array.isArray(raw)) return null
  const slots: OpeningHourSlot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const o = item as Record<string, unknown>
    if (typeof o.day_of_week !== 'number' || o.day_of_week < 0 || o.day_of_week > 6) return null
    if (typeof o.closed !== 'boolean') return null
    slots.push({
      day_of_week: o.day_of_week,
      closed: o.closed,
      start_time: typeof o.start_time === 'string' ? o.start_time : null,
      end_time: typeof o.end_time === 'string' ? o.end_time : null,
    })
  }
  return slots
}

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'No entity for user' }), { status: 404 })
  }

  const payload: Parameters<typeof upsertEntityContactInfo>[2] = {}

  if ('contact_email' in body) {
    payload.contact_email = typeof body.contact_email === 'string' ? body.contact_email.trim() || null : null
  }
  if (typeof body.contact_email_public === 'boolean') {
    payload.contact_email_public = body.contact_email_public
  }
  if ('contact_phone' in body) {
    payload.contact_phone = typeof body.contact_phone === 'string' ? body.contact_phone.trim() || null : null
  }
  if (typeof body.contact_phone_public === 'boolean') {
    payload.contact_phone_public = body.contact_phone_public
  }
  if (typeof body.message_enabled === 'boolean') {
    payload.message_enabled = body.message_enabled
  }
  if (typeof body.opening_hours_enabled === 'boolean') {
    payload.opening_hours_enabled = body.opening_hours_enabled
  }
  if ('opening_hours' in body) {
    const hours = parseOpeningHours(body.opening_hours)
    if (!hours) {
      return new Response(JSON.stringify({ error: 'Invalid opening_hours' }), { status: 400 })
    }
    payload.opening_hours = hours
  }

  try {
    await upsertEntityContactInfo(authClient, entity.id, payload)
  } catch (err) {
    console.error('[api/entity-contact-info] upsert error', err)
    const message =
      err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : 'Save failed'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ ok: true, entity_slug: entity.slug }))
}
