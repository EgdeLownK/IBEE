import {
  buildProductCreatePayload,
  validateProductStep,
  type ProductCreateDraft,
} from '@ibee/ui-server'
import type { ProductCreateFormState } from './types'

let uid = 0
export function nextId(prefix = 'id') {
  uid += 1
  return `${prefix}${uid}`
}

export function createInitialFormState(): ProductCreateFormState {
  return {
    step: 0,
    type: null,
    media: [],
    title: '',
    descriptionShort: '',
    bullets: [],
    price: '',
    promoEnabled: false,
    salePrice: '',
    saleEndsAt: '',
    categoryId: '',
    newCategoryName: '',
    pickupEnabled: false,
    deliveryEnabled: false,
    physicalPickupLocation: '',
    physicalStockQuantity: '1',
    physicalCondition: 'new',
    variants: [],
    digitalFileId: null,
    digitalFile: null,
    digitalFileUploading: false,
    entityFiles: [],
    customDetails: [],
    contentBlocks: [],
    faq: [],
    publish: false,
    fieldErrors: {},
    globalError: '',
  }
}

export function formToDraft(form: ProductCreateFormState): ProductCreateDraft {
  if (!form.type) throw new Error('Type requis')
  return {
    type: form.type,
    title: form.title,
    descriptionShort: form.descriptionShort,
    bullets: form.bullets,
    price: form.price,
    promoEnabled: form.promoEnabled,
    salePrice: form.salePrice,
    saleEndsAt: form.saleEndsAt,
    categoryId: form.categoryId,
    newCategoryName: form.newCategoryName,
    media: form.media.map((m) => ({ url: m.url, type: m.type, uploading: m.uploading })),
    pickupEnabled: form.pickupEnabled,
    deliveryEnabled: form.deliveryEnabled,
    physicalPickupLocation: form.physicalPickupLocation,
    physicalStockQuantity: form.physicalStockQuantity,
    physicalCondition: form.physicalCondition,
    variants: form.variants.map((v) => ({
      pairs: v.pairs,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
    })),
    digitalFileId: form.digitalFileId,
    digitalFileUploading: form.digitalFileUploading,
    customDetails: form.customDetails,
    contentBlocks: form.contentBlocks.map((b) =>
      b.type === 'text'
        ? { type: 'text' as const, content: b.content }
        : { type: 'image' as const, url: b.url, uploading: b.uploading }
    ),
    faq: form.faq,
    publish: form.publish,
  }
}

export function validateStep(form: ProductCreateFormState, step: 1 | 2 | 3) {
  if (!form.type) return { ok: false, fieldErrors: { type: 'Choisis un type de produit.' } }
  return validateProductStep(step, formToDraft(form))
}

export function buildPayload(form: ProductCreateFormState) {
  return buildProductCreatePayload(formToDraft(form))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function truncateExcerpt(text: string, max = 150): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}...`
}

export function step2Label(type: ProductCreateFormState['type']): string {
  return type === 'digital' ? 'Fichier & détails' : 'Stock & variantes'
}

export const STEP_LABELS = ["L'essentiel", '', 'Description'] as const

export function mediaHasVideo(media: ProductCreateFormState['media']): boolean {
  return media.some((m) => m.type === 'video')
}

export function canAddMedia(media: ProductCreateFormState['media']): boolean {
  return media.length < 10
}

export function canAddVideo(media: ProductCreateFormState['media']): boolean {
  return !mediaHasVideo(media)
}
