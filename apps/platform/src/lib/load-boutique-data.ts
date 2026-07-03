import 'server-only'

import { listOrderEventsByOrderIds, listOrdersByEntity } from '@ibee/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import { buildOrderTimeline } from '@/lib/boutique-order-timeline'
import {
  buildTodaySnapshot,
  mapOrderToView,
  STOCK_ALERT_THRESHOLD,
  type BoutiqueDashboardData,
  type BoutiqueProductLine,
  type BoutiqueStockLine,
} from '@/lib/boutique-order-view'
import { isMissingColumnError } from '@/lib/postgres-errors'

type Client = SupabaseClient<Database>

type StockProductRow = {
  id: string
  title: string
  type: 'physical' | 'digital'
  category: string | null
  physical_stock_quantity: number | null
  physical_stock_unlimited: boolean | null
  digital_stock_quantity: number | null
  digital_stock_unlimited: boolean | null
  entity_product_categories: { name: string } | { name: string }[] | null
  product_media: Array<{ url: string; media_type: string; display_order: number }> | null
  product_variants: Array<{
    id: string
    stock_quantity: number
    is_active: boolean
    attributes: unknown
  }> | null
}

function stockCategoryName(product: StockProductRow): string | null {
  const joined = product.entity_product_categories
  if (Array.isArray(joined)) {
    return joined[0]?.name?.trim() || product.category?.trim() || null
  }
  if (joined && typeof joined === 'object' && 'name' in joined) {
    return joined.name?.trim() || product.category?.trim() || null
  }
  return product.category?.trim() || null
}

function stockProductImageUrl(product: StockProductRow): string | null {
  const media = [...(product.product_media ?? [])].sort(
    (a, b) => a.display_order - b.display_order
  )
  const cover = media.find((item) => item.media_type === 'image') ?? media[0]
  return cover?.url ?? null
}

function stockSoldKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? ''}`
}

function stockTotalQty(current: number, sold: number): number {
  return Math.max(current + sold, current, 1)
}

function isMissingTableError(error: unknown, table: string): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error ? String(error.message) : ''
  return message.includes(table) && (message.includes('does not exist') || message.includes('schema cache'))
}

async function loadStockSoldQuantities(
  client: Client,
  entityId: string,
  productIds: string[]
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map()

  const { data, error } = await client
    .from('order_lines')
    .select('product_id, variant_id, quantity, orders!inner(status, entity_id)')
    .eq('orders.entity_id', entityId)
    .eq('orders.status', 'paid')
    .in('product_id', productIds)

  if (error) {
    if (isMissingTableError(error, 'order_lines')) return new Map()
    throw error
  }

  const sold = new Map<string, number>()
  for (const line of data ?? []) {
    if (!line.product_id) continue
    const key = stockSoldKey(line.product_id, line.variant_id)
    sold.set(key, (sold.get(key) ?? 0) + line.quantity)
  }
  return sold
}

const STOCK_CATEGORY =
  'category, entity_product_categories(name)'

const STOCK_MEDIA = 'product_media(url, media_type, display_order)'

const STOCK_SELECT_WITH_DIGITAL = `id, title, type, ${STOCK_CATEGORY}, physical_stock_quantity, physical_stock_unlimited, digital_stock_quantity, digital_stock_unlimited, ${STOCK_MEDIA}, product_variants(id, stock_quantity, is_active, attributes)`

const STOCK_SELECT_LEGACY = `id, title, type, ${STOCK_CATEGORY}, physical_stock_quantity, physical_stock_unlimited, ${STOCK_MEDIA}, product_variants(id, stock_quantity, is_active, attributes)`

function pushPhysicalStockLines(
  product: StockProductRow,
  items: BoutiqueStockLine[],
  soldByKey: Map<string, number>
) {
  const categoryName = stockCategoryName(product)
  const imageUrl = stockProductImageUrl(product)
  const variants = (product.product_variants ?? []).filter((variant) => variant.is_active)

  if (variants.length > 0) {
    for (const variant of variants) {
      const attrs = variant.attributes as Record<string, string> | null
      const suffix = attrs ? ` (${Object.values(attrs).join(' / ')})` : ''
      const qty = variant.stock_quantity
      const sold = soldByKey.get(stockSoldKey(product.id, variant.id)) ?? 0
      items.push({
        key: `${product.id}-${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        name: `${product.title}${suffix}`,
        categoryName,
        productType: 'physical',
        qty,
        totalQty: stockTotalQty(qty, sold),
        unlimited: false,
        isLow: qty <= STOCK_ALERT_THRESHOLD,
        imageUrl,
      })
    }
    return
  }

  if (product.physical_stock_unlimited) {
    items.push({
      key: product.id,
      productId: product.id,
      variantId: null,
      name: product.title,
      categoryName,
      productType: 'physical',
      qty: null,
      totalQty: null,
      unlimited: true,
      isLow: false,
      imageUrl,
    })
    return
  }

  const qty = product.physical_stock_quantity ?? 0
  const sold = soldByKey.get(stockSoldKey(product.id, null)) ?? 0
  items.push({
    key: product.id,
    productId: product.id,
    variantId: null,
    name: product.title,
    categoryName,
    productType: 'physical',
    qty,
    totalQty: stockTotalQty(qty, sold),
    unlimited: false,
    isLow: qty <= STOCK_ALERT_THRESHOLD,
    imageUrl,
  })
}

