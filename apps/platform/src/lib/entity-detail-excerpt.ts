export const CARD_DETAIL_EXCERPT_MAX = 100

export function truncateText(text: string, max: number = CARD_DETAIL_EXCERPT_MAX): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}...`
}

export function entityDetailExcerpt(entity: {
  content_blocks?: unknown
  description_long?: string | null
  description_short?: string | null
  description?: string | null
}): string {
  if (Array.isArray(entity.content_blocks)) {
    for (const raw of entity.content_blocks) {
      if (!raw || typeof raw !== 'object') continue
      const block = raw as Record<string, unknown>
      if (block.type === 'text' && typeof block.content === 'string' && block.content.trim()) {
        return truncateText(block.content)
      }
      if (block.type === 'list' && Array.isArray(block.items) && block.items.length > 0) {
        return truncateText(
          block.items.filter((item): item is string => typeof item === 'string').join(' · '),
        )
      }
    }
  }
  if (typeof entity.description_long === 'string' && entity.description_long.trim()) {
    return truncateText(entity.description_long)
  }
  if (typeof entity.description_short === 'string' && entity.description_short.trim()) {
    return truncateText(entity.description_short)
  }
  if (typeof entity.description === 'string' && entity.description.trim()) {
    const desc = entity.description.trim()
    try {
      const parsed = JSON.parse(desc)
      if (
        Array.isArray(parsed) &&
        parsed[0]?.type === 'text' &&
        typeof parsed[0].content === 'string'
      ) {
        return truncateText(parsed[0].content)
      }
    } catch {
      return truncateText(desc)
    }
  }
  return ''
}
