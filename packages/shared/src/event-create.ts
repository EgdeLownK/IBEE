/** Validation + payload builder — miroir EventCreateOverlay.astro */

import {
  buildPresentationPayload,
  validatePresentationFields,
  type ContentBlockInput,
  type FaqInput,
} from './presentation-fields'
import { priceToCents } from './product-create'

export { priceToCents }

export const EVENT_LOCATION_TYPES = ['online', 'in_person'] as const
export type EventLocationType = (typeof EVENT_LOCATION_TYPES)[number]

export type EventCreateInput = {
  title: string
  description?: string
  start_at: string
  end_at?: string | null
  location_type: EventLocationType
  location_details?: string
  price_cents?: number | null
  capacity?: number | null
  is_published: boolean
  highlights?: string[]
  gallery_images?: string[]
  content_blocks?: ContentBlockInput[]
  faq?: FaqInput[]
}

export type EventCreateDraft = {
  title: string
  description: string
  startAt: string
  endAt: string
  locationType: EventLocationType
  locationDetails: string
  price: string
  capacity: string
  highlights: string[]
  gallery: { url: string; uploading: boolean }[]
  contentBlocks: (
    | { type: 'text'; content: string }
    | { type: 'image'; url: string; uploading: boolean }
  )[]
  faq: { question: string; answer: string }[]
  isPublished: boolean
}

export type ValidationResult = {
  ok: boolean
  fieldErrors: Record<string, string>
}

export function validateEventStep(step: 1 | 2, draft: EventCreateDraft): ValidationResult {
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

    const startRaw = draft.startAt.trim()
    const startDate = startRaw ? new Date(startRaw) : null
    if (!startDate || Number.isNaN(startDate.getTime())) {
      fail('start_at', 'La date de début est obligatoire.')
    } else if (startDate.getTime() <= Date.now()) {
      fail('start_at', 'La date de début doit être dans le futur.')
    }

    if (draft.endAt.trim()) {
      const endDate = new Date(draft.endAt)
      if (Number.isNaN(endDate.getTime())) {
        fail('end_at', 'La date de fin est invalide.')
      } else if (startDate && !Number.isNaN(startDate.getTime()) && endDate.getTime() <= startDate.getTime()) {
        fail('end_at', 'La fin doit être après le début.')
      }
    }

    if (!EVENT_LOCATION_TYPES.includes(draft.locationType)) {
      fail('location_type', 'Type de lieu invalide.')
    }

    const details = draft.locationDetails.trim()
    if (details.length > 300) {
      fail('location_details', 'Maximum 300 caractères.')
    }

    if (draft.price.trim() !== '') {
      const p = priceToCents(draft.price)
      if (p === null || p < 0) {
        fail('price_cents', 'Le prix doit être positif ou nul.')
      }
    }

    if (draft.capacity.trim() !== '') {
      const c = Number(draft.capacity)
      if (!Number.isInteger(c) || c < 1) {
        fail('capacity', 'Le nombre de places doit être un entier supérieur à 0.')
      }
    }
  }

  if (step === 2) {
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

export function buildEventCreatePayload(draft: EventCreateDraft): EventCreateInput {
  const priceCents = draft.price.trim() === '' ? null : priceToCents(draft.price)
  const description = draft.description.trim()
  const locationDetails = draft.locationDetails.trim()
  const startAt = new Date(draft.startAt).toISOString()

  let endAt: string | null = null
  if (draft.endAt.trim()) {
    endAt = new Date(draft.endAt).toISOString()
  }

  let capacity: number | null = null
  if (draft.capacity.trim() !== '') {
    capacity = Number(draft.capacity)
  }

  const payload: EventCreateInput = {
    title: draft.title.trim(),
    start_at: startAt,
    location_type: draft.locationType,
    is_published: draft.isPublished,
  }

  if (description.length > 0) payload.description = description
  if (endAt) payload.end_at = endAt
  if (locationDetails.length > 0) payload.location_details = locationDetails
  if (priceCents !== null) payload.price_cents = priceCents
  if (capacity !== null) payload.capacity = capacity

  const presentation = buildPresentationPayload({
    highlights: draft.highlights,
    gallery: draft.gallery,
    contentBlocks: draft.contentBlocks,
    faq: draft.faq,
  })
  return { ...payload, ...presentation }
}

export function eventStepForField(field: string): 1 | 2 {
  if (
    field === 'highlights' ||
    field === 'gallery_images' ||
    field === 'content_blocks' ||
    field === 'faq'
  ) {
    return 2
  }
  return 1
}
