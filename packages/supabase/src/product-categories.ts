import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type ProductCategory = Database['public']['Tables']['entity_product_categories']['Row']

// ---------------------------------------------------------------------------
// Catégories "playlists" — entity_product_categories
// Réutilisables par entity, créées à la volée depuis le formulaire produit.
// Lecture publique (RLS), CRUD owner (RLS sur entity.user_id = auth.uid()).
// ---------------------------------------------------------------------------

/**
 * Liste les catégories produit d'une entity, triées par position puis name.
 */
export async function listProductCategories(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<ProductCategory[]> {
  const { data, error } = await client
    .from('entity_product_categories')
    .select('*')
    .eq('entity_id', entityId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Récupère la catégorie portant ce nom (trim) pour l'entity si elle existe,
 * sinon la crée. Façon "playlist" : on réutilise plutôt que de dupliquer.
 *
 * Gère la course à l'insertion (deux requêtes simultanées avec le même nom) :
 * sur violation d'unicité (23505) on re-SELECT la ligne gagnante et on la
 * retourne au lieu d'échouer.
 */
export async function getOrCreateProductCategory(
  client: SupabaseClient<Database>,
  entityId: string,
  name: string
): Promise<ProductCategory> {
  const trimmed = name.trim()

  // 1. Existe déjà ?
  const { data: existing, error: selectError } = await client
    .from('entity_product_categories')
    .select('*')
    .eq('entity_id', entityId)
    .eq('name', trimmed)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing

  // 2. Création
  const { data: created, error: insertError } = await client
    .from('entity_product_categories')
    .insert({ entity_id: entityId, name: trimmed })
    .select()
    .single()

  if (!insertError && created) return created

  // 3. Course perdue (un autre process a inséré le même nom entre-temps) :
  //    la contrainte unique (entity_id, name) lève un 23505 → on re-SELECT.
  const isUniqueViolation =
    typeof insertError === 'object' &&
    insertError !== null &&
    'code' in insertError &&
    (insertError as { code?: string }).code === '23505'

  if (isUniqueViolation) {
    const { data: winner, error: reselectError } = await client
      .from('entity_product_categories')
      .select('*')
      .eq('entity_id', entityId)
      .eq('name', trimmed)
      .single()

    if (reselectError) throw reselectError
    return winner
  }

  throw insertError
}

/**
 * Supprime une catégorie. Les produits rattachés passent à category_id NULL
 * automatiquement (FK ON DELETE SET NULL).
 */
export async function deleteProductCategory(
  client: SupabaseClient<Database>,
  categoryId: string
): Promise<void> {
  const { error } = await client
    .from('entity_product_categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
}
