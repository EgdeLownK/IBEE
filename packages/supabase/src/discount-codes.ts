import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type DiscountCodeInsert = Database['public']['Tables']['discount_codes']['Insert']
type DiscountCodeUpdate = Database['public']['Tables']['discount_codes']['Update']

// ---------------------------------------------------------------------------
// CRUD owner — discount_codes
// Aucun accès public : les codes sont invisibles aux acheteurs.
// La validation (vérification validité, usage, réduction) passera par RPC
// `apply_discount_code` (SECURITY DEFINER, phase RPC).
// ---------------------------------------------------------------------------

/**
 * Liste les codes promo d'une entity pour le dashboard owner.
 * Inclut les associations produits et catégories.
 */
export async function listDiscountCodes(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { activeOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = opts

  let query = client
    .from('discount_codes')
    .select('*, discount_code_products(*), discount_code_categories(*)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Récupère un code promo par id (owner uniquement via RLS).
 */
export async function getDiscountCodeById(
  client: SupabaseClient<Database>,
  codeId: string
) {
  const { data, error } = await client
    .from('discount_codes')
    .select('*, discount_code_products(*), discount_code_categories(*)')
    .eq('id', codeId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Crée un code promo. Le code est en MAJUSCULES (contraint par la DB via
 * regex `^[A-Z0-9-]+$`).
 */
export async function createDiscountCode(
  client: SupabaseClient<Database>,
  data: Omit<DiscountCodeInsert, 'id' | 'created_at' | 'updated_at'>
) {
  const { data: code, error } = await client
    .from('discount_codes')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return code
}

/**
 * Met à jour un code promo.
 */
export async function updateDiscountCode(
  client: SupabaseClient<Database>,
  codeId: string,
  data: DiscountCodeUpdate
) {
  const { data: code, error } = await client
    .from('discount_codes')
    .update(data)
    .eq('id', codeId)
    .select()
    .single()

  if (error) throw error
  return code
}

/**
 * Supprime un code promo. Les associations produits/catégories et les usages
 * sont supprimés en cascade.
 */
export async function deleteDiscountCode(
  client: SupabaseClient<Database>,
  codeId: string
) {
  const { error } = await client
    .from('discount_codes')
    .delete()
    .eq('id', codeId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Associations produits (applies_to = 'specific_products')
// ---------------------------------------------------------------------------

/**
 * Remplace les produits associés à un code (delete + insert atomique via
 * deux requêtes séquentielles). Passer un tableau vide pour tout retirer.
 */
export async function setDiscountCodeProducts(
  client: SupabaseClient<Database>,
  codeId: string,
  productIds: string[]
) {
  const { error: deleteError } = await client
    .from('discount_code_products')
    .delete()
    .eq('code_id', codeId)

  if (deleteError) throw deleteError

  if (productIds.length === 0) return []

  const inserts = productIds.map((product_id) => ({ code_id: codeId, product_id }))
  const { data, error } = await client
    .from('discount_code_products')
    .insert(inserts)
    .select()

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Associations catégories (applies_to = 'specific_categories')
// ---------------------------------------------------------------------------

/**
 * Remplace les catégories associées à un code (delete + insert).
 * Passer un tableau vide pour tout retirer.
 */
export async function setDiscountCodeCategories(
  client: SupabaseClient<Database>,
  codeId: string,
  categories: string[]
) {
  const { error: deleteError } = await client
    .from('discount_code_categories')
    .delete()
    .eq('code_id', codeId)

  if (deleteError) throw deleteError

  if (categories.length === 0) return []

  const inserts = categories.map((category) => ({ code_id: codeId, category }))
  const { data, error } = await client
    .from('discount_code_categories')
    .insert(inserts)
    .select()

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Usages (lecture owner uniquement — pas d'écriture client)
// ---------------------------------------------------------------------------

/**
 * Liste les utilisations d'un code promo pour le dashboard owner.
 * Les usages sont insérés exclusivement via RPC `apply_discount_code`
 * (SECURITY DEFINER, phase RPC) — pas de helper d'insertion ici.
 *
 * TODO: Ajouter jointure `order_id → orders` quand la table orders existera.
 */
export async function listDiscountCodeUses(
  client: SupabaseClient<Database>,
  codeId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = opts

  const { data, error } = await client
    .from('discount_code_uses')
    .select('*')
    .eq('code_id', codeId)
    .order('used_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data ?? []
}
