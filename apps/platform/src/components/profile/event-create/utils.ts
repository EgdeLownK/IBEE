import { buildEventCreatePayload, validateEventStep, type EventCreateDraft } from '@ibee/shared'
import type { EventCreateFormState } from './types'

export function createInitialFormState(): EventCreateFormState {
  return {
    step: 1,
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    locationType: 'online',
    locationDetails: '',
    price: '',
    capacity: '',
    highlights: [],
    galleryImages: [],
    contentBlocks: [],
    faq: [],
    isPublished: true,
    fieldErrors: {},
    globalError: '',
  }
}

export function formToDraft(form: EventCreateFormState): EventCreateDraft {
  return {
    title: form.title,
    description: form.description,
    startAt: form.startAt,
    endAt: form.endAt,
    locationType: form.locationType,
    locationDetails: form.locationDetails,
    price: form.price,
    capacity: form.capacity,
    highlights: form.highlights,
    gallery: form.galleryImages.map((g) => ({ url: g.url, uploading: g.uploading })),
    contentBlocks: form.contentBlocks.map((b) =>
      b.type === 'text'
        ? { type: 'text' as const, content: b.content }
        : { type: 'image' as const, url: b.url, uploading: b.uploading }
    ),
    faq: form.faq,
    isPublished: form.isPublished,
  }
}

export function validateStep(form: EventCreateFormState, step: 1 | 2) {
  return validateEventStep(step, formToDraft(form))
}

export function buildPayload(form: EventCreateFormState) {
  return buildEventCreatePayload(formToDraft(form))
}
