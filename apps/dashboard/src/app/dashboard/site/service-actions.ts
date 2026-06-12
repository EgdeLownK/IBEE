'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import {
  createAppointmentType,
  getEntityByUserId,
  purgeEntityCache,
} from '@ibee/supabase'
import {
  buildServiceCreatePayload,
  validateServiceStep,
  type ServiceCreateInput,
} from '@ibee/ui-server'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  )
}

function inputToDraft(input: ServiceCreateInput) {
  return {
    title: input.title,
    description: input.description ?? '',
    durationMinutes: String(input.duration_minutes),
    locationType: input.location_type,
    locationDetails: input.location_details ?? '',
    price: input.price_cents != null ? String(input.price_cents / 100) : '',
    promoEnabled: input.promo_price_cents != null,
    promoPrice: input.promo_price_cents != null ? String(input.promo_price_cents / 100) : '',
    autoAcceptBookings: input.auto_accept_bookings,
    minNoticeHours: String(input.min_notice_hours),
    maxAdvanceDays: String(input.max_advance_days),
    bufferBeforeMinutes: String(input.buffer_before_minutes),
    bufferAfterMinutes: String(input.buffer_after_minutes),
    highlights: input.highlights ?? [],
    gallery: (input.gallery_images ?? []).map((url) => ({ url, uploading: false })),
    contentBlocks: (input.content_blocks ?? []).map((b) =>
      b.type === 'text'
        ? { type: 'text' as const, content: b.content }
        : { type: 'image' as const, url: b.url, uploading: false }
    ),
    faq: input.faq ?? [],
    isActive: input.is_active,
  }
}

export async function createServiceAction(input: ServiceCreateInput) {
  const draft = inputToDraft(input)
  const fieldErrors: Record<string, string> = {}
  for (const step of [1, 2, 3] as const) {
    const result = validateServiceStep(step, draft)
    if (!result.ok) Object.assign(fieldErrors, result.fieldErrors)
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, error: 'Données invalides.', fieldErrors }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    const title = input.title.trim()
    const baseSlug = slugify(title) || 'service'
    let serviceId: string | null = null
    let serviceSlug: string | null = null
    let lastError: unknown = null

    const common = {
      title,
      description: input.description ?? null,
      duration_minutes: input.duration_minutes,
      location_type: input.location_type,
      location_details: input.location_details ?? null,
      price_cents: input.price_cents ?? null,
      promo_price_cents: input.promo_price_cents ?? null,
      currency: 'EUR',
      buffer_before_minutes: input.buffer_before_minutes,
      buffer_after_minutes: input.buffer_after_minutes,
      min_notice_hours: input.min_notice_hours,
      max_advance_days: input.max_advance_days,
      highlights: input.highlights ?? [],
      gallery_images: input.gallery_images ?? [],
      content_blocks: input.content_blocks ?? [],
      faq: input.faq ?? [],
      is_active: input.is_active,
      auto_accept_bookings: input.auto_accept_bookings,
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 76)}-${attempt + 1}`
      try {
        const service = await createAppointmentType(supabase, entity.id, { ...common, slug })
        serviceId = service.id
        serviceSlug = service.slug
        break
      } catch (err) {
        lastError = err
        if (isUniqueViolation(err)) continue
        console.error('[createServiceAction]', err)
        return { ok: false as const, error: 'Erreur lors de la création du service.' }
      }
    }

    if (!serviceId || !serviceSlug) {
      console.error('[createServiceAction] slug collision', lastError)
      return {
        ok: false as const,
        error: 'Impossible de générer un identifiant unique pour ce titre.',
        fieldErrors: { title: 'Choisis un titre légèrement différent.' },
      }
    }

    if (input.is_active) {
      try {
        const { data: existing } = await supabase
          .from('entity_menu_sections')
          .select('id, is_active')
          .eq('entity_id', entity.id)
          .eq('type', 'appointments' as never)
          .maybeSingle()

        if (!existing) {
          const { data: positions } = await supabase
            .from('entity_menu_sections')
            .select('position')
            .eq('entity_id', entity.id)
            .order('position', { ascending: false })
            .limit(1)
          const nextPosition = (positions?.[0]?.position ?? 0) + 1
          await supabase.from('entity_menu_sections').insert({
            entity_id: entity.id,
            type: 'appointments' as never,
            is_active: true,
            is_configured: true,
            position: nextPosition,
          })
        } else if (!existing.is_active) {
          await supabase.from('entity_menu_sections').update({ is_active: true }).eq('id', existing.id)
        }
      } catch (err) {
        console.error('[createServiceAction] ensure appointments section', err)
      }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug, { serviceSlug })

    return {
      ok: true as const,
      service: {
        id: serviceId,
        title,
        slug: serviceSlug,
        description: input.description ?? null,
        duration_minutes: input.duration_minutes,
        location_type: input.location_type,
        price_cents: input.price_cents ?? null,
        promo_price_cents: input.promo_price_cents ?? null,
        currency: 'EUR',
        image_url: input.gallery_images?.[0] ?? null,
        is_active: input.is_active,
      },
    }
  } catch (err) {
    console.error('[createServiceAction]', err)
    return { ok: false as const, error: 'Erreur lors de la création du service.' }
  }
}
