import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type WishlistInsert = Database['public']['Tables']['wishlist_items']['Insert']
type WishlistUpdate = Database['public']['Tables']['wishlist_items']['Update']

// ---------------------------------------------------------------------------
// Wishlist — self uniquement (user_id = auth.uid() via RLS)
// ---------------------------------------------------------------------------

/**
 * Liste les items de la wishlist de l'utilisateur connecté.
 * Inclut le produit et la variante (si applicable) pour affichage et
 * comparaison de prix. Prix courant de la variante = price_cents_override ??
 * product.price_cents. La baisse de prix est détectée si le prix courant est
 * inférieur à price_cents_at_add (snapshot au moment de l'ajout).
 */
export async function getMyWishlist(
  client: SupabaseClient<Database>,
  opts: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = opts

  const { data, error } = await client
    .from('wishlist_items')
    .select('*, products(*), product_variants(*)')
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data ?? []
}

/**
 * Vérifie si un produit (et variante optionnelle) est déjà en wishlist.
 *
 * ATTENTION : La contrainte unique est (user_id, product_id, variant_id) et
 * Postgres traite NULL comme une valeur distincte. Pour un item sans variante,
 * il FAUT utiliser `.is('variant_id', null)` — `.eq` ne matcherait jamais les
 * lignes NULL.
 */
export async function isInWishlist(
  client: SupabaseClient<Database>,
  productId: string,
  variantId?: string | null
) {
  let query = client
    .from('wishlist_items')
    .select('id')
    .eq('product_id', productId)

  if (variantId) {
    query = query.eq('variant_id', variantId)
  } else {
    query = query.is('variant_id', null)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data !== null
}

/**
 * Ajoute un produit à la wishlist. Snapshote le prix courant au moment de
 * l'ajout (variant.price_cents_override ?? product.price_cents) pour
 * permettre la détection de baisse de prix via comparaison avec getMyWishlist.
 * Requiert la résolution du prix courant avant l'appel.
 * user_id doit correspondre à auth.uid() (vérifié par RLS WITH CHECK).
 */
export async function addToWishlist(
  client: SupabaseClient<Database>,
  data: {
    user_id: string
    product_id: string
    variant_id?: string | null
    note?: string | null
    price_cents_at_add: number
  }
) {
  const insert: WishlistInsert = {
    user_id: data.user_id,
    product_id: data.product_id,
    variant_id: data.variant_id ?? null,
    note: data.note ?? null,
    price_cents_at_add: data.price_cents_at_add,
  }

  const { data: item, error } = await client
    .from('wishlist_items')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return item
}

/**
 * Retire un item de la wishlist par son id.
 */
export async function removeFromWishlist(
  client: SupabaseClient<Database>,
  itemId: string
) {
  const { error } = await client
    .from('wishlist_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

/**
 * Toggle : ajoute si absent, retire si présent.
 * Retourne { added: true } ou { added: false }.
 *
 * ATTENTION null-variant : utilise `.is('variant_id', null)` pour les items
 * sans variante (voir isInWishlist).
 * user_id doit correspondre à auth.uid() (vérifié par RLS WITH CHECK).
 */
export async function toggleWishlist(
  client: SupabaseClient<Database>,
  data: {
    user_id: string
    product_id: string
    variant_id?: string | null
    price_cents_at_add: number
    note?: string | null
  }
): Promise<{ added: boolean }> {
  // Lookup de l'item existant
  let lookupQuery = client
    .from('wishlist_items')
    .select('id')
    .eq('product_id', data.product_id)

  if (data.variant_id) {
    lookupQuery = lookupQuery.eq('variant_id', data.variant_id)
  } else {
    lookupQuery = lookupQuery.is('variant_id', null)
  }

  const { data: existing, error: lookupError } = await lookupQuery.maybeSingle()
  if (lookupError) throw lookupError

  if (existing) {
    await removeFromWishlist(client, existing.id)
    return { added: false }
  }

  await addToWishlist(client, data)
  return { added: true }
}

/**
 * Met à jour la note personnelle sur un item de la wishlist.
 */
export async function updateWishlistNote(
  client: SupabaseClient<Database>,
  itemId: string,
  note: string | null
) {
  const update: WishlistUpdate = { note }

  const { data, error } = await client
    .from('wishlist_items')
    .update(update)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}
