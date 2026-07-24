import type { OrderEventRecord } from '@ibee/supabase'
import type {
  BoutiqueOrderEventView,
  BoutiqueOrderView,
  OrderFulfillmentStatus,
} from '@/lib/boutique-order-view'

export type { BoutiqueOrderEventView }

const FULFILLMENT_EVENT_LABELS: Record<OrderFulfillmentStatus, string | null> = {
  pending: 'Commande à traiter',
  to_ship: 'Prête à expédier',
  ready: 'Colis prêt',
  shipped: 'Commande expédiée',
  delivered: 'Commande livrée',
  returned: 'Retour enregistré',
  not_applicable: null,
}

function mapDbEvent(event: OrderEventRecord): BoutiqueOrderEventView {
  return {
    id: event.id,
    title: event.title,
    detail: event.detail,
    at: event.created_at,
    synthetic: false,
  }
}

function buildSyntheticEvents(order: BoutiqueOrderView): BoutiqueOrderEventView[] {
  const events: BoutiqueOrderEventView[] = []

  events.push({
    id: `synthetic:created:${order.id}`,
    title: 'Commande créée',
    detail: null,
    at: order.date,
    synthetic: true,
  })

  if (order.paidAt) {
    events.push({
      id: `synthetic:paid:${order.id}`,
      title: 'Paiement confirmé',
      detail: null,
      at: order.paidAt,
      synthetic: true,
    })
  }

  if (order.cancelledAt) {
    events.push({
      id: `synthetic:cancelled:${order.id}`,
      title: 'Commande annulée',
      detail: null,
      at: order.cancelledAt,
      synthetic: true,
    })
  }

  if (order.refundedAt) {
    events.push({
      id: `synthetic:refunded:${order.id}`,
      title: 'Commande remboursée',
      detail: null,
      at: order.refundedAt,
      synthetic: true,
    })
  }

  const fulfillmentLabel = FULFILLMENT_EVENT_LABELS[order.fulfillmentStatus]
  if (fulfillmentLabel && order.paymentStatus === 'paid' && order.fulfillmentStatus !== 'pending') {
    events.push({
      id: `synthetic:fulfillment:${order.id}:${order.fulfillmentStatus}`,
      title: fulfillmentLabel,
      detail: order.trackingNumber ? `Suivi : ${order.trackingNumber}` : null,
      at: order.updatedAt,
      synthetic: true,
    })
  }

  return events
}

export function buildOrderTimeline(
  order: BoutiqueOrderView,
  dbEvents: OrderEventRecord[],
): BoutiqueOrderEventView[] {
  const synthetic = buildSyntheticEvents(order)
  const logged = dbEvents.map(mapDbEvent)
  const merged = [...synthetic, ...logged]

  merged.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  const seen = new Set<string>()
  return merged.filter((event) => {
    const key = `${event.title}:${event.at}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
