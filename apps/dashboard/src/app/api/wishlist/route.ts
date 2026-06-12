import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toggleWishlist } from '@ibee/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Vous devez être connecté pour utiliser la wishlist.' },
      { status: 401 }
    )
  }

  let body: { productId?: string; variantId?: string | null; priceCents?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { productId, variantId, priceCents } = body

  if (!productId || typeof priceCents !== 'number' || priceCents < 0) {
    return NextResponse.json(
      { error: 'Champs requis manquants (productId, priceCents).' },
      { status: 400 }
    )
  }

  try {
    const { added } = await toggleWishlist(supabase, {
      user_id: user.id,
      product_id: productId,
      variant_id: variantId ?? null,
      price_cents_at_add: Math.round(priceCents),
    })

    return NextResponse.json({ in_wishlist: added })
  } catch (err) {
    console.error('[api/wishlist] POST', err)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la wishlist.' }, { status: 500 })
  }
}
