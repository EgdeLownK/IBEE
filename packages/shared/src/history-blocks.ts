/** Blocs du menu Histoire (texte + image), alignés sur le widget Bannière pour les visuels. */

const AR_MIN = 1
const AR_MAX = 16 / 9

export type HistoryImageItem = {
  url: string
  aspect_ratio: number
}

export type HistoryImageBlock = {
  type: 'image'
  slot_count?: 1 | 2 | 3
  images?: HistoryImageItem[]
  /** Optionnel — référencement uniquement, non affiché. */
  title?: string
  /** Optionnel — référencement uniquement, non affiché. */
  description?: string
}

export type HistoryListBlock = {
  type: 'list'
  items: string[]
}

export type HistoryBlock =
  | { type: 'text'; content: string }
  | HistoryImageBlock
  | HistoryListBlock

export const HISTORY_MAX_BLOCKS = 20
export const HISTORY_TEXT_MAX = 2000
export const HISTORY_MAX_IMAGES = 3

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function clampAspect(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : AR_MAX
  return Math.min(AR_MAX, Math.max(AR_MIN, n))
}

function normalizeImages(images: HistoryImageItem[], slotCount: number): HistoryImageItem[] {
  if (slotCount <= 1) {
    return images.map((img) => ({ url: img.url, aspect_ratio: clampAspect(img.aspect_ratio) }))
  }
  return images.map((img) => ({ url: img.url, aspect_ratio: 1 }))
}

function parseImageItems(raw: unknown): HistoryImageItem[] {
  if (!Array.isArray(raw)) return []
  const images: HistoryImageItem[] = []
  for (const item of raw.slice(0, HISTORY_MAX_IMAGES)) {
    if (!isRecord(item)) continue
    const url = typeof item.url === 'string' ? item.url.trim() : ''
    if (!url) continue
    images.push({ url, aspect_ratio: clampAspect(item.aspect_ratio) })
  }
  return images
}

function resolveSlotCount(raw: HistoryImageItem[], explicit: unknown): 1 | 2 | 3 {
  if (explicit === 2 || explicit === 3 || explicit === 1) return explicit
  if (raw.length >= 3) return 3
  if (raw.length === 2) return 2
  return 1
}

export function parseHistoryBlocks(raw: unknown): HistoryBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: HistoryBlock[] = []
  for (const item of raw.slice(0, HISTORY_MAX_BLOCKS)) {
    if (!isRecord(item) || typeof item.type !== 'string') continue
    if (item.type === 'text') {
      const content = typeof item.content === 'string' ? item.content.trim() : ''
      if (content) blocks.push({ type: 'text', content })
    } else if (item.type === 'list') {
      if (Array.isArray(item.items)) {
        const items = item.items.filter(i => typeof i === 'string').map(i => i.trim()).filter(i => i.length > 0)
        if (items.length > 0) blocks.push({ type: 'list', items })
      }
    } else if (item.type === 'image') {
      const parsedImages = parseImageItems(item.images)
      const legacyUrl = typeof item.url === 'string' ? item.url.trim() : ''
      let images = parsedImages
      let slot_count: 1 | 2 | 3 = 1

      if (images.length > 0) {
        slot_count = resolveSlotCount(images, item.slot_count)
        images = images.slice(0, slot_count)
      } else if (legacyUrl) {
        images = [{ url: legacyUrl, aspect_ratio: clampAspect(item.aspect_ratio) }]
        slot_count = 1
      } else {
        continue
      }

      const title = typeof item.title === 'string' ? item.title.trim() : undefined
      const legacyAlt = typeof item.alt === 'string' ? item.alt.trim() : undefined
      const description = typeof item.description === 'string' ? item.description.trim() : undefined

      blocks.push({
        type: 'image',
        slot_count,
        images: normalizeImages(images, slot_count),
        title: title || legacyAlt || undefined,
        description: description || undefined,
      })
    }
  }
  return blocks
}

export function historyBlocksHaveContent(blocks: HistoryBlock[]): boolean {
  return blocks.some((b) => {
    if (b.type === 'text') return b.content.trim().length > 0
    if (b.type === 'list') return b.items.some(i => i.trim().length > 0)
    return (b.images ?? []).some((img) => !!img.url)
  })
}

export function serializeHistoryBlocks(blocks: HistoryBlock[]): HistoryBlock[] {
  return parseHistoryBlocks(blocks)
}
