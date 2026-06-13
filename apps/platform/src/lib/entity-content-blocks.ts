export type DetailContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt?: string }

type RawBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'list'; items: string[] }

export function parseFaqItems(faq: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(faq)) return []
  return faq.flatMap((f): { question: string; answer: string }[] => {
    if (!f || typeof f !== 'object') return []
    const item = f as Record<string, unknown>
    if (typeof item.question === 'string' && typeof item.answer === 'string') {
      return [{ question: item.question, answer: item.answer }]
    }
    return []
  })
}

export function parseDetailContentBlocks(entity: {
  content_blocks?: unknown
  description?: string | null
}): DetailContentBlock[] {
  let blocks: RawBlock[] = []

  if (Array.isArray(entity.content_blocks) && entity.content_blocks.length > 0) {
    blocks = entity.content_blocks.filter(
      (b): b is RawBlock => !!b && typeof b === 'object' && typeof (b as RawBlock).type === 'string'
    ) as RawBlock[]
  } else if (entity.description) {
    try {
      const parsed = JSON.parse(entity.description)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type) {
        blocks = parsed
      } else {
        blocks = [{ type: 'text', content: entity.description }]
      }
    } catch {
      blocks = [{ type: 'text', content: entity.description }]
    }
  }

  return blocks.flatMap((b): DetailContentBlock[] => {
    if (b.type === 'text' && b.content) return [{ type: 'text', content: b.content }]
    if (b.type === 'image' && b.url) return [{ type: 'image', url: b.url, alt: b.alt }]
    if (b.type === 'list' && Array.isArray(b.items) && b.items.length > 0) {
      return [{ type: 'text', content: b.items.map((item) => `• ${item}`).join('\n') }]
    }
    return []
  })
}

export function descriptionFromBlocks(blocks: DetailContentBlock[], fallback: string): string {
  const text = blocks
    .filter((b): b is { type: 'text'; content: string } => b.type === 'text')
    .map((b) => b.content)
    .join(' ')
  if (!text) return fallback
  return text.slice(0, 160) + (text.length > 160 ? '...' : '')
}

export function parseBulletPoints(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
}

export function parseCustomDetails(raw: unknown): { label: string; value: string; family: string | null }[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((d): { label: string; value: string; family: string | null }[] => {
    if (!d || typeof d !== 'object') return []
    const item = d as Record<string, unknown>
    if (typeof item.label === 'string' && typeof item.value === 'string') {
      return [{ label: item.label, value: item.value, family: typeof item.family === 'string' ? item.family : null }]
    }
    return []
  })
}
