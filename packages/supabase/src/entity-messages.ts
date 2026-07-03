import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type EntityMessage = {
  id: string
  entity_id: string
  sender_user_id: string | null
  sender_name: string
  sender_email: string
  body: string
  created_at: string
  direction: 'inbound' | 'outbound'
  thread_key: string
}

export type MessageThread = {
  threadKey: string
  contactName: string
  contactEmail: string
  lastMessageAt: string
  lastPreview: string
  isClient: boolean
  messages: EntityMessage[]
}

function normalizeThreadKey(email: string): string {
  return email.trim().toLowerCase()
}

export function mapRow(row: Database['public']['Tables']['entity_messages']['Row']): EntityMessage {
  return {
    id: row.id,
    entity_id: row.entity_id,
    sender_user_id: row.sender_user_id,
    sender_name: row.sender_name,
    sender_email: row.sender_email,
    body: row.body,
    created_at: row.created_at,
    direction: (row.direction as 'inbound' | 'outbound') ?? 'inbound',
    thread_key: row.thread_key ?? normalizeThreadKey(row.sender_email),
  }
}

export async function createEntityMessage(
  client: SupabaseClient<Database>,
  payload: {
    entity_id: string
    sender_user_id?: string | null
    sender_name: string
    sender_email: string
    body: string
  }
): Promise<EntityMessage> {
  const threadKey = normalizeThreadKey(payload.sender_email)
  const { data, error } = await client
    .from('entity_messages')
    .insert({
      entity_id: payload.entity_id,
      sender_user_id: payload.sender_user_id ?? null,
      sender_name: payload.sender_name.trim(),
      sender_email: payload.sender_email.trim(),
      body: payload.body.trim(),
      direction: 'inbound',
      thread_key: threadKey,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapRow(data)
}

export async function listEntityMessages(
  client: SupabaseClient<Database>,
  entityId: string,
  limit = 500
): Promise<EntityMessage[]> {
  const { data, error } = await client
    .from('entity_messages')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function createOwnerMessageReply(
  client: SupabaseClient<Database>,
  payload: {
    entity_id: string
    owner_user_id: string
    owner_name: string
    owner_email: string
    thread_key: string
    body: string
  }
): Promise<EntityMessage> {
  const { data, error } = await client
    .from('entity_messages')
    .insert({
      entity_id: payload.entity_id,
      sender_user_id: payload.owner_user_id,
      sender_name: payload.owner_name.trim(),
      sender_email: payload.owner_email.trim(),
      body: payload.body.trim(),
      direction: 'outbound',
      thread_key: normalizeThreadKey(payload.thread_key),
    })
    .select('*')
    .single()

  if (error) throw error
  return mapRow(data)
}

export function groupMessagesIntoThreads(
  messages: EntityMessage[],
  clientEmails: Set<string>
): MessageThread[] {
  const byThread = new Map<string, EntityMessage[]>()

  for (const message of messages) {
    const key = message.thread_key
    const bucket = byThread.get(key) ?? []
    bucket.push(message)
    byThread.set(key, bucket)
  }

  const threads: MessageThread[] = []

  for (const [threadKey, threadMessages] of byThread) {
    const sorted = [...threadMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const inbound = sorted.filter((m) => m.direction === 'inbound')
    const contactName = inbound[0]?.sender_name ?? sorted[0]?.sender_name ?? 'Contact'
    const contactEmail = threadKey
    const last = sorted[sorted.length - 1]

    threads.push({
      threadKey,
      contactName,
      contactEmail,
      lastMessageAt: last.created_at,
      lastPreview: last.body,
      isClient: clientEmails.has(contactEmail),
      messages: sorted,
    })
  }

  return threads.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}
