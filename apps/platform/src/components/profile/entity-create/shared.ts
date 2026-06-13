let uid = 0

export function nextId(prefix = 'id') {
  uid += 1
  return `${prefix}${uid}`
}

export function truncateExcerpt(text: string, max = 150): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}...`
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
