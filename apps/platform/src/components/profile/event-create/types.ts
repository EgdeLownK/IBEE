import type { EventLocationType } from '@ibee/shared'
import type { ContentBlockItem, GalleryImageItem } from '../entity-create/shared'

export type CreatedPlaylistEvent = {
  id: string
  title: string
  slug: string
  detailExcerpt: string
  start_at: string
  price_cents: number | null
  currency: string
  location_type: EventLocationType
  location_details: string | null
  capacity: number | null
  registrations_count: number
  image_url: string | null
}

export type EventCreateFormState = {
  step: 1 | 2
  title: string
  description: string
  startAt: string
  endAt: string
  locationType: EventLocationType
  locationDetails: string
  price: string
  capacity: string
  highlights: string[]
  galleryImages: GalleryImageItem[]
  contentBlocks: ContentBlockItem[]
  faq: { question: string; answer: string }[]
  isPublished: boolean
  fieldErrors: Record<string, string>
  globalError: string
}
