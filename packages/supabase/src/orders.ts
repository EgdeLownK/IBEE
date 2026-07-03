import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Client = SupabaseClient<Database>
type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderLineRow = Database['public']['Tables']['order_lines']['Row']
type OrderStatus = Database['public']['Enums']['order_status']
type OrderFulfillmentStatus = Database['public']['Enums']['order_fulfillment_status']

export type OrderWithLines = OrderRow & {
  order_lines: OrderLineRow[]
}

export type ShopMetrics = {
  revenueCents: number
  orderCount: number
  avgBasketCents: number
  unitsSold: number
  topProducts: { productId: string; title: string; quantity: number; revenueCents: number }[]
}

export type CreateCheckoutOrderInput = {
  entityId: string
  productId: string
  variantId?: string | null
  quantity?: number
  buyerUserId?: string | null
}

export function isSaleActive(product: {
  sale_price_cents: number | null
  sale_ends_at: string | null
}): boolean {
  return (
    product.sale_price_cents != null &&
    (product.sale_ends_at == null || new Date(product.sale_ends_at).getTime() > Date.now())
  )
}

export function resolveUnitPriceCents(
  product: {
    price_cents: number
    sale_price_cents: number | null
    sale_ends_at: string | null
  },
  variant?: { price_cents_override: number | null } | null
): number {
  const base = isSaleActive(product) ? product.sale_price_cents! : product.price_cents
  if (variant?.price_cents_override != null) return variant.price_cents_override
  return base
}

export function formatOrderRef(orderNumber: string): string {
  return orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`
}

export async function createCheckoutOrder(
  client: Client,
  input: CreateCheckoutOrderInput
): Promise<string> {
  const { data, error } = await client.rpc('create_checkout_order', {
    p_entity_id: input.entityId,
    p_product_id: input.productId,
    p_variant_id: input.variantId ?? undefined,
    p_quantity: input.quantity ?? 1,
    p_buyer_user_id: input.buyerUserId ?? undefined,
  })

  if (error) throw error
  if (!data) throw new Error('create_checkout_order returned no order id')
  return data
}

export async function attachStripeSessionToOrder(
  client: Client,
  orderId: string,
  stripeSessionId: string
) {
  const { error } = await client.rpc('attach_stripe_session_to_order', {
    p_order_id: orderId,
    p_stripe_session_id: stripeSessionId,
  })
  if (error) throw error
}

export async function completeCheckoutOrder(
  client: Client,
  input: {
    stripeSessionId: string
    paymentIntentId?: string | null
    buyerEmail?: string | null
    buyerName?: string | null
  }
): Promise<string> {
  const { data, error } = await client.rpc('complete_checkout_order', {
    p_stripe_session_id: input.stripeSessionId,
    p_payment_intent_id: input.paymentIntentId ?? undefined,
    p_buyer_email: input.buyerEmail ?? undefined,
    p_buyer_name: input.buyerName ?? undefined,
  })

  if (error) throw error
  if (!data) throw new Error('complete_checkout_order returned no order id')
  return data
}

export async function getOrderById(client: Client, orderId: string) {
  const { data, error } = await client
    .from('orders')
    .select('*, order_lines(*)')
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  return data as OrderWithLines | null
}

export async function getOrderByStripeSessionId(client: Client, stripeSessionId: string) {
  const { data, error } = await client
    .from('orders')
    .select('*, order_lines(*)')
    .eq('stripe_checkout_session_id', stripeSessionId)
    .maybeSingle()

  if (error) throw error
  return data as OrderWithLines | null
}

export async function listOrdersByEntity(
  client: Client,
  entityId: string,
  opts: {
    status?: OrderStatus
    fulfillmentStatus?: OrderFulfillmentStatus
    from?: string
    to?: string
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 50, offset = 0 } = opts

  let query = client
    .from('orders')
    .select('*, order_lines(*)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.fulfillmentStatus) query = query.eq('fulfillment_status', opts.fulfillmentStatus)
  if (opts.from) query = query.gte('created_at', opts.from)
  if (opts.to) query = query.lte('created_at', opts.to)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as OrderWithLines[]
}

export async function updateOrderFulfillment(
  client: Client,
  orderId: string,
  patch: {
    fulfillmentStatus?: OrderFulfillmentStatus
    trackingNumber?: string | null
    trackingCarrier?: string | null
    notes?: string | null
  }
) {
  const update: Database['public']['Tables']['orders']['Update'] = {}
  if (patch.fulfillmentStatus !== undefined) {
    update.fulfillment_status = patch.fulfillmentStatus
  }
  if (patch.trackingNumber !== undefined) {
    update.tracking_number = patch.trackingNumber
  }
  if (patch.trackingCarrier !== undefined) {
    update.tracking_carrier = patch.trackingCarrier
  }
  if (patch.notes !== undefined) {
    update.notes = patch.notes
  }

  if (Object.keys(update).length === 0) return null

  const { data, error } = await client
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .maybeSingle()

  if (error) throw error
  return data as OrderRow | null
}

export async function getShopMetrics(
  client: Client,
  entityId: string,
  window: { from: string; to: string }
): Promise<ShopMetrics> {
  const { data: orders, error } = await client
    .from('orders')
    .select('id, total_cents, order_lines(product_id, title_snapshot, quantity, line_total_cents)')
    .eq('entity_id', entityId)
    .eq('status', 'paid')
    .gte('paid_at', window.from)
    .lte('paid_at', window.to)

  if (error) throw error

  const paidOrders = orders ?? []
  const revenueCents = paidOrders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0)
  const orderCount = paidOrders.length
  const avgBasketCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : 0

  const productMap = new Map<string, { title: string; quantity: number; revenueCents: number }>()
  let unitsSold = 0

  for (const order of paidOrders) {
    const lines = (order.order_lines ?? []) as {
      product_id: string
      title_snapshot: string
      quantity: number
      line_total_cents: number
    }[]

    for (const line of lines) {
      unitsSold += line.quantity
      const existing = productMap.get(line.product_id)
      if (existing) {
        existing.quantity += line.quantity
        existing.revenueCents += line.line_total_cents
      } else {
        productMap.set(line.product_id, {
          title: line.title_snapshot,
          quantity: line.quantity,
          revenueCents: line.line_total_cents,
        })
      }
    }
  }

  const topProducts = [...productMap.entries()]
    .map(([productId, stats]) => ({ productId, ...stats }))
    .sort((a, b) => b.quantity - a.quantity || b.revenueCents - a.revenueCents)
    .slice(0, 10)

  return {
    revenueCents,
    orderCount,
    avgBasketCents,
    unitsSold,
    topProducts,
  }
}
