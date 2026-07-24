import { NextResponse } from 'next/server'
import {
  attachStripeSessionToOrder,
  createCheckoutOrder,
  getPublishedProductBySlug,
  resolveUnitPriceCents,
  trackEvent,
} from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getWebBaseUrl } from '@/lib/stripe'

type CheckoutBody = {
  entitySlug?: string
  productSlug?: string
  variantId?: string | null
  quantity?: number
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Le paiement en ligne n’est pas encore configuré.' },
        { status: 503 },
      )
    }

    const body = (await request.json()) as CheckoutBody
    const entitySlug = body.entitySlug?.trim()
    const productSlug = body.productSlug?.trim()
    const quantity = Number.isInteger(body.quantity) && body.quantity! > 0 ? body.quantity! : 1

    if (!entitySlug || !productSlug) {
      return NextResponse.json({ error: 'Produit invalide.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const product = await getPublishedProductBySlug(supabase, entitySlug, productSlug)
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
    }

    const variants = product.product_variants ?? []
    let variantId = body.variantId ?? null

    if (variants.length > 0) {
      if (!variantId) {
        return NextResponse.json(
          { error: 'Choisissez une variante avant d’acheter.' },
          { status: 400 },
        )
      }
      const variant = variants.find((v) => v.id === variantId)
      if (!variant) {
        return NextResponse.json({ error: 'Variante invalide.' }, { status: 400 })
      }
    } else {
      variantId = null
    }

    const selectedVariant = variantId ? (variants.find((v) => v.id === variantId) ?? null) : null

    const unitPriceCents = resolveUnitPriceCents(product, selectedVariant)

    const orderId = await createCheckoutOrder(supabase, {
      entityId: product.entity_id,
      productId: product.id,
      variantId,
      quantity,
      buyerUserId: user?.id ?? null,
    })

    const baseUrl = getWebBaseUrl()
    const productPath = `/${entitySlug}/shop/${productSlug}`
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity,
          price_data: {
            currency: (product.currency ?? 'EUR').toLowerCase(),
            unit_amount: unitPriceCents,
            product_data: {
              name: product.title,
              description: product.description_short ?? undefined,
            },
          },
        },
      ],
      metadata: {
        order_id: orderId,
        entity_id: product.entity_id,
        product_id: product.id,
      },
      success_url: `${baseUrl}${productPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${productPath}?checkout=cancelled`,
      customer_email: user?.email ?? undefined,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Impossible de démarrer le paiement.' }, { status: 500 })
    }

    await attachStripeSessionToOrder(supabase, orderId, session.id)

    await trackEvent(supabase, {
      entity_id: product.entity_id,
      event_type: 'checkout_started',
      resource_id: product.id,
      metadata: { order_id: orderId, variant_id: variantId, quantity },
    })

    return NextResponse.json({ url: session.url, orderId })
  } catch (err: unknown) {
    console.error('[api/checkout/create-session]', err)
    const message = err instanceof Error ? err.message : 'Erreur lors du checkout'
    const isStock = typeof message === 'string' && message.includes('stock_insufficient')
    return NextResponse.json(
      { error: isStock ? 'Stock insuffisant pour ce produit.' : 'Erreur lors du checkout.' },
      { status: isStock ? 409 : 400 },
    )
  }
}
