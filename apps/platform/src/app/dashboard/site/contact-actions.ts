'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import {
  getEntityByUserId,
  purgeEntityCache,
  upsertEntityContactInfo,
  type OpeningHourSlot,
} from '@ibee/supabase'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

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

export type ContactInfoPayload = {
  contact_email: string | null
  contact_email_public: boolean
  contact_phone: string | null
  contact_phone_public: boolean
  message_enabled: boolean
  opening_hours_enabled: boolean
  opening_hours: OpeningHourSlot[]
}

export async function saveContactInfoAction(payload: ContactInfoPayload) {
  if (payload.contact_email_public && !payload.contact_email?.trim()) {
    return { ok: false as const, error: 'Renseigne une adresse email ou désactive l\'email.' }
  }
  if (payload.contact_phone_public && !payload.contact_phone?.trim()) {
    return { ok: false as const, error: 'Renseigne un numéro ou désactive le téléphone.' }
  }

  const hours = parseOpeningHours(payload.opening_hours)
  if (!hours) {
    return { ok: false as const, error: 'Horaires invalides.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    await upsertEntityContactInfo(supabase, entity.id, {
      contact_email: payload.contact_email?.trim() || null,
      contact_email_public: payload.contact_email_public,
      contact_phone: payload.contact_phone?.trim() || null,
      contact_phone_public: payload.contact_phone_public,
      message_enabled: payload.message_enabled,
      opening_hours_enabled: payload.opening_hours_enabled,
      opening_hours: hours,
    })

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug)

    return {
      ok: true as const,
      contactInfo: {
        ...payload,
        contact_email: payload.contact_email?.trim() || null,
        contact_phone: payload.contact_phone?.trim() || null,
        opening_hours: hours,
      },
    }
  } catch (err) {
    console.error('[saveContactInfoAction]', err)
    const message =
      err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : 'Enregistrement impossible.'
    return { ok: false as const, error: message }
  }
}
