'use server'

import { revalidatePath } from 'next/cache'
import { getOrderById, insertOrderEvent, updateOrderFulfillment } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import { requireDashboardContext } from '@/lib/dashboard-context'
import { isMissingColumnError } from '@/lib/postgres-errors'

type FulfillmentStatus = Database['public']['Enums']['order_fulfillment_status']

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  not_applicable: 'Sans livraison',
  pending: 'À traiter',
  to_ship: 'À expédier',
  ready: 'Prête à expédier',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  returned: 'Retournée',
}

export async function addOrderCommentAction(orderId: string, comment: string) {
  const trimmed = comment.trim()
  if (!trimmed) {
    return { ok: false as const, error: 'Le commentaire est vide.' }
  }

  const ctx = await requireDashboardContext()

  try {
    const order = await getOrderById(ctx.supabase, orderId)
    if (!order || order.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Commande introuvable.' }
    }

    await insertOrderEvent(ctx.supabase, {
      orderId: order.id,
      entityId: order.entity_id,
      eventType: 'note_updated',
      title: 'Commentaire',
      detail: trimmed,
      actorUserId: ctx.user.id,
    })

    revalidatePath('/dashboard/activite/boutique')
    return { ok: true as const }
  } catch (err) {
    console.error('[addOrderCommentAction]', err)
    return { ok: false as const, error: 'Impossible d’ajouter le commentaire.' }
  }
}

export async function sendOrderInvoiceAction(orderId: string) {
  const ctx = await requireDashboardContext()

  try {
    const order = await getOrderById(ctx.supabase, orderId)
    if (!order || order.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Commande introuvable.' }
    }

    if (!order.buyer_email) {
      return { ok: false as const, error: 'Aucun email client pour envoyer la facture.' }
    }

    await insertOrderEvent(ctx.supabase, {
      orderId: order.id,
      entityId: order.entity_id,
      eventType: 'note_updated',
      title: 'Facture envoyée',
      detail: order.buyer_email,
      actorUserId: ctx.user.id,
    })

    revalidatePath('/dashboard/activite/boutique')
    return { ok: true as const, email: order.buyer_email }
  } catch (err) {
    console.error('[sendOrderInvoiceAction]', err)
    return { ok: false as const, error: 'Impossible d’envoyer la facture.' }
  }
}

export async function updateBoutiqueOrderAction(input: {
  orderId: string
  fulfillmentStatus?: FulfillmentStatus
  trackingNumber?: string | null
  trackingCarrier?: string | null
  notes?: string | null
}) {
  const ctx = await requireDashboardContext()

  try {
    const before = await getOrderById(ctx.supabase, input.orderId)
    if (!before || before.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Commande introuvable.' }
    }

    const updated = await updateOrderFulfillment(ctx.supabase, input.orderId, {
      fulfillmentStatus: input.fulfillmentStatus,
      trackingNumber: input.trackingNumber,
      trackingCarrier: input.trackingCarrier,
      notes: input.notes,
    })

    if (!updated) {
      return { ok: false as const, error: 'Commande introuvable.' }
    }

    if (
      input.fulfillmentStatus !== undefined &&
      input.fulfillmentStatus !== before.fulfillment_status
    ) {
      await insertOrderEvent(ctx.supabase, {
        orderId: before.id,
        entityId: before.entity_id,
        eventType: 'fulfillment_changed',
        title: `Statut : ${FULFILLMENT_LABELS[input.fulfillmentStatus]}`,
        detail: null,
        metadata: {
          from: before.fulfillment_status,
          to: input.fulfillmentStatus,
        },
        actorUserId: ctx.user.id,
      })
    }

    if (
      input.trackingNumber !== undefined &&
      input.trackingNumber !== before.tracking_number &&
      input.trackingNumber
    ) {
      await insertOrderEvent(ctx.supabase, {
        orderId: before.id,
        entityId: before.entity_id,
        eventType: 'tracking_updated',
        title: 'Numéro de suivi ajouté',
        detail: input.trackingNumber,
        actorUserId: ctx.user.id,
      })
    }

    if (input.notes !== undefined && input.notes !== before.notes && input.notes) {
      await insertOrderEvent(ctx.supabase, {
        orderId: before.id,
        entityId: before.entity_id,
        eventType: 'note_updated',
        title: 'Commentaire',
        detail: input.notes,
        actorUserId: ctx.user.id,
      })
    }

    revalidatePath('/dashboard/activite/boutique')
    return { ok: true as const }
  } catch (err) {
    console.error('[updateBoutiqueOrderAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer la commande.' }
  }
}

