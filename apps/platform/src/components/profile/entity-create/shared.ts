import { CARD_DETAIL_EXCERPT_MAX, truncateText } from '@/lib/entity-detail-excerpt'

let uid = 0

export function nextId(prefix = 'id') {
  uid += 1
  return `${prefix}${uid}`
}

export function truncateExcerpt(text: string, max = CARD_DETAIL_EXCERPT_MAX): string {
  return truncateText(text, max)
}

export type GalleryImageItem = {
  id: string
  url: string
  previewUrl: string
  uploading: boolean
}

export type ContentBlockItem =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'image'; url: string; previewUrl: string; uploading: boolean }

export type PresentationFields = {
  highlights: string[]
  galleryImages: GalleryImageItem[]
  contentBlocks: ContentBlockItem[]
  faq: { question: string; answer: string }[]
  fieldErrors: Record<string, string>
}
