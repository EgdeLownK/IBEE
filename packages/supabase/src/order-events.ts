import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>
type OrderEventRow = Database['public']['Tables']['order_events']['Row']
type OrderEventType = Database['public']['Enums']['order_event_type']

export type OrderEventRecord = OrderEventRow

export type InsertOrderEventInput = {
  orderId: string
  entityId: string
  eventType: OrderEventType
  title: string
  detail?: string | null
  metadata?: Record<string, unknown>
  actorUserId?: string | null
}

export async function insertOrderEvent(client: Client, input: InsertOrderEventInput) {
  const { data, error } = await client
    .from('order_events')
    .insert({
      order_id: input.orderId,
      entity_id: input.entityId,
      event_type: input.eventType,
      title: input.title,
      detail: input.detail ?? null,
      metadata: (input.metadata ?? {}) as Database['public']['Tables']['order_events']['Insert']['metadata'],
      actor_user_id: input.actorUserId ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as OrderEventRow
}

export async function listOrderEventsByOrderIds(
  client: Client,
  orderIds: string[]
): Promise<OrderEventRow[]> {
  if (orderIds.length === 0) return []

  const { data, error } = await client
    .from('order_events')
    .select('*')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as OrderEventRow[]
}
