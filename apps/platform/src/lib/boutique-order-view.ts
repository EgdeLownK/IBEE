import { formatOrderRef, type OrderWithLines } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'

export const STOCK_ALERT_THRESHOLD = 10

export type OrderPaymentStatus = Database['public']['Enums']['order_status']
export type OrderFulfillmentStatus = Database['public']['Enums']['order_fulfillment_status']

export type BoutiqueDisplayStatus =
  | 'en_attente_paiement'
  | 'a_traiter'
  | 'a_expedier'
  | 'prete'
  | 'expediee'
  | 'livree'
  | 'annulee'
  | 'remboursee'
  | 'en_essai'
  | 'retour_demande'

export type BoutiqueOrderFilter = 'all' | 'to-treat' | 'ready' | 'shipping' | 'trial' | 'returns'

export type BoutiqueProductTypeFilter = 'all' | 'physical' | 'digital'

export type BoutiqueProductLine = {
  id: string
  title: string
  slug: string
  type: 'physical' | 'digital'
  physicalCondition: string | null
  imageUrl: string | null
  priceCents: number
  currency: string
  salesCount: number
  revenueCents: number
}

export type BoutiqueDigitalProductLine = {
  id: string
  title: string
  slug: string
  priceCents: number
  currency: string
  format: string | null
  salesCount: number
  revenueCents: number
}

export type BoutiqueOrderEventView = {
  id: string
  title: string
  detail: string | null
  at: string
  synthetic: boolean
}

export type BoutiqueOrderItem = {
  name: string
  qty: number
  priceCents: number
}

export type BoutiqueOrderView = {
  id: string
  ref: string
  customer: string
  email: string | null
  date: string
  paidAt: string | null
  updatedAt: string
  cancelledAt: string | null
  refundedAt: string | null
  paymentStatus: OrderPaymentStatus
  fulfillmentStatus: OrderFulfillmentStatus
  displayStatus: BoutiqueDisplayStatus
  items: BoutiqueOrderItem[]
  itemCount: number
  totalCents: number
  currency: string
  shippingAddress: string | null
  trackingNumber: string | null
  notes: string | null
  productHint: string | null
  productType: 'physical' | 'digital' | null
  physicalCondition: string | null
  imageUrl: string | null
  needsAction: boolean
  isTrialPeriod: boolean
  isReturnRequest: boolean
  urgency: number
  events: BoutiqueOrderEventView[]
}

export type BoutiqueStockLine = {
  key: string
  productId: string
  variantId: string | null
  name: string
  categoryName: string | null
  productType: 'physical' | 'digital'
  qty: number | null
  totalQty: number | null
  unlimited: boolean
  isLow: boolean
  imageUrl: string | null
}

export function computeStockBarMax(qty: number): number {
  const baseline = Math.max(STOCK_ALERT_THRESHOLD, 10)
  if (qty <= baseline) return baseline
  if (qty <= 30) return Math.ceil(qty / 5) * 5
  if (qty <= 100) return Math.ceil(qty / 10) * 10
  return Math.ceil(qty / 25) * 25
}

export type BoutiqueTodaySnapshot = {
  toTreatCount: number
  shippedTodayCount: number
  revenueTodayCents: number
}

export type BoutiqueDashboardData = {
  orders: BoutiqueOrderView[]
  stockItems: BoutiqueStockLine[]
  products: BoutiqueProductLine[]
  today: BoutiqueTodaySnapshot
}

export function countLowStockItems(items: BoutiqueStockLine[]): number {
  return items.filter((item) => item.isLow).length
}

export type BoutiqueShopActivityItem = {
  id: string
  orderId: string
  orderRef: string
  customer: string
  title: string
  detail: string | null
  at: string
}

const SHOP_ACTIVITY_LIMIT = 20

