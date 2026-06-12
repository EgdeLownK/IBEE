import {
  buildServiceCreatePayload,
  validateServiceStep,
  type ServiceCreateDraft,
} from '@ibee/ui-server'
import type { ServiceCreateFormState } from './types'

export function createInitialFormState(): ServiceCreateFormState {
  return {
    step: 1,
    title: '',
    description: '',
    durationMinutes: '30',
    locationType: 'video',
    locationDetails: '',
    price: '',
    promoEnabled: false,
    promoPrice: '',
    autoAcceptBookings: true,
    minNoticeHours: '24',
    maxAdvanceDays: '60',
    bufferBeforeMinutes: '0',
    bufferAfterMinutes: '0',
    highlights: [],
    galleryImages: [],
    contentBlocks: [],
    faq: [],
    isActive: true,
    fieldErrors: {},
    globalError: '',
  }
}

export function formToDraft(form: ServiceCreateFormState): ServiceCreateDraft {
  return {
    title: form.title,
    description: form.description,
    durationMinutes: form.durationMinutes,
    locationType: form.locationType,
    locationDetails: form.locationDetails,
    price: form.price,
    promoEnabled: form.promoEnabled,
    promoPrice: form.promoPrice,
    autoAcceptBookings: form.autoAcceptBookings,
    minNoticeHours: form.minNoticeHours,
    maxAdvanceDays: form.maxAdvanceDays,
    bufferBeforeMinutes: form.bufferBeforeMinutes,
    bufferAfterMinutes: form.bufferAfterMinutes,
    highlights: form.highlights,
    gallery: form.galleryImages.map((g) => ({ url: g.url, uploading: g.uploading })),
    contentBlocks: form.contentBlocks.map((b) =>
      b.type === 'text'
        ? { type: 'text' as const, content: b.content }
        : { type: 'image' as const, url: b.url, uploading: b.uploading }
    ),
    faq: form.faq,
    isActive: form.isActive,
  }
}

export function validateStep(form: ServiceCreateFormState, step: 1 | 2 | 3) {
  return validateServiceStep(step, formToDraft(form))
}

export function buildPayload(form: ServiceCreateFormState) {
  return buildServiceCreatePayload(formToDraft(form))
}