export async function confirmOrderLabelsPrintedAction(orderIds: string[]) {
  const ctx = await requireDashboardContext()
  const uniqueIds = [...new Set(orderIds)].filter(Boolean)
  if (uniqueIds.length === 0) {
    return { ok: false as const, error: 'Aucune commande sélectionnée.' }
  }

  try {
    let confirmed = 0

    for (const orderId of uniqueIds) {
      const order = await getOrderById(ctx.supabase, orderId)
      if (!order || order.entity_id !== ctx.entity.id) continue

      await insertOrderEvent(ctx.supabase, {
        orderId: order.id,
        entityId: order.entity_id,
        eventType: 'label_printed',
        title: 'Étiquette imprimée',
        detail: null,
        actorUserId: ctx.user.id,
      })

      const canMarkReady =
        order.status === 'paid' &&
        (order.fulfillment_status === 'pending' || order.fulfillment_status === 'to_ship')

      if (canMarkReady) {
        await updateOrderFulfillment(ctx.supabase, order.id, {
          fulfillmentStatus: 'ready',
        })

        await insertOrderEvent(ctx.supabase, {
          orderId: order.id,
          entityId: order.entity_id,
          eventType: 'fulfillment_changed',
          title: `Statut : ${FULFILLMENT_LABELS.ready}`,
          detail: null,
          metadata: {
            from: order.fulfillment_status,
            to: 'ready',
          },
          actorUserId: ctx.user.id,
        })
      }

      confirmed += 1
    }

    if (confirmed === 0) {
      return { ok: false as const, error: 'Aucune commande n’a pu être mise à jour.' }
    }

    revalidatePath('/dashboard/activite/boutique')
    return { ok: true as const, confirmed }
  } catch (err) {
    console.error('[confirmOrderLabelsPrintedAction]', err)
    return { ok: false as const, error: 'Impossible d’enregistrer l’impression.' }
  }
}

export async function markOrderShippedAction(orderId: string, trackingNumber?: string | null) {
  return updateBoutiqueOrderAction({
    orderId,
    fulfillmentStatus: 'shipped',
    trackingNumber,
  })
}

export async function markOrderDeliveredAction(orderId: string) {
  return updateBoutiqueOrderAction({
    orderId,
    fulfillmentStatus: 'delivered',
  })
}

export async function updateBoutiqueStockAction(input: {
  productId: string
  variantId?: string | null
  quantity: number
}) {
  const ctx = await requireDashboardContext()

  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    return { ok: false as const, error: 'Quantité invalide.' }
  }

  try {
    let product:
      | {
          id: string
          entity_id: string
          type: 'physical' | 'digital'
          digital_stock_unlimited?: boolean
        }
      | null = null
    let productError: unknown = null

    const primary = await ctx.supabase
      .from('products')
      .select('id, entity_id, type, digital_stock_unlimited')
      .eq('id', input.productId)
      .maybeSingle()

    product = primary.data
    productError = primary.error

    if (productError && isMissingColumnError(productError, 'digital_stock')) {
      const fallback = await ctx.supabase
        .from('products')
        .select('id, entity_id, type')
        .eq('id', input.productId)
        .maybeSingle()
      product = fallback.data
      productError = fallback.error
    }

    if (productError) throw productError
    if (!product || product.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Produit introuvable.' }
    }

    if (product.type === 'digital') {
      if (product.digital_stock_unlimited !== false) {
        return { ok: false as const, error: 'Ce produit digital est en ventes illimitées.' }
      }

      const { error } = await ctx.supabase
        .from('products')
        .update({ digital_stock_quantity: input.quantity })
        .eq('id', input.productId)

      if (error) throw error

      revalidatePath('/dashboard/activite/boutique')
      return { ok: true as const }
    }

    if (product.type !== 'physical') {
      return { ok: false as const, error: 'Type de produit non pris en charge.' }
    }

    if (input.variantId) {
      const { data: variant, error: variantError } = await ctx.supabase
        .from('product_variants')
        .select('id, product_id')
        .eq('id', input.variantId)
        .maybeSingle()

      if (variantError) throw variantError
      if (!variant || variant.product_id !== input.productId) {
        return { ok: false as const, error: 'Variante introuvable.' }
      }

      const { error } = await ctx.supabase
        .from('product_variants')
        .update({ stock_quantity: input.quantity })
        .eq('id', input.variantId)

      if (error) throw error
    } else {
      const { error } = await ctx.supabase
        .from('products')
        .update({ physical_stock_quantity: input.quantity })
        .eq('id', input.productId)

      if (error) throw error
    }

    revalidatePath('/dashboard/activite/boutique')
    return { ok: true as const }
  } catch (err) {
    console.error('[updateBoutiqueStockAction]', err)
    return { ok: false as const, error: 'Impossible de mettre à jour le stock.' }
  }
}

export async function resendDigitalLinkAction(orderId: string) {
  const ctx = await requireDashboardContext()

  try {
    const order = await getOrderById(ctx.supabase, orderId)
    if (!order || order.entity_id !== ctx.entity.id) {
      return { ok: false as const, error: 'Commande introuvable.' }
    }

    const line = order.order_lines?.[0]
    if (line?.product_type !== 'digital') {
      return { ok: false as const, error: 'Cette commande n’est pas un produit digital.' }
    }

    if (!order.buyer_email) {
      return { ok: false as const, error: 'Aucun email client pour renvoyer le lien.' }
    }

    await insertOrderEvent(ctx.supabase, {
      orderId: order.id,
      entityId: order.entity_id,
      eventType: 'note_updated',
      title: 'Lien digital renvoyé',
      detail: order.buyer_email,
      actorUserId: ctx.user.id,
    })

    revalidatePath('/dashboard/activite/boutique')
    return { ok: true as const, email: order.buyer_email }
  } catch (err) {
    console.error('[resendDigitalLinkAction]', err)
    return { ok: false as const, error: 'Impossible de renvoyer le lien.' }
  }
}