export function buildShopRecentActivity(
  orders: BoutiqueOrderView[],
  limit = SHOP_ACTIVITY_LIMIT,
): BoutiqueShopActivityItem[] {
  const items: BoutiqueShopActivityItem[] = []

  for (const order of orders) {
    for (const event of order.events) {
      items.push({
        id: `${order.id}:${event.id}`,
        orderId: order.id,
        orderRef: order.ref,
        customer: order.customer,
        title: event.title,
        detail: event.detail,
        at: event.at,
      })
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
}

export function formatBoutiqueMoney(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

export function formatBoutiqueRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `il y a ${diffHours} h`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatShippingAddress(
  raw: Database['public']['Tables']['orders']['Row']['shipping_address'],
): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const addr = raw as Record<string, string>
  const parts = [addr.line1, addr.line2, addr.postal_code, addr.city, addr.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function resolveTrialAndReturn(
  notes: string | null,
  fulfillmentStatus: OrderFulfillmentStatus,
  paymentStatus: OrderPaymentStatus,
): { isTrialPeriod: boolean; isReturnRequest: boolean } {
  const normalized = notes?.toLowerCase() ?? ''
  const isTrialPeriod = normalized.includes('essai') || normalized.includes('trial')
  const isReturnRequest =
    fulfillmentStatus === 'returned' ||
    normalized.includes('retour') ||
    normalized.includes('return') ||
    paymentStatus === 'partially_refunded'
  return { isTrialPeriod, isReturnRequest }
}

function resolveDisplayStatus(
  paymentStatus: OrderPaymentStatus,
  fulfillmentStatus: OrderFulfillmentStatus,
  flags: { isTrialPeriod: boolean; isReturnRequest: boolean },
): BoutiqueDisplayStatus {
  if (flags.isReturnRequest && paymentStatus !== 'refunded' && paymentStatus !== 'cancelled') {
    return 'retour_demande'
  }
  if (paymentStatus === 'cancelled') return 'annulee'
  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') return 'remboursee'
  if (paymentStatus === 'pending' || paymentStatus === 'failed') return 'en_attente_paiement'
  if (
    flags.isTrialPeriod &&
    fulfillmentStatus !== 'delivered' &&
    fulfillmentStatus !== 'not_applicable'
  ) {
    return 'en_essai'
  }

  switch (fulfillmentStatus) {
    case 'pending':
      return 'a_traiter'
    case 'to_ship':
      return 'a_expedier'
    case 'ready':
      return 'prete'
    case 'shipped':
      return 'expediee'
    case 'delivered':
    case 'not_applicable':
      return 'livree'
    default:
      return 'a_traiter'
  }
}

function resolveUrgency(displayStatus: BoutiqueDisplayStatus): number {
  switch (displayStatus) {
    case 'a_traiter':
      return 0
    case 'a_expedier':
      return 1
    case 'prete':
      return 2
    case 'en_attente_paiement':
      return 3
    case 'en_essai':
      return 3
    case 'retour_demande':
      return 2
    case 'expediee':
      return 4
    case 'livree':
      return 5
    default:
      return 6
  }
}

export function mapOrderToView(
  order: OrderWithLines,
  events: BoutiqueOrderEventView[] = [],
  physicalCondition: string | null = null,
): BoutiqueOrderView {
  const lines = order.order_lines ?? []
  const items: BoutiqueOrderItem[] = lines.map((line) => ({
    name: line.title_snapshot,
    qty: line.quantity,
    priceCents: line.unit_price_cents,
  }))
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const { isTrialPeriod, isReturnRequest } = resolveTrialAndReturn(
    order.notes,
    order.fulfillment_status,
    order.status,
  )
  const displayStatus = resolveDisplayStatus(order.status, order.fulfillment_status, {
    isTrialPeriod,
    isReturnRequest,
  })
  const needsAction =
    order.status === 'paid' &&
    (order.fulfillment_status === 'pending' ||
      order.fulfillment_status === 'to_ship' ||
      order.fulfillment_status === 'ready')

  const firstLine = lines[0]
  const productType = firstLine?.product_type
  const shippingFromDb = formatShippingAddress(order.shipping_address)
  const shippingAddress =
    shippingFromDb ?? (productType === 'digital' ? 'Produit numérique — livraison par email' : null)

  return {
    id: order.id,
    ref: formatOrderRef(order.order_number),
    customer: order.buyer_name?.trim() || order.buyer_email?.trim() || 'Client',
    email: order.buyer_email,
    date: order.created_at,
    paidAt: order.paid_at,
    updatedAt: order.updated_at,
    cancelledAt: order.cancelled_at,
    refundedAt: order.refunded_at,
    paymentStatus: order.status,
    fulfillmentStatus: order.fulfillment_status,
    displayStatus,
    items,
    itemCount,
    totalCents: order.total_cents,
    currency: order.currency,
    shippingAddress,
    trackingNumber: order.tracking_number,
    notes: order.notes,
    productHint: firstLine?.title_snapshot ?? null,
    productType: firstLine?.product_type ?? null,
    physicalCondition,
    imageUrl: null,
    needsAction,
    isTrialPeriod,
    isReturnRequest,
    urgency: resolveUrgency(displayStatus),
    events,
  }
}

export function isToday(iso: string | null): boolean {
  if (!iso) return false
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function buildTodaySnapshot(orders: BoutiqueOrderView[]): BoutiqueTodaySnapshot {
  const paidToday = orders.filter((o) => o.paymentStatus === 'paid' && isToday(o.paidAt))
  return {
    toTreatCount: orders.filter((o) => o.needsAction).length,
    shippedTodayCount: paidToday.filter(
      (o) => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'delivered',
    ).length,
    revenueTodayCents: paidToday.reduce((sum, o) => sum + o.totalCents, 0),
  }
}

export type BoutiqueKpiSnapshot = {
  toTreatCount: number
  shippedTodayCount: number
  inTransitCount: number
  pendingPaymentCount: number
}

export function buildBoutiqueKpis(orders: BoutiqueOrderView[]): BoutiqueKpiSnapshot {
  const paidToday = orders.filter((o) => o.paymentStatus === 'paid' && isToday(o.paidAt))

  return {
    toTreatCount: orders.filter((o) => o.needsAction).length,
    shippedTodayCount: paidToday.filter(
      (o) => o.fulfillmentStatus === 'shipped' || o.fulfillmentStatus === 'delivered',
    ).length,
    inTransitCount: orders.filter((o) => o.displayStatus === 'expediee').length,
    pendingPaymentCount: orders.filter((o) => o.displayStatus === 'en_attente_paiement').length,
  }
}

export function sortInboxOrders(orders: BoutiqueOrderView[]): BoutiqueOrderView[] {
  return [...orders]
    .filter((o) => o.needsAction)
    .sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency - b.urgency
      const aTime = new Date(a.paidAt ?? a.date).getTime()
      const bTime = new Date(b.paidAt ?? b.date).getTime()
      return aTime - bTime
    })
}

export type BoutiqueInboxFilter = BoutiqueOrderFilter

/** @deprecated Utiliser BoutiqueOrderFilter */
export type BoutiqueSignalFilter = BoutiqueOrderFilter

export const BOUTIQUE_ORDER_FILTERS: ReadonlyArray<{
  id: BoutiqueOrderFilter
  label: string
}> = [
  { id: 'to-treat', label: 'À traiter' },
  { id: 'ready', label: 'Prêt' },
  { id: 'shipping', label: 'Transit' },
  { id: 'trial', label: 'Livré' },
  { id: 'returns', label: 'Retours' },
  { id: 'all', label: 'Tout' },
]

export const BOUTIQUE_PRODUCT_TYPE_FILTERS: ReadonlyArray<{
  id: BoutiqueProductTypeFilter
  label: string
}> = [
  { id: 'all', label: 'Tous types' },
  { id: 'physical', label: 'Physique' },
  { id: 'digital', label: 'Digital' },
]

export function matchesBoutiqueProductTypeFilter(
  order: BoutiqueOrderView,
  filter: BoutiqueProductTypeFilter,
): boolean {
  if (filter === 'all') return true
  return order.productType === filter
}

export function countBoutiqueOrdersByProductType(
  orders: BoutiqueOrderView[],
  productType: Exclude<BoutiqueProductTypeFilter, 'all'>,
): number {
  return orders.filter((order) => order.productType === productType).length
}

export function sortOrdersByArrival(orders: BoutiqueOrderView[]): BoutiqueOrderView[] {
  return [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function matchesBoutiqueOrderFilter(
  order: BoutiqueOrderView,
  filter: BoutiqueOrderFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'to-treat':
      return order.displayStatus === 'a_traiter'
    case 'ready':
      return order.displayStatus === 'prete' || order.displayStatus === 'a_expedier'
    case 'shipping':
      return order.displayStatus === 'expediee'
    case 'trial':
      return order.displayStatus === 'livree'
    case 'returns':
      return order.isReturnRequest || order.displayStatus === 'retour_demande'
    default:
      return true
  }
}

export function searchBoutiqueOrders(
  orders: BoutiqueOrderView[],
  query: string,
): BoutiqueOrderView[] {
  const q = query.trim().toLowerCase()
  if (!q) return orders

  return orders.filter((order) => {
    const haystack = [
      order.ref,
      order.customer,
      order.email ?? '',
      order.productHint ?? '',
      order.trackingNumber ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function filterBoutiqueOrders(
  orders: BoutiqueOrderView[],
  filter: BoutiqueOrderFilter,
  searchQuery = '',
  productTypeFilter: BoutiqueProductTypeFilter = 'all',
): BoutiqueOrderView[] {
  const searched = searchBoutiqueOrders(orders, searchQuery)
  const filtered = searched.filter(
    (order) =>
      matchesBoutiqueOrderFilter(order, filter) &&
      matchesBoutiqueProductTypeFilter(order, productTypeFilter),
  )
  return sortOrdersByArrival(filtered)
}

export function countBoutiqueOrdersByFilter(
  orders: BoutiqueOrderView[],
  filter: BoutiqueOrderFilter,
): number {
  return orders.filter((order) => matchesBoutiqueOrderFilter(order, filter)).length
}

export type BoutiqueOrderGroupId = 'a_traiter' | 'en_cours' | 'termine_recent'

export type BoutiqueOrderGroup = {
  id: BoutiqueOrderGroupId
  label: string
  orders: BoutiqueOrderView[]
}

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function isRecent(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() <= RECENT_DAYS_MS
}

export function classifyInboxOrder(order: BoutiqueOrderView): BoutiqueOrderGroupId | null {
  if (order.needsAction) return 'a_traiter'
  if (
    order.displayStatus === 'expediee' ||
    order.displayStatus === 'en_attente_paiement' ||
    order.displayStatus === 'prete'
  ) {
    return 'en_cours'
  }
  if (
    (order.displayStatus === 'livree' ||
      order.displayStatus === 'remboursee' ||
      order.displayStatus === 'annulee') &&
    isRecent(order.paidAt ?? order.date)
  ) {
    return 'termine_recent'
  }
  return null
}

export function filterInboxOrders(
  orders: BoutiqueOrderView[],
  filter: BoutiqueInboxFilter,
): BoutiqueOrderView[] {
  return filterBoutiqueOrders(orders, filter)
}

export function groupInboxOrders(
  orders: BoutiqueOrderView[],
  filter: BoutiqueInboxFilter,
): BoutiqueOrderGroup[] {
  const visible = filterInboxOrders(orders, filter)
  const groups: BoutiqueOrderGroup[] = [
    { id: 'a_traiter', label: 'À traiter', orders: [] },
    { id: 'en_cours', label: 'En cours', orders: [] },
    { id: 'termine_recent', label: 'Terminé récemment', orders: [] },
  ]

  for (const order of visible) {
    const groupId = classifyInboxOrder(order)
    if (!groupId) continue
    const bucket = groups.find((g) => g.id === groupId)
    if (bucket) bucket.orders.push(order)
  }

  for (const group of groups) {
    group.orders.sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency - b.urgency
      return new Date(b.paidAt ?? b.date).getTime() - new Date(a.paidAt ?? a.date).getTime()
    })
  }

  return groups.filter((g) => g.orders.length > 0)
}

export function countPhysicalToShip(orders: BoutiqueOrderView[]): number {
  return orders.filter(
    (o) =>
      o.needsAction &&
      o.productType === 'physical' &&
      (o.fulfillmentStatus === 'pending' ||
        o.fulfillmentStatus === 'to_ship' ||
        o.fulfillmentStatus === 'ready'),
  ).length
}

export function countDigitalToDeliver(orders: BoutiqueOrderView[]): number {
  return orders.filter((o) => o.needsAction && o.productType === 'digital').length
}

export type BoutiqueToTreatSummaryLine = {
  orderId: string
  customer: string
  itemCount: number
  items: ReadonlyArray<{ name: string; qty: number }>
}

export type BoutiqueToTreatSummary = {
  totalArticles: number
  cartonCount: number
  cartonLabel: string
  lines: BoutiqueToTreatSummaryLine[]
}

/** Récap détaillé pour le filtre « À traiter » uniquement. */
export function buildBoutiqueToTreatSummary(orders: BoutiqueOrderView[]): BoutiqueToTreatSummary {
  const cartonCount = orders.length
  const hasPhysical = orders.some((order) => order.productType === 'physical')
  const cartonLabel =
    cartonCount > 1
      ? hasPhysical || cartonCount === 0
        ? 'cartons'
        : 'clients'
      : hasPhysical || cartonCount === 0
        ? 'carton'
        : 'client'

  return {
    totalArticles: orders.reduce((sum, order) => sum + order.itemCount, 0),
    cartonCount,
    cartonLabel,
    lines: orders.map((order) => ({
      orderId: order.id,
      customer: order.customer,
      itemCount: order.itemCount,
      items: order.items.map((item) => ({ name: item.name, qty: item.qty })),
    })),
  }
}
