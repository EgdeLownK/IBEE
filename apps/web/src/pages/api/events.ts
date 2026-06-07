import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import {
  getEntityByUserId,
  createEvent,
  purgeEntityCache,
} from '@ibee/supabase'
import type { EventContentBlock, EventFaqItem } from '@ibee/supabase'

// ---------------------------------------------------------------------------
// Constantes de validation (miroir des CHECK de events_v1)
// ---------------------------------------------------------------------------

const LOCATION_TYPES = ['online', 'in_person'] as const
type LocationType = (typeof LOCATION_TYPES)[number]

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

interface FieldErrors {
  [field: string]: string
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'Profil introuvable.' }), { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const fieldErrors: FieldErrors = {}

  // --- Titre ---
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (title.length < 1) fieldErrors.title = 'Le titre est obligatoire.'
  else if (title.length > 120) fieldErrors.title = 'Le titre ne peut pas dépasser 120 caractères.'

  // --- Description ---
  let description: string | null = null
  if (typeof body?.description === 'string' && body.description.trim().length > 0) {
    const desc = body.description.trim()
    if (desc.length > 2000) {
      fieldErrors.description = 'La description ne peut pas dépasser 2000 caractères.'
    } else {
      description = desc
    }
  }

  // --- Dates ---
  let startAt: string | null = null
  const startRaw = typeof body?.start_at === 'string' ? body.start_at : ''
  const startDate = startRaw ? new Date(startRaw) : null
  if (!startDate || Number.isNaN(startDate.getTime())) {
    fieldErrors.start_at = 'La date de début est obligatoire.'
  } else if (startDate.getTime() <= Date.now()) {
    fieldErrors.start_at = 'La date de début doit être dans le futur.'
  } else {
    startAt = startDate.toISOString()
  }

  let endAt: string | null = null
  if (body?.end_at !== undefined && body?.end_at !== null && `${body.end_at}`.length > 0) {
    const endDate = new Date(body.end_at)
    if (Number.isNaN(endDate.getTime())) {
      fieldErrors.end_at = 'La date de fin est invalide.'
    } else if (startDate && !Number.isNaN(startDate.getTime()) && endDate.getTime() <= startDate.getTime()) {
      fieldErrors.end_at = 'La fin doit être après le début.'
    } else {
      endAt = endDate.toISOString()
    }
  }

  // --- Lieu ---
  const locationType = body?.location_type
  if (!LOCATION_TYPES.includes(locationType)) {
    fieldErrors.location_type = 'Type de lieu invalide.'
  }
  let locationDetails: string | null = null
  if (typeof body?.location_details === 'string' && body.location_details.trim().length > 0) {
    const details = body.location_details.trim()
    if (details.length > 300) {
      fieldErrors.location_details = 'Les détails du lieu ne peuvent pas dépasser 300 caractères.'
    } else {
      locationDetails = details
    }
  }

  // --- Prix ---
  let priceCents: number | null = null
  if (body?.price_cents !== undefined && body?.price_cents !== null) {
    const p = Number(body.price_cents)
    if (!Number.isInteger(p) || p < 0) {
      fieldErrors.price_cents = 'Le prix doit être un entier positif ou nul.'
    } else {
      priceCents = p
    }
  }

  // --- Capacité ---
  let capacity: number | null = null
  if (body?.capacity !== undefined && body?.capacity !== null) {
    const c = Number(body.capacity)
    if (!Number.isInteger(c) || c < 1) {
      fieldErrors.capacity = 'Le nombre de places doit être un entier supérieur à 0.'
    } else {
      capacity = c
    }
  }

  const isPublished = body?.is_published === true

  // --- Points forts ---
  let highlights: string[] = []
  if (body?.highlights !== undefined && body?.highlights !== null) {
    if (!Array.isArray(body.highlights)) {
      fieldErrors.highlights = 'Les points forts doivent être une liste.'
    } else if (body.highlights.length > 4) {
      fieldErrors.highlights = 'Maximum 4 points forts.'
    } else {
      const cleaned: string[] = []
      for (const raw of body.highlights) {
        const h = typeof raw === 'string' ? raw.trim() : ''
        if (h.length < 1 || h.length > 80) {
          fieldErrors.highlights = 'Chaque point fort doit faire entre 1 et 80 caractères.'
          break
        }
        cleaned.push(h)
      }
      if (!fieldErrors.highlights) highlights = cleaned
    }
  }

  // --- Galerie ---
  let galleryImages: string[] = []
  if (body?.gallery_images !== undefined && body?.gallery_images !== null) {
    if (!Array.isArray(body.gallery_images)) {
      fieldErrors.gallery_images = 'La galerie doit être une liste.'
    } else if (body.gallery_images.length > 6) {
      fieldErrors.gallery_images = 'Maximum 6 images.'
    } else {
      const cleaned: string[] = []
      for (const raw of body.gallery_images) {
        const url = typeof raw === 'string' ? raw.trim() : ''
        let urlOk = false
        try { new URL(url); urlOk = true } catch { urlOk = false }
        if (!urlOk) {
          fieldErrors.gallery_images = 'Chaque image doit avoir une URL valide.'
          break
        }
        cleaned.push(url)
      }
      if (!fieldErrors.gallery_images) galleryImages = cleaned
    }
  }

  // --- Contenu détaillé ---
  let contentBlocks: EventContentBlock[] = []
  if (body?.content_blocks !== undefined && body?.content_blocks !== null) {
    if (!Array.isArray(body.content_blocks)) {
      fieldErrors.content_blocks = 'Le contenu doit être une liste de blocs.'
    } else if (body.content_blocks.length > 20) {
      fieldErrors.content_blocks = 'Maximum 20 blocs de contenu.'
    } else {
      const blocks: EventContentBlock[] = []
      for (const raw of body.content_blocks) {
        if (raw?.type === 'text') {
          const content = typeof raw.content === 'string' ? raw.content.trim() : ''
          if (content.length < 1 || content.length > 2000) {
            fieldErrors.content_blocks = 'Chaque bloc texte doit faire entre 1 et 2000 caractères.'
            break
          }
          blocks.push({ type: 'text', content })
        } else if (raw?.type === 'image') {
          const url = typeof raw.url === 'string' ? raw.url.trim() : ''
          let urlOk = false
          try { new URL(url); urlOk = true } catch { urlOk = false }
          if (!urlOk) {
            fieldErrors.content_blocks = 'Chaque bloc image doit avoir une URL valide.'
            break
          }
          const alt = typeof raw.alt === 'string' ? raw.alt.trim().slice(0, 200) : undefined
          blocks.push(alt ? { type: 'image', url, alt } : { type: 'image', url })
        } else {
          fieldErrors.content_blocks = 'Type de bloc inconnu (text ou image attendu).'
          break
        }
      }
      if (!fieldErrors.content_blocks) contentBlocks = blocks
    }
  }

  // --- FAQ ---
  let faqItems: EventFaqItem[] = []
  if (body?.faq !== undefined && body?.faq !== null) {
    if (!Array.isArray(body.faq)) {
      fieldErrors.faq = 'La FAQ doit être une liste.'
    } else if (body.faq.length > 10) {
      fieldErrors.faq = 'Maximum 10 questions dans la FAQ.'
    } else {
      const cleaned: EventFaqItem[] = []
      for (const raw of body.faq) {
        const question = typeof raw?.question === 'string' ? raw.question.trim() : ''
        const answer = typeof raw?.answer === 'string' ? raw.answer.trim() : ''
        if (question.length < 1 || question.length > 200) {
          fieldErrors.faq = 'Chaque question doit faire entre 1 et 200 caractères.'
          break
        }
        if (answer.length < 1 || answer.length > 1000) {
          fieldErrors.faq = 'Chaque réponse doit faire entre 1 et 1000 caractères.'
          break
        }
        cleaned.push({ question, answer })
      }
      if (!fieldErrors.faq) faqItems = cleaned
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !startAt) {
    return new Response(JSON.stringify({ success: false, error: 'Données invalides.', fieldErrors }), { status: 400 })
  }

  const payload = {
    description,
    start_at: startAt,
    end_at: endAt,
    location_type: locationType as LocationType,
    location_details: locationDetails,
    price_cents: priceCents,
    currency: 'EUR',
    capacity,
    is_published: isPublished,
    highlights,
    gallery_images: galleryImages,
    content_blocks: contentBlocks,
    faq: faqItems,
  }

  // --- Création avec retry sur collision de slug (-2, -3, ...) ---
  const baseSlug = slugify(title) || 'event'
  let eventId: string | null = null
  let eventSlug: string | null = null
  let lastError: unknown = null
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 76)}-${attempt + 1}`
    try {
      const event = await createEvent(authClient, entity.id, { ...payload, title, slug })
      eventId = event.id
      eventSlug = event.slug
      break
    } catch (err) {
      lastError = err
      if (isUniqueViolation(err)) {
        continue
      }
      console.error('[api/events] createEvent', err)
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la création de l\'event.' }), { status: 500 })
    }
  }

  if (!eventId) {
    console.error('[api/events] slug collision exhausted', lastError)
    return new Response(
      JSON.stringify({ success: false, error: 'Impossible de générer un identifiant unique pour ce titre.', fieldErrors: { title: 'Choisis un titre légèrement différent.' } }),
      { status: 409 }
    )
  }

  // --- Si publié, activer la section menu "events" (pattern shop/appointments) ---
  if (isPublished) {
    try {
      const { data: existing } = await authClient
        .from('entity_menu_sections')
        .select('id, is_active')
        .eq('entity_id', entity.id)
        .eq('type', 'events' as never)
        .maybeSingle()

      if (!existing) {
        const { data: positions } = await authClient
          .from('entity_menu_sections')
          .select('position')
          .eq('entity_id', entity.id)
          .order('position', { ascending: false })
          .limit(1)
        const nextPosition = (positions?.[0]?.position ?? 0) + 1

        await authClient.from('entity_menu_sections').insert({
          entity_id: entity.id,
          type: 'events' as never,
          is_active: true,
          is_configured: true,
          position: nextPosition,
        })
      } else if (!existing.is_active) {
        await authClient
          .from('entity_menu_sections')
          .update({ is_active: true })
          .eq('id', existing.id)
      }
    } catch (err) {
      console.error('[api/events] ensure events section', err)
    }
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ success: true, eventId, eventSlug }))
}
