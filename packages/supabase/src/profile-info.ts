import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type HistoryImageItem = {
  url: string
  aspect_ratio: number
}

export type HistoryBlock =
  | { type: 'text'; content: string }
  | {
      type: 'image'
      slot_count?: 1 | 2 | 3
      images?: HistoryImageItem[]
      title?: string
      description?: string
    }

const HISTORY_MAX_BLOCKS = 20
const AR_MIN = 1
const AR_MAX = 16 / 9

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

function parseHistoryBlocksRaw(raw: unknown): HistoryBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: HistoryBlock[] = []
  for (const item of raw.slice(0, HISTORY_MAX_BLOCKS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    if (row.type === 'text') {
      const content = typeof row.content === 'string' ? row.content.trim() : ''
      if (content) blocks.push({ type: 'text', content })
    } else if (row.type === 'image') {
      const imagesRaw = Array.isArray(row.images) ? row.images : []
      const parsed: HistoryImageItem[] = []
      for (const img of imagesRaw.slice(0, 3)) {
        if (!img || typeof img !== 'object' || Array.isArray(img)) continue
        const entry = img as Record<string, unknown>
        const url = typeof entry.url === 'string' ? entry.url.trim() : ''
        if (!url) continue
        parsed.push({ url, aspect_ratio: clampAspect(entry.aspect_ratio) })
      }

      const legacyUrl = typeof row.url === 'string' ? row.url.trim() : ''
      let images = parsed
      let slot_count: 1 | 2 | 3 = 1

      if (images.length > 0) {
        const explicit = row.slot_count
        slot_count =
          explicit === 2 || explicit === 3 || explicit === 1
            ? explicit
            : images.length >= 3
              ? 3
              : images.length === 2
                ? 2
                : 1
        images = images.slice(0, slot_count)
      } else if (legacyUrl) {
        images = [{ url: legacyUrl, aspect_ratio: clampAspect(row.aspect_ratio) }]
        slot_count = 1
      } else {
        continue
      }

      const title = typeof row.title === 'string' ? row.title.trim() : undefined
      const legacyAlt = typeof row.alt === 'string' ? row.alt.trim() : undefined
      const description = typeof row.description === 'string' ? row.description.trim() : undefined

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

export type OpeningHourSlot = {
  day_of_week: number
  closed: boolean
  start_time: string | null
  end_time: string | null
}

export type EntityContactInfo = {
  entity_id: string
  contact_email: string | null
  contact_email_public: boolean
  contact_phone: string | null
  contact_phone_public: boolean
  message_enabled: boolean
  opening_hours_enabled: boolean
  opening_hours: OpeningHourSlot[]
}

export async function getEntityHistory(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<HistoryBlock[]> {
  const { data, error } = await client
    .from('entity_history')
    .select('content, blocks')
    .eq('entity_id', entityId)
    .maybeSingle()

  if (error) throw error

  const fromBlocks = parseHistoryBlocksRaw(data?.blocks)
  if (fromBlocks.length > 0) return fromBlocks

  const legacy = data?.content?.trim()
  if (legacy) return [{ type: 'text', content: legacy }]
  return []
}

export async function upsertEntityHistory(
  client: SupabaseClient<Database>,
  entityId: string,
  blocks: HistoryBlock[]
) {
  const normalized = parseHistoryBlocksRaw(blocks)
  const legacyText = normalized
    .filter((b): b is Extract<HistoryBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.content)
    .join('\n\n')

  const { error } = await client
    .from('entity_history')
    .upsert(
      {
        entity_id: entityId,
        blocks: normalized as never,
        content: legacyText,
      },
      { onConflict: 'entity_id' }
    )

  if (error) throw error
}

export async function getEntityContactInfo(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<EntityContactInfo | null> {
  const { data, error } = await client
    .from('entity_contact_info')
    .select('*')
    .eq('entity_id', entityId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const hours = Array.isArray(data.opening_hours)
    ? (data.opening_hours as OpeningHourSlot[])
    : []

  return {
    entity_id: data.entity_id,
    contact_email: data.contact_email,
    contact_email_public: data.contact_email_public,
    contact_phone: data.contact_phone ?? null,
    contact_phone_public: data.contact_phone_public ?? true,
    message_enabled: data.message_enabled,
    opening_hours_enabled: data.opening_hours_enabled ?? false,
    opening_hours: hours,
  }
}

export async function upsertEntityContactInfo(
  client: SupabaseClient<Database>,
  entityId: string,
  payload: {
    contact_email?: string | null
    contact_email_public?: boolean
    contact_phone?: string | null
    contact_phone_public?: boolean
    message_enabled?: boolean
    opening_hours_enabled?: boolean
    opening_hours?: OpeningHourSlot[]
  }
) {
  const { data: existing, error: fetchError } = await client
    .from('entity_contact_info')
    .select('entity_id')
    .eq('entity_id', entityId)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    const { error } = await client
      .from('entity_contact_info')
      .update(payload)
      .eq('entity_id', entityId)
    if (error) throw error
    return
  }

  const { error } = await client.from('entity_contact_info').insert({
    entity_id: entityId,
    opening_hours: payload.opening_hours ?? [],
    ...payload,
  })

  if (error) throw error
}

export type EntityFaqItemInput = { question: string; answer: string }

export async function upsertEntityFaq(
  client: SupabaseClient<Database>,
  entityId: string,
  items: EntityFaqItemInput[]
) {
  const hasItems = items.length > 0

  const { error: featureError } = await client
    .from('entity_global_features')
    .upsert(
      {
        entity_id: entityId,
        type: 'faq',
        is_active: hasItems,
        is_configured: hasItems,
      },
      { onConflict: 'entity_id,type' }
    )

  if (featureError) throw featureError

  const { error: deleteError } = await client
    .from('entity_faq_items')
    .delete()
    .eq('entity_id', entityId)

  if (deleteError) throw deleteError

  if (!hasItems) return

  const rows = items.map((item, position) => ({
    entity_id: entityId,
    question: item.question,
    answer: item.answer,
    position,
  }))

  const { error: insertError } = await client.from('entity_faq_items').insert(rows)
  if (insertError) throw insertError
}

/** Horaires par défaut : lun–ven 9h–18h, sam–dim fermé. */
export function defaultOpeningHours(): OpeningHourSlot[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    day_of_week: day,
    closed: day === 0 || day === 6,
    start_time: day === 0 || day === 6 ? null : '09:00',
    end_time: day === 0 || day === 6 ? null : '18:00',
  }))
}
