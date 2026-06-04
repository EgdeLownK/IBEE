import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { createReview, updateMyReview, deleteMyReview } from '@ibee/supabase'

/**
 * API avis produit — pattern comments.ts.
 * Auth requise. RLS gère l'autorisation (un avis par couple product+buyer).
 * Les avis créés ont status='pending' (défaut DB) → modération avant
 * publication. Le client affiche une confirmation "en attente", pas un reload.
 *
 * Pas de purge cache : un nouvel avis pending ne change rien de public ;
 * cache.ts ne fournit de toute façon pas de purgeProductCache.
 */

// CHECK DB : content >= 20, title <= 80, rating 1..5
function validateReview(rating: unknown, content: unknown, title: unknown): string | null {
  if (typeof rating !== 'number' || rating < 1 || rating > 5) return 'Note invalide (1 à 5).'
  if (typeof content !== 'string' || content.trim().length < 20) {
    return 'L’avis doit contenir au moins 20 caractères.'
  }
  if (content.trim().length > 5000) return 'L’avis est trop long.'
  if (title != null && typeof title === 'string' && title.length > 80) {
    return 'Le titre ne doit pas dépasser 80 caractères.'
  }
  return null
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté pour laisser un avis.' }), { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 }) }

  const { productId, rating, content, title, variantId } = body
  if (!productId) {
    return new Response(JSON.stringify({ error: 'Produit manquant.' }), { status: 400 })
  }
  const err = validateReview(rating, content, title)
  if (err) return new Response(JSON.stringify({ error: err }), { status: 400 })

  try {
    const review = await createReview(authClient, {
      product_id: productId,
      buyer_user_id: user.id,
      rating,
      content: content.trim(),
      title: title?.trim() || null,
      variant_id: variantId ?? null,
    })
    // status='pending' : avis non visible tant que non modéré.
    return new Response(JSON.stringify({ success: true, pending: true, review }))
  } catch (err: any) {
    // Violation contrainte unique (un avis déjà existant pour ce buyer)
    if (err?.code === '23505') {
      return new Response(JSON.stringify({ error: 'Vous avez déjà laissé un avis sur ce produit.' }), { status: 409 })
    }
    console.error('[api/product-reviews] POST', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de l’envoi de l’avis.' }), { status: 500 })
  }
}

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 }) }

  const { reviewId, rating, content, title } = body
  if (!reviewId) return new Response(JSON.stringify({ error: 'Avis manquant.' }), { status: 400 })
  const err = validateReview(rating, content, title)
  if (err) return new Response(JSON.stringify({ error: err }), { status: 400 })

  try {
    // RLS restreint l'update à l'avis du buyer connecté.
    const review = await updateMyReview(authClient, reviewId, {
      rating,
      content: content.trim(),
      title: title?.trim() || null,
    })
    return new Response(JSON.stringify({ success: true, pending: true, review }))
  } catch (err) {
    console.error('[api/product-reviews] PATCH', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour.' }), { status: 500 })
  }
}

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 }) }

  const { reviewId } = body
  if (!reviewId) return new Response(JSON.stringify({ error: 'Avis manquant.' }), { status: 400 })

  try {
    // RLS restreint la suppression à l'avis du buyer connecté.
    await deleteMyReview(authClient, reviewId)
    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('[api/product-reviews] DELETE', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de la suppression.' }), { status: 500 })
  }
}
