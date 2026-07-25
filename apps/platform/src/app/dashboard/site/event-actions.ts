'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import {
  createEvent,
  deleteEvent,
  getEntityByUserId,
  getEventById,
  purgeEntityCache,
} from '@ibee/supabase'
import { validateEventStep, type EventCreateInput } from '@ibee/shared'

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

function inputToDraft(input: EventCreateInput) {
  const toLocal = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return {
    title: input.title,
    description: input.description ?? '',
    startAt: toLocal(input.start_at),
    endAt: input.end_at ? toLocal(input.end_at) : '',
    locationType: input.location_type,
    locationDetails: input.location_details ?? '',
    price: input.price_cents != null ? String(input.price_cents / 100) : '',
    capacity: input.capacity != null ? String(input.capacity) : '',
    highlights: input.highlights ?? [],
    gallery: (input.gallery_images ?? []).map((url) => ({ url, uploading: false })),
    contentBlocks: (input.content_blocks ?? []).map((b) =>
      b.type === 'text'
        ? { type: 'text' as const, content: b.content }
        : { type: 'image' as const, url: b.url, uploading: false },
    ),
    faq: input.faq ?? [],
    isPublished: input.is_published,
  }
}

export async function createEventAction(input: EventCreateInput) {
  const draft = inputToDraft(input)
  const fieldErrors: Record<string, string> = {}
  for (const step of [1, 2] as const) {
    const result = validateEventStep(step, draft)
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
    const baseSlug = slugify(title) || 'event'
    let eventId: string | null = null
    let eventSlug: string | null = null
    let lastError: unknown = null

    const common = {
      title,
      description: input.description ?? null,
      start_at: input.start_at,
      end_at: input.end_at ?? null,
      location_type: input.location_type,
      location_details: input.location_details ?? null,
      price_cents: input.price_cents ?? null,
      currency: 'EUR',
      capacity: input.capacity ?? null,
      is_published: input.is_published,
      highlights: input.highlights ?? [],
      gallery_images: input.gallery_images ?? [],
      content_blocks: input.content_blocks ?? [],
      faq: input.faq ?? [],
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 76)}-${attempt + 1}`
      try {
        const ev = await createEvent(supabase, entity.id, { ...common, slug })
        eventId = ev.id
        eventSlug = ev.slug
        break
      } catch (err) {
        lastError = err
        if (isUniqueViolation(err)) continue
        console.error('[createEventAction]', err)
        return { ok: false as const, error: "Erreur lors de la création de l'event." }
      }
    }

    if (!eventId || !eventSlug) {
      console.error('[createEventAction] slug collision', lastError)
      return {
        ok: false as const,
        error: 'Impossible de générer un identifiant unique pour ce titre.',
        fieldErrors: { title: 'Choisis un titre légèrement différent.' },
      }
    }

    if (input.is_published) {
      try {
        const { data: existing } = await supabase
          .from('entity_menu_sections')
          .select('id, is_active')
          .eq('entity_id', entity.id)
          .eq('type', 'events' as never)
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
            type: 'events' as never,
            is_active: true,
            is_configured: true,
            position: nextPosition,
          })
        } else if (!existing.is_active) {
          await supabase
            .from('entity_menu_sections')
            .update({ is_active: true })
            .eq('id', existing.id)
        }
      } catch (err) {
        console.error('[createEventAction] ensure events section', err)
      }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug, { eventSlug })

    return {
      ok: true as const,
      event: {
        id: eventId,
        title,
        slug: eventSlug,
        description: input.description ?? null,
        start_at: input.start_at,
        price_cents: input.price_cents ?? null,
        currency: 'EUR',
        image_url: input.gallery_images?.[0] ?? null,
        is_published: input.is_published,
      },
    }
  } catch (err) {
    console.error('[createEventAction]', err)
    return { ok: false as const, error: "Erreur lors de la création de l'event." }
  }
}

export async function deleteEventAction(eventId: string) {
  if (!eventId) return { ok: false as const, error: 'Event invalide.' }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    const event = await getEventById(supabase, eventId)
    if (!event || event.entity_id !== entity.id) {
      return { ok: false as const, error: 'Event introuvable.' }
    }

    await deleteEvent(supabase, eventId)

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug, { eventSlug: event.slug })

    return { ok: true as const }
  } catch (err) {
    console.error('[deleteEventAction]', err)
    return { ok: false as const, error: "Erreur lors de la suppression de l'event." }
  }
}
