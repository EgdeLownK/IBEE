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

export type SubVariantDraft = {
  id: string
  key: string
  value: string
  price: string
  stock: string
  sku: string
  condition?: string
}

export type VariantDraft = {
  id: string
  pairs: VariantPair[]
  sku: string
  price: string
  stock: string
  condition?: string
  error?: string
  subVariants?: SubVariantDraft[]
}

export type DetailPair = { label: string; value: string }

export type ContentBlockDraft =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string; previewUrl: string; uploading: boolean }

export type FaqDraft = { question: string; answer: string }

export type ProductCategoryOption = { id: string; name: string }

export type ProductCreateFormState = {
  step: 0 | 1 | 2 | 3 | 4
  type: ProductType | null
  media: MediaDraft[]
  title: string
  descriptionShort: string
  bullets: string[]
  price: string
  promoEnabled: boolean
  salePrice: string
  saleEndsAt: string
  categoryId: string
  newCategoryName: string
  pickupEnabled: boolean
  deliveryEnabled: boolean
  physicalPickupLocation: string
  physicalStockQuantity: string
  physicalCondition: PhysicalCondition
  digitalStockUnlimited: boolean
  variantOptions: { name: string; values: string[] }[]
  variants: VariantDraft[]
  digitalFileId: string | null
  digitalFile: EntityFileDto | null
  digitalFileUploading: boolean
  entityFiles: EntityFileDto[]
  customDetails: DetailPair[]
  contentBlocks: ContentBlockDraft[]
  faq: FaqDraft[]
  publish: boolean
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