function pushDigitalStockLine(
  product: StockProductRow,
  items: BoutiqueStockLine[],
  soldByKey: Map<string, number>
) {
  const categoryName = stockCategoryName(product)
  const imageUrl = stockProductImageUrl(product)

  if (product.digital_stock_unlimited !== false) {
    items.push({
      key: product.id,
      productId: product.id,
      variantId: null,
      name: product.title,
      categoryName,
      productType: 'digital',
      qty: null,
      totalQty: null,
      unlimited: true,
      isLow: false,
      imageUrl,
    })
    return
  }

  const qty = product.digital_stock_quantity ?? 0
  const sold = soldByKey.get(stockSoldKey(product.id, null)) ?? 0
  items.push({
    key: product.id,
    productId: product.id,
    variantId: null,
    name: product.title,
    categoryName,
    productType: 'digital',
    qty,
    totalQty: stockTotalQty(qty, sold),
    unlimited: false,
    isLow: qty <= STOCK_ALERT_THRESHOLD,
    imageUrl,
  })
}

async function loadStockInventory(client: Client, entityId: string): Promise<BoutiqueStockLine[]> {
  function stockQuery(select: string) {
    return client
      .from('products')
      .select(select)
      .eq('entity_id', entityId)
      .eq('status', 'published')
      .in('type', ['physical', 'digital'])
      .order('title')
      .limit(200)
  }

  let { data: products, error } = await stockQuery(STOCK_SELECT_WITH_DIGITAL)

  if (error && isMissingColumnError(error, 'digital_stock')) {
    const legacy = await stockQuery(STOCK_SELECT_LEGACY)
    products = legacy.data
    error = legacy.error
  }

  if (error) throw error

  const productRows = (products ?? []) as unknown as StockProductRow[]
  const soldByKey = await loadStockSoldQuantities(
    client,
    entityId,
    productRows.map((product) => product.id)
  )

  const items: BoutiqueStockLine[] = []

  for (const product of productRows) {
    if (product.type === 'digital') {
      pushDigitalStockLine(product, items, soldByKey)
      continue
    }
    pushPhysicalStockLines(product, items, soldByKey)
  }

  return items.sort((a, b) => {
    if (a.isLow !== b.isLow) return a.isLow ? -1 : 1
    if (a.unlimited !== b.unlimited) return a.unlimited ? 1 : -1
    return (a.qty ?? Number.MAX_SAFE_INTEGER) - (b.qty ?? Number.MAX_SAFE_INTEGER)
  })
}

async function loadProductCatalog(
  client: Client,
  entityId: string
): Promise<BoutiqueProductLine[]> {
  const [{ data: products, error: productsError }, { data: lines, error: linesError }] =
    await Promise.all([
      client
        .from('products')
        .select(
          'id, title, slug, type, price_cents, currency, product_media(url, media_type, display_order)'
        )
        .eq('entity_id', entityId)
        .eq('status', 'published')
        .in('type', ['physical', 'digital'])
        .order('title')
        .limit(200),
      client
        .from('order_lines')
        .select('product_id, quantity, line_total_cents, orders!inner(status, entity_id)')
        .eq('orders.entity_id', entityId)
        .eq('orders.status', 'paid'),
    ])

  if (productsError) throw productsError
  if (linesError && !isMissingTableError(linesError, 'order_lines')) throw linesError

  const stats = new Map<string, { salesCount: number; revenueCents: number }>()
  for (const line of lines ?? []) {
    if (!line.product_id) continue
    const current = stats.get(line.product_id) ?? { salesCount: 0, revenueCents: 0 }
    stats.set(line.product_id, {
      salesCount: current.salesCount + line.quantity,
      revenueCents: current.revenueCents + line.line_total_cents,
    })
  }

  return (products ?? []).map((product) => {
    const productStats = stats.get(product.id)
    const media = [...(product.product_media ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    )
    const cover =
      media.find((item) => item.media_type === 'image') ?? media[0] ?? null

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      type: product.type as 'physical' | 'digital',
      imageUrl: cover?.url ?? null,
      priceCents: product.price_cents,
      currency: product.currency,
      salesCount: productStats?.salesCount ?? 0,
      revenueCents: productStats?.revenueCents ?? 0,
    }
  })
}

export async function loadBoutiqueDashboardData(
  client: Client,
  entityId: string
): Promise<BoutiqueDashboardData> {
  try {
    const [ordersRaw, stockItems, products] = await Promise.all([
      listOrdersByEntity(client, entityId, { limit: 200 }),
      loadStockInventory(client, entityId),
      loadProductCatalog(client, entityId),
    ])

    const orderIds = ordersRaw.map((order) => order.id)
    let eventsByOrder = new Map<string, Awaited<ReturnType<typeof listOrderEventsByOrderIds>>>()

    try {
      const events = await listOrderEventsByOrderIds(client, orderIds)
      eventsByOrder = events.reduce((map, event) => {
        const bucket = map.get(event.order_id) ?? []
        bucket.push(event)
        map.set(event.order_id, bucket)
        return map
      }, new Map<string, typeof events>())
    } catch (error) {
      if (!isMissingTableError(error, 'order_events')) throw error
    }

    const imageByProductId = new Map(
      products.map((product) => [product.id, product.imageUrl] as const)
    )

    const orders = ordersRaw.map((order) => {
      const base = mapOrderToView(order)
      const productId = order.order_lines?.[0]?.product_id ?? null
      const imageUrl = productId ? (imageByProductId.get(productId) ?? null) : null
      const dbEvents = eventsByOrder.get(order.id) ?? []
      return {
        ...base,
        imageUrl,
        events: buildOrderTimeline(base, dbEvents),
      }
    })

    return {
      orders,
      stockItems,
      products,
      today: buildTodaySnapshot(orders),
    }
  } catch (error) {
    if (isMissingTableError(error, 'orders')) {
      return {
        orders: [],
        stockItems: [],
        products: [],
        today: { toTreatCount: 0, shippedTodayCount: 0, revenueTodayCents: 0 },
      }
    }
    throw error
  }
}
