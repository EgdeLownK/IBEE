/** Validation + payload builder — miroir ServiceCreateOverlay.astro */

import {
  buildPresentationPayload,
  validatePresentationFields,
  type ContentBlockInput,
  type FaqInput,
} from './presentation-fields'
import { priceToCents } from './product-create'

export { priceToCents }

export const SERVICE_LOCATION_TYPES = ['video', 'phone', 'in_person'] as const
export type ServiceLocationType = (typeof SERVICE_LOCATION_TYPES)[number]

export type ServiceCreateInput = {
  title: string
  description?: string
  duration_minutes: number
  location_type: ServiceLocationType
  location_details?: string
  price_cents?: number | null
  promo_price_cents?: number | null
  min_notice_hours: number
  max_advance_days: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  auto_accept_bookings: boolean
  is_active: boolean
  payment_required?: boolean
  deposit_percent?: number
  cancel_min_hours?: number
  highlights?: string[]
  gallery_images?: string[]
  content_blocks?: ContentBlockInput[]
  faq?: FaqInput[]
}

export type ServiceCreateDraft = {
  title: string
  description: string
  durationMinutes: string
  locationType: ServiceLocationType
  locationDetails: string
  price: string
  promoEnabled: boolean
  promoPrice: string
  autoAcceptBookings: boolean
  paymentRequired: boolean
  depositPercent: string
  cancelMinHours: string
  minNoticeHours: string
  maxAdvanceDays: string
  bufferBeforeMinutes: string
  bufferAfterMinutes: string
  highlights: string[]
  gallery: { url: string; uploading: boolean }[]
  contentBlocks: (
    | { type: 'text'; content: string }
    | { type: 'image'; url: string; uploading: boolean }
  )[]
  faq: { question: string; answer: string }[]
  isActive: boolean
}

export type ValidationResult = {
  ok: boolean
  fieldErrors: Record<string, string>
}

export function validateServiceStep(step: 1 | 2 | 3, draft: ServiceCreateDraft): ValidationResult {
  const fieldErrors: Record<string, string> = {}
  const fail = (field: string, msg: string) => {
    fieldErrors[field] = msg
  }

  if (step === 1) {
    const title = draft.title.trim()
    if (title.length < 1) fail('title', 'Le titre est obligatoire.')
    else if (title.length > 120) fail('title', 'Maximum 120 caractères.')

    const desc = draft.description.trim()
    if (desc.length > 2000) fail('description', 'Maximum 2000 caractères.')

    const duration = Number(draft.durationMinutes)
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      fail('duration_minutes', 'La durée doit être entre 5 et 480 minutes.')
    }

    if (!SERVICE_LOCATION_TYPES.includes(draft.locationType)) {
      fail('location_type', 'Type de lieu invalide.')
    }

    const details = draft.locationDetails.trim()
    if (details.length > 200) {
      fail('location_details', 'Maximum 200 caractères.')
    }

    let priceCents: number | null = null
    if (draft.price.trim() !== '') {
      const p = priceToCents(draft.price)
      if (p === null || p < 0) {
        fail('price_cents', 'Le prix doit être positif ou nul.')
      } else {
        priceCents = p
      }
    }

    if (draft.promoEnabled) {
      const pp = priceToCents(draft.promoPrice)
      if (pp === null || pp <= 0) {
        fail('promo_price_cents', 'Le prix promo doit être supérieur à 0.')
      } else if (priceCents === null || priceCents <= 0) {
        fail('promo_price_cents', 'Une promo nécessite un prix de base.')
      } else if (pp >= priceCents) {
        fail('promo_price_cents', 'Le prix promo doit être inférieur au prix.')
      }
    }
  }

  if (step === 2) {
    const notice = Number(draft.minNoticeHours)
    if (!Number.isInteger(notice) || notice < 0 || notice > 720) {
      fail('min_notice_hours', 'Le préavis doit être entre 0 et 720 heures.')
    }
    const advance = Number(draft.maxAdvanceDays)
    if (!Number.isInteger(advance) || advance < 1 || advance > 365) {
      fail('max_advance_days', 'La réservation à l\'avance doit être entre 1 et 365 jours.')
    }
    const bufBefore = Number(draft.bufferBeforeMinutes)
    if (!Number.isInteger(bufBefore) || bufBefore < 0 || bufBefore > 480) {
      fail('buffer_before_minutes', 'Le battement avant doit être entre 0 et 480 minutes.')
    }
    const bufAfter = Number(draft.bufferAfterMinutes)
    if (!Number.isInteger(bufAfter) || bufAfter < 0 || bufAfter > 480) {
      fail('buffer_after_minutes', 'Le battement après doit être entre 0 et 480 minutes.')
    }
    const cancelMin = Number(draft.cancelMinHours)
    if (!Number.isInteger(cancelMin) || cancelMin < 0 || cancelMin > 720) {
      fail('cancel_min_hours', 'Le délai d’annulation doit être entre 0 et 720 heures.')
    }
    const deposit = Number(draft.depositPercent)
    if (!Number.isInteger(deposit) || deposit < 1 || deposit > 100) {
      fail('deposit_percent', 'L’acompte doit être entre 1 et 100 %.')
    }
  }

  if (step === 3) {
    validatePresentationFields(
      {
        highlights: draft.highlights,
        gallery: draft.gallery,
        contentBlocks: draft.contentBlocks,
        faq: draft.faq,
      },
      fail
    )
  }

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors }
}

export function buildServiceCreatePayload(draft: ServiceCreateDraft): ServiceCreateInput {
  const priceCents = draft.price.trim() === '' ? null : priceToCents(draft.price)
  let promoPriceCents: number | null = null
  if (draft.promoEnabled) {
    promoPriceCents = priceToCents(draft.promoPrice)
  }

  const description = draft.description.trim()
  const locationDetails = draft.locationDetails.trim()

  const payload: ServiceCreateInput = {
    title: draft.title.trim(),
    duration_minutes: Number(draft.durationMinutes),
    location_type: draft.locationType,
    min_notice_hours: Number(draft.minNoticeHours),
    max_advance_days: Number(draft.maxAdvanceDays),
    buffer_before_minutes: Number(draft.bufferBeforeMinutes),
    buffer_after_minutes: Number(draft.bufferAfterMinutes),
    auto_accept_bookings: draft.autoAcceptBookings,
    is_active: draft.isActive,
    payment_required: draft.paymentRequired,
    deposit_percent: Number(draft.depositPercent),
    cancel_min_hours: Number(draft.cancelMinHours),
  }

  if (description.length > 0) payload.description = description
  if (locationDetails.length > 0) payload.location_details = locationDetails
  if (priceCents !== null) payload.price_cents = priceCents
  if (promoPriceCents !== null) payload.promo_price_cents = promoPriceCents

  const presentation = buildPresentationPayload({
    highlights: draft.highlights,
    gallery: draft.gallery,
    contentBlocks: draft.contentBlocks,
    faq: draft.faq,
  })
  return { ...payload, ...presentation }
}

export function serviceStepForField(field: string): 1 | 2 | 3 {
  if (
    field === 'min_notice_hours' ||
    field === 'max_advance_days' ||
    field === 'buffer_before_minutes' ||
    field === 'buffer_after_minutes' ||
    field === 'cancel_min_hours' ||
    field === 'deposit_percent' ||
    field === 'payment_required' ||
    field === 'auto_accept_bookings'
  ) {
    return 2
  }
  if (
    field === 'highlights' ||
    field === 'gallery_images' ||
    field === 'content_blocks' ||
    field === 'faq'
  ) {
    return 3
  }
  return 1
}
