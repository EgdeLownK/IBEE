import type { ServiceLocationType } from '@ibee/ui-server'
import type { ContentBlockItem, GalleryImageItem } from '../entity-create/shared'

export type CreatedPlaylistService = {
  id: string
  title: string
  slug: string
  detailExcerpt: string
  reviewCount: number
  reviewAverage: number
  duration_minutes: number
  location_type: string
  price_cents: number | null
  promo_price_cents: number | null
  currency: string
  image_url: string | null
}

export type ServiceCreateFormState = {
  step: 1 | 2 | 3
  title: string
  description: string
  durationMinutes: string
  locationType: ServiceLocationType
  locationDetails: string
  price: string
  promoEnabled: boolean
  promoPrice: string
  autoAcceptBookings: boolean
  minNoticeHours: string
  maxAdvanceDays: string
  bufferBeforeMinutes: string
  bufferAfterMinutes: string
  highlights: string[]
  galleryImages: GalleryImageItem[]
  contentBlocks: ContentBlockItem[]
  faq: { question: string; answer: string }[]
  isActive: boolean
  fieldErrors: Record<string, string>
  globalError: string
}
