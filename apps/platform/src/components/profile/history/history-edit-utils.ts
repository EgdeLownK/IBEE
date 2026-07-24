import type { HistoryBlock, HistoryImageItem } from '@ibee/shared'
import {
  BANNER_ASPECT_MAX,
  clampBannerAspectRatio,
  HISTORY_MAX_BLOCKS,
  HISTORY_TEXT_MAX,
} from '@ibee/shared'

export type DraftTextBlock = {
  id: string
  type: 'text'
  content: string
}

export type DraftListBlockItem = {
  id: string
  value: string
}

export type DraftListBlock = {
  id: string
  type: 'list'
  items: DraftListBlockItem[]
}

export type DraftImageBlock = {
  id: string
  type: 'image'
  slot_count: 1 | 2 | 3
  images: (HistoryImageItem | null)[]
  title: string
  description: string
  uploading: boolean
}

export type DraftBlock = DraftTextBlock | DraftImageBlock | DraftListBlock

let blockUid = 0
export function nextBlockId() {
  blockUid += 1
  return `hb${blockUid}`
}

export function blockSlotCount(block: DraftImageBlock): 1 | 2 | 3 {
  return block.slot_count === 2 || block.slot_count === 3 ? block.slot_count : 1
}

export function blockCropMode(block: DraftImageBlock): 'landscape' | 'square' {
  return blockSlotCount(block) === 1 ? 'landscape' : 'square'
}

export function clampBlockAspect(ratio: number) {
  return clampBannerAspectRatio(ratio)
}

export function countFilledBlockImages(block: DraftImageBlock) {
  const slots = blockSlotCount(block)
  let count = 0
  for (let i = 0; i < slots; i++) {
    if (block.images[i]?.url) count++
  }
  return count
}

export function getBlockImageSaveError(block: DraftImageBlock): string | null {
  const slots = blockSlotCount(block)
  if (slots <= 1) return null
  const filled = countFilledBlockImages(block)
  if (filled === slots) return null
  if (slots === 2) return 'Le format 2 images requiert 2 images.'
  return 'Le format 3 images requiert 3 images.'
}

export function blockImagesPayload(block: DraftImageBlock): HistoryImageItem[] {
  const slots = blockSlotCount(block)
  const payload: HistoryImageItem[] = []
  for (let i = 0; i < slots; i++) {
    const img = block.images[i]
    if (img?.url) {
      payload.push({
        url: img.url,
        aspect_ratio: slots === 1 ? clampBlockAspect(img.aspect_ratio) : 1,
      })
    }
  }
  return payload
}

export function draftBlocksFromInitial(blocks: HistoryBlock[]): DraftBlock[] {
  return blocks.map((item) => {
    if (item.type === 'text') {
      return { id: nextBlockId(), type: 'text', content: item.content }
    }
    if (item.type === 'list') {
      return {
        id: nextBlockId(),
        type: 'list',
        items: item.items.map((value) => ({ id: nextBlockId(), value })),
      }
    }
    const slot_count =
      item.slot_count === 2 || item.slot_count === 3
        ? item.slot_count
        : item.images?.length === 2
          ? 2
          : item.images?.length === 3
            ? 3
            : 1
    const images: (HistoryImageItem | null)[] = []
    const src = item.images ?? []
    for (let i = 0; i < slot_count; i++) {
      images[i] = src[i] ? { ...src[i]! } : null
    }
    return {
      id: nextBlockId(),
      type: 'image',
      slot_count,
      images,
      title: item.title ?? '',
      description: item.description ?? '',
      uploading: false,
    }
  })
}

export function serializeDraftBlocks(blocks: DraftBlock[]): HistoryBlock[] {
  const payload: HistoryBlock[] = []
  for (const b of blocks) {
    if (b.type === 'text') {
      const text = b.content.trim()
      if (!text) continue
      if (text.length > HISTORY_TEXT_MAX) {
        throw new Error(`Chaque bloc texte doit faire entre 1 et ${HISTORY_TEXT_MAX} caractères.`)
      }
      payload.push({ type: 'text', content: text })
    } else if (b.type === 'list') {
      const items = b.items.map((i) => i.value.trim()).filter((i) => i.length > 0)
      if (items.length === 0) continue
      for (const item of items) {
        if (item.length > HISTORY_TEXT_MAX) {
          throw new Error(
            `Chaque élément de liste doit faire entre 1 et ${HISTORY_TEXT_MAX} caractères.`,
          )
        }
      }
      payload.push({ type: 'list', items })
    } else {
      const err = getBlockImageSaveError(b)
      if (err) throw new Error(err)
      const imgs = blockImagesPayload(b)
      if (!imgs.length) continue
      const item: HistoryBlock = {
        type: 'image',
        slot_count: blockSlotCount(b),
        images: imgs,
      }
      const title = b.title.trim()
      const description = b.description.trim()
      if (title) item.title = title
      if (description) item.description = description
      payload.push(item)
    }
  }
  if (payload.length > HISTORY_MAX_BLOCKS) {
    throw new Error(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
  }
  return payload
}
