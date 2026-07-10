import {
  buildProductCreatePayload,
  validateProductStep,
  type ProductCreateDraft,
} from '@ibee/shared'
import { CARD_DETAIL_EXCERPT_MAX, truncateText } from '@/lib/entity-detail-excerpt'
import type { ProductCreateFormState } from './types'

let uid = 0
export function nextId(prefix = 'id') {
  uid += 1
  return `${prefix}${uid}`
}

export const DEFAULT_FORM_STATE: ProductCreateFormState = {
  step: 0,
  type: null,
  audience: null,
  media: [],
  title: '',
  descriptionShort: '',
  bullets: [],
  sku: '',
  price: '',
  promoEnabled: false,
  salePrice: '',
  saleEndsAt: '',
  categoryId: '',
  newCategoryName: '',
  pickupEnabled: false,
  inPersonEnabled: false,
  deliveryEnabled: false,
  physicalPickupLocation: '',
  physicalStockQuantity: '',
  physicalCondition: 'new',
  digitalStockUnlimited: true,
  variationMode: 'unique',
  variantOptions: [],
  variants: [],
  digitalFileId: null,
  digitalFile: null,
  digitalFileUploading: false,
  entityFiles: [],
  customDetails: [],
  contentBlocks: [],
  faq: [],
  publishMode: 'publish',
  scheduleDate: '',
  fieldErrors: {},
  globalError: '',
}

export function createInitialFormState(): ProductCreateFormState {
  return { ...DEFAULT_FORM_STATE }
}

export function formToDraft(form: ProductCreateFormState): ProductCreateDraft {
  return {
    type: form.type || 'physical',
    audience: form.audience,
    title: form.title,
    descriptionShort: form.descriptionShort,
    bullets: form.bullets,
    sku: form.sku,
    price: form.price,
    promoEnabled: form.promoEnabled,
    salePrice: form.salePrice,
    saleEndsAt: form.saleEndsAt,
    categoryId: form.categoryId,
    newCategoryName: form.newCategoryName,
    media: form.media.map((m) => ({ url: m.url, type: m.type, uploading: m.uploading })),
    pickupEnabled: form.pickupEnabled,
    inPersonEnabled: form.inPersonEnabled,
    deliveryEnabled: form.deliveryEnabled,
    physicalPickupLocation: form.physicalPickupLocation,
    physicalStockQuantity: '1', // Always 1 if no variants (or ignored)
    physicalCondition: form.physicalCondition,
    digitalStockUnlimited: form.digitalStockUnlimited,
    variationMode: form.variationMode,
    variants: form.variants.flatMap((v) => {
      const basePairs = [...v.pairs]
      if (form.physicalCondition !== 'new' && v.condition) {
        const conditionLabels: Record<string, string> = {
          like_new: 'Comme neuf',
          very_good: 'Très bon état',
          good: 'Bon état',
          acceptable: 'Correct',
        }
        basePairs.push({ key: 'État', value: conditionLabels[v.condition] || 'Occasion' })
      }
      
      return [{
        pairs: basePairs,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
      }]
    }),
    digitalFileId: form.digitalFileId,
    digitalFileUploading: form.digitalFileUploading,
    customDetails: form.customDetails,
    contentBlocks: form.contentBlocks.map((b) => {
      if (b.type === 'text') return { type: 'text' as const, content: b.content }
      if (b.type === 'title') return { type: 'title' as const, content: b.content }
      if (b.type === 'list') return { type: 'list' as const, items: b.items }
      return {
        type: 'image' as const,
        slot_count: b.slot_count,
        images: b.images,
        title: b.title || '',
        description: b.description || '',
        uploading: b.uploading,
      }
    }),
    faq: form.faq,
    publishMode: form.publishMode,
    scheduleDate: form.scheduleDate,
  }
}

export function validateStep(form: ProductCreateFormState, step: 1 | 2 | 3 | 4) {
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

export function truncateExcerpt(text: string, max = CARD_DETAIL_EXCERPT_MAX): string {
  return truncateText(text, max)
}

export function step2Label(type: ProductCreateFormState['type']): string {
  return type === 'digital' ? 'Fichier & détails' : 'Prix & logistique'
}

export const STEP_LABELS = ["Présentation", '', 'Description'] as const

export function mediaHasVideo(media: ProductCreateFormState['media']): boolean {
  return media.some((m) => m.type === 'video')
}

export function canAddMedia(media: ProductCreateFormState['media']): boolean {
  return media.length < 10
}

export function canAddVideo(media: ProductCreateFormState['media']): boolean {
  return !mediaHasVideo(media)
}
