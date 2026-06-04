import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type ReviewInsert = Database['public']['Tables']['product_reviews']['Insert']
type ReviewUpdate = Database['public']['Tables']['product_reviews']['Update']
type ReviewPhotoInsert = Database['public']['Tables']['product_review_photos']['Insert']

export type ReviewAggregates = {
  count: number
  average: number
}

// ---------------------------------------------------------------------------
// Lecture publique
// ---------------------------------------------------------------------------

/**
 * Liste les avis publiés d'un produit avec pagination, filtre note et tri.
 * Inclut les photos d'avis.
 */
export async function listPublishedReviews(
  client: SupabaseClient<Database>,
  productId: string,
  opts: {
    rating?: number
    sortBy?: 'recent' | 'helpful'
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 20, offset = 0, sortBy = 'recent' } = opts

  let query = client
    .from('product_reviews')
    .select('*, product_review_photos(*)')
    .eq('product_id', productId)
    .eq('status', 'published')
    .range(offset, offset + limit - 1)

  if (opts.rating) query = query.eq('rating', opts.rating)

  if (sortBy === 'helpful') {
    query = query.order('helpful_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Agrégats (moyenne et nombre) des avis publiés d'un produit.
 * Calculé côté JS sur la sélection rating — pas de RPC cette phase.
 */
export async function getReviewAggregates(
  client: SupabaseClient<Database>,
  productId: string
): Promise<ReviewAggregates> {
  const { data, error } = await client
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('status', 'published')

  if (error) throw error
  const rows = data ?? []
  const count = rows.length
  const average = count > 0
    ? Math.round((rows.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : 0

  return { count, average }
}

// ---------------------------------------------------------------------------
// CRUD buyer
// ---------------------------------------------------------------------------

/**
 * Récupère l'avis d'un acheteur spécifique sur un produit (maybeSingle car
 * la contrainte unique product+buyer signifie 0 ou 1 row par couple).
 * buyerUserId doit être auth.uid() du client appelant (RLS le vérifie).
 */
export async function getMyReview(
  client: SupabaseClient<Database>,
  productId: string,
  buyerUserId: string
) {
  const { data, error } = await client
    .from('product_reviews')
    .select('*, product_review_photos(*)')
    .eq('product_id', productId)
    .eq('buyer_user_id', buyerUserId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Crée un avis (buyer). Le status est omis volontairement : le défaut DB est
 * 'pending', ce qui empêche l'acheteur de se publier lui-même.
 * is_verified_purchase et seller_reply sont gérés côté server/RPC uniquement.
 *
 * TODO: remplacer par RPC `submit_review` (SECURITY DEFINER) quand la table
 * orders sera disponible (phase RPC). Cette RPC vérifiera l'achat, positionnera
 * is_verified_purchase et insérera l'avis en une transaction atomique.
 */
export async function createReview(
  client: SupabaseClient<Database>,
  data: {
    product_id: string
    buyer_user_id: string
    rating: number
    content: string
    title?: string | null
    variant_id?: string | null
  }
) {
  const insert: ReviewInsert = {
    product_id: data.product_id,
    buyer_user_id: data.buyer_user_id,
    rating: data.rating,
    content: data.content,
    title: data.title ?? null,
    variant_id: data.variant_id ?? null,
    // status intentionnellement omis : défaut DB = 'pending'
  }

  const { data: review, error } = await client
    .from('product_reviews')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return review
}

/**
 * Met à jour l'avis du buyer (rating, title, content uniquement — status
 * exclu pour ne pas laisser l'acheteur se republier).
 */
export async function updateMyReview(
  client: SupabaseClient<Database>,
  reviewId: string,
  data: { rating?: number; title?: string | null; content?: string }
) {
  const update: ReviewUpdate = {}
  if (data.rating !== undefined) update.rating = data.rating
  if (data.title !== undefined) update.title = data.title
  if (data.content !== undefined) update.content = data.content

  const { data: review, error } = await client
    .from('product_reviews')
    .update(update)
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return review
}

/**
 * Supprime l'avis du buyer (photos supprimées en cascade par la DB).
 */
export async function deleteMyReview(
  client: SupabaseClient<Database>,
  reviewId: string
) {
  const { error } = await client
    .from('product_reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Photos d'avis (buyer)
// ---------------------------------------------------------------------------

/**
 * Ajoute des photos à un avis existant.
 */
export async function addReviewPhotos(
  client: SupabaseClient<Database>,
  reviewId: string,
  photos: { url: string; display_order?: number }[]
) {
  const inserts: ReviewPhotoInsert[] = photos.map((p, i) => ({
    review_id: reviewId,
    url: p.url,
    display_order: p.display_order ?? i,
  }))

  const { data, error } = await client
    .from('product_review_photos')
    .insert(inserts)
    .select()

  if (error) throw error
  return data ?? []
}

/**
 * Supprime une photo d'avis par son id.
 */
export async function removeReviewPhoto(
  client: SupabaseClient<Database>,
  photoId: string
) {
  const { error } = await client
    .from('product_review_photos')
    .delete()
    .eq('id', photoId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Modération owner (lecture tous statuts)
// ---------------------------------------------------------------------------

/**
 * Liste tous les avis d'un produit (tous statuts) pour modération owner.
 * Requiert client authentifié ; RLS restreint à l'owner du produit.
 *
 * TODO: La modération (changement de status) passera par RPC
 * `moderate_product_review` (SECURITY DEFINER, phase RPC). Cette RPC est
 * nécessaire car RLS ne permet pas de restreindre un UPDATE à certaines
 * colonnes — une policy owner_update donnerait un accès complet à la row.
 */
export async function listReviewsForModeration(
  client: SupabaseClient<Database>,
  productId: string,
  opts: {
    status?: Database['public']['Enums']['product_review_status']
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 50, offset = 0 } = opts

  let query = client
    .from('product_reviews')
    .select('*, product_review_photos(*)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
