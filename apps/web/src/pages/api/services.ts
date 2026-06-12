/** @deprecated Phase 9 — services via dashboard (`service-actions`). Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import {
  getEntityByUserId,
  createAppointmentType,
  purgeEntityCache,
} from '@ibee/supabase'
import type { ServiceContentBlock } from '@ibee/supabase'

// ---------------------------------------------------------------------------
// Constantes de validation (miroir des CHECK de appointments_system +
// service_modal)
// ---------------------------------------------------------------------------

const LOCATION_TYPES = ['video', 'phone', 'in_person'] as const
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

  // --- Description (courte) ---
  let description: string | null = null
  if (typeof body?.description === 'string' && body.description.trim().length > 0) {
    const desc = body.description.trim()
    if (desc.length > 2000) {
      fieldErrors.description = 'La description ne peut pas dépasser 2000 caractères.'
    } else {
      description = desc
    }
  }

  // --- Durée ---
  const durationMinutes = Number(body?.duration_minutes)
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
    fieldErrors.duration_minutes = 'La durée doit être entre 5 et 480 minutes.'
  }

  // --- Lieu ---
  const locationType = body?.location_type
  if (!LOCATION_TYPES.includes(locationType)) {
    fieldErrors.location_type = 'Type de lieu invalide.'
  }
  let locationDetails: string | null = null
  if (typeof body?.location_details === 'string' && body.location_details.trim().length > 0) {
    const details = body.location_details.trim()
    if (details.length > 200) {
      fieldErrors.location_details = 'Les détails du lieu ne peuvent pas dépasser 200 caractères.'
    } else {
      locationDetails = details
    }
  }

  // --- Prix + promo (promo > 0, < prix, nécessite un prix — miroir du CHECK) ---
  let priceCents: number | null = null
  if (body?.price_cents !== undefined && body?.price_cents !== null) {
    const p = Number(body.price_cents)
    if (!Number.isInteger(p) || p < 0) {
      fieldErrors.price_cents = 'Le prix doit être un entier positif ou nul.'
    } else {
      priceCents = p
    }
  }
  let promoPriceCents: number | null = null
  if (body?.promo_price_cents !== undefined && body?.promo_price_cents !== null) {
    const pp = Number(body.promo_price_cents)
    if (!Number.isInteger(pp) || pp <= 0) {
      fieldErrors.promo_price_cents = 'Le prix promo doit être supérieur à 0.'
    } else if (priceCents === null || priceCents <= 0) {
      fieldErrors.promo_price_cents = 'Une promo nécessite un prix de base.'
    } else if (pp >= priceCents) {
      fieldErrors.promo_price_cents = 'Le prix promo doit être inférieur au prix.'
    } else {
      promoPriceCents = pp
    }
  }

  // --- Règles de réservation ---
  const minNoticeHours = Number(body?.min_notice_hours)
  if (!Number.isInteger(minNoticeHours) || minNoticeHours < 0 || minNoticeHours > 720) {
    fieldErrors.min_notice_hours = 'Le préavis doit être entre 0 et 720 heures.'
  }
  const maxAdvanceDays = Number(body?.max_advance_days)
  if (!Number.isInteger(maxAdvanceDays) || maxAdvanceDays < 1 || maxAdvanceDays > 365) {
    fieldErrors.max_advance_days = 'La réservation à l\'avance doit être entre 1 et 365 jours.'
  }
  const bufferBefore = Number(body?.buffer_before_minutes)
  if (!Number.isInteger(bufferBefore) || bufferBefore < 0 || bufferBefore > 480) {
    fieldErrors.buffer_before_minutes = 'Le battement avant doit être entre 0 et 480 minutes.'
  }
  const bufferAfter = Number(body?.buffer_after_minutes)
  if (!Number.isInteger(bufferAfter) || bufferAfter < 0 || bufferAfter > 480) {
    fieldErrors.buffer_after_minutes = 'Le battement après doit être entre 0 et 480 minutes.'
  }

  const autoAccept = body?.auto_accept_bookings === true
  const isActive = body?.is_active === true

  // --- Points forts (highlights) ---
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

  // --- Galerie (URLs d'images uploadées) ---
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

  // --- Contenu détaillé (content_blocks : text | image — list non géré par le
  //     formulaire de création, le renderer le supporte pour plus tard) ---
  let contentBlocks: ServiceContentBlock[] = []
  if (body?.content_blocks !== undefined && body?.content_blocks !== null) {
    if (!Array.isArray(body.content_blocks)) {
      fieldErrors.content_blocks = 'Le contenu doit être une liste de blocs.'
    } else if (body.content_blocks.length > 20) {
      fieldErrors.content_blocks = 'Maximum 20 blocs de contenu.'
    } else {
      const blocks: ServiceContentBlock[] = []
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

  // --- FAQ (faq) ---
  // Array optionnel de {question 1-200, answer 1-1000}. Max 10.
  type FaqItem = { question: string; answer: string }
  let faqItems: FaqItem[] = []
  if (body?.faq !== undefined && body?.faq !== null) {
    if (!Array.isArray(body.faq)) {
      fieldErrors.faq = 'La FAQ doit être une liste.'
    } else if (body.faq.length > 10) {
      fieldErrors.faq = 'Maximum 10 questions dans la FAQ.'
    } else {
      const cleaned: FaqItem[] = []
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

  if (Object.keys(fieldErrors).length > 0) {
    return new Response(JSON.stringify({ success: false, error: 'Données invalides.', fieldErrors }), { status: 400 })
  }

  const payload = {
    description,
    duration_minutes: durationMinutes,
    location_type: locationType as LocationType,
    location_details: locationDetails,
    price_cents: priceCents,
    promo_price_cents: promoPriceCents,
    currency: 'EUR',
    buffer_before_minutes: bufferBefore,
    buffer_after_minutes: bufferAfter,
    min_notice_hours: minNoticeHours,
    max_advance_days: maxAdvanceDays,
    highlights,
    gallery_images: galleryImages,
    content_blocks: contentBlocks,
    faq: faqItems,
    is_active: isActive,
    auto_accept_bookings: autoAccept,
  }

  // --- Création avec retry sur collision de slug (-2, -3, ...) ---
  // Le helper slugifie le titre ; en cas de collision (unique entity_id+slug),
  // on retente avec un suffixe.
  const baseSlug = slugify(title) || 'service'
  let serviceId: string | null = null
  let serviceSlug: string | null = null
  let lastError: unknown = null
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 76)}-${attempt + 1}`
    try {
      const service = await createAppointmentType(authClient, entity.id, { ...payload, title, slug })
      serviceId = service.id
      serviceSlug = service.slug
      break
    } catch (err) {
      lastError = err
      if (isUniqueViolation(err)) {
        continue // collision → suffixe suivant
      }
      console.error('[api/services] createAppointmentType', err)
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la création du service.' }), { status: 500 })
    }
  }

  if (!serviceId) {
    console.error('[api/services] slug collision exhausted', lastError)
    return new Response(
      JSON.stringify({ success: false, error: 'Impossible de générer un identifiant unique pour ce titre.', fieldErrors: { title: 'Choisis un titre légèrement différent.' } }),
      { status: 409 }
    )
  }

  // --- Si actif, activer la section menu "appointments" (pattern products/shop) ---
  if (isActive) {
    try {
      const { data: existing } = await authClient
        .from('entity_menu_sections')
        .select('id, is_active')
        .eq('entity_id', entity.id)
        .eq('type', 'appointments' as never)
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
          type: 'appointments' as never,
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
      console.error('[api/services] ensure appointments section', err)
    }
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ success: true, serviceId, serviceSlug }))
}
