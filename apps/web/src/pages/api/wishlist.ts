import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { toggleWishlist } from '@ibee/supabase'

/**
 * POST /api/wishlist — toggle d'un produit (et variante optionnelle) dans la
 * wishlist du visiteur connecté. Pattern follow.ts : auth requise, client
 * authentifié (RLS user_id = auth.uid()), réponse JSON.
 *
 * Body : { productId, variantId?, priceCents } — priceCents est le snapshot du
 * prix courant côté client (variant.price_cents_override ?? product.price_cents),
 * stocké dans price_cents_at_add pour la détection ultérieure de baisse de prix.
 *
 * Pas de purge cache : la wishlist est strictement per-user, rien de public ne
 * change. (cache.ts ne fournit pas de purgeProductCache de toute façon.)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Vous devez être connecté pour utiliser la wishlist.' }),
      { status: 401 }
    )
  }

  let body: { productId?: string; variantId?: string | null; priceCents?: number }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 })
  }

  const { productId, variantId, priceCents } = body

  if (!productId || typeof priceCents !== 'number' || priceCents < 0) {
    return new Response(
      JSON.stringify({ error: 'Champs requis manquants (productId, priceCents).' }),
      { status: 400 }
    )
  }

  try {
    const { added } = await toggleWishlist(authClient, {
      user_id: user.id,
      product_id: productId,
      variant_id: variantId ?? null,
      price_cents_at_add: Math.round(priceCents),
    })

    return new Response(JSON.stringify({ in_wishlist: added }))
  } catch (err) {
    console.error('[api/wishlist] POST', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour de la wishlist.' }), { status: 500 })
  }
}
