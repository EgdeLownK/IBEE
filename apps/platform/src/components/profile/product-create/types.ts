import type { EntityFileDto } from '@/lib/entity-file-server'
import type { ProductCreateDraft, PhysicalCondition } from '@ibee/shared'

export type ProductType = 'physical' | 'digital'

export type MediaDraft = {
  id: string
  type: 'image' | 'video'
  url: string
  previewUrl: string
  uploading: boolean
}

export type VariantPair = { key: string; value: string }



export type VariantDraft = {
  id: string
  pairs: VariantPair[]
  sku: string
  price: string
  stock: string
  condition?: string
  error?: string
  promoEnabled?: boolean
  salePrice?: string
  saleEndsAt?: string
}

export type DetailPair = { label: string; value: string }

export type ContentBlockDraft =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'title'; content: string }
  | { id: string; type: 'list'; items: string[]; description?: string }
  | { 
      id: string
      type: 'image'
      slot_count: 1 | 2 | 3
      images: ({ url: string; aspect_ratio: number; type: 'image' | 'video' } | null)[]
      title?: string
      description?: string
      uploading: boolean 
    }

export type FaqDraft = { question: string; answer: string }

export type ProductCategoryOption = { id: string; name: string }

export type ProductCreateFormState = {
  step: 0 | 1 | 2 | 3 | 4
  type: ProductType | null
  audience: 'men' | 'women' | 'unisex' | null
  media: MediaDraft[]
  title: string
  descriptionShort: string
  bullets: string[]
  sku: string
  price: string
  promoEnabled: boolean
  salePrice: string
  saleEndsAt: string
  categoryId: string
  newCategoryName: string
  pickupEnabled: boolean
  inPersonEnabled: boolean
  deliveryEnabled: boolean
  physicalPickupLocation: string
  physicalStockQuantity: string
  physicalCondition: PhysicalCondition
  digitalStockUnlimited: boolean
  variationMode: 'unique' | 'variants'
  variantOptions: { name: string; values: string[] }[]
  variants: VariantDraft[]
  digitalFileId: string | null
  digitalFile: EntityFileDto | null
  digitalFileUploading: boolean
  entityFiles: EntityFileDto[]
  customDetails: { category: string; items: { label: string; value: string }[] }[]
  contentBlocks: ContentBlockDraft[]
  faq: FaqDraft[]
  publishMode: 'publish' | 'schedule'
  scheduleDate: string
  fieldErrors: Record<string, string>
  globalError: string
}

export type CreatedShopProduct = {
  id: string
  title: string
  slug: string
  detailExcerpt: string
  reviewCount: number
  reviewAverage: number
  price_cents: number
  sale_price_cents: number | null
  sale_ends_at: string | null
  currency: string
  image_url: string | null
  status: 'published' | 'draft' | 'archived'
  category_id: string | null
  type: ProductType
  physical_stock_quantity: number | null
}
