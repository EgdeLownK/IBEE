import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type ProductMediaInsert = Database['public']['Tables']['product_media']['Insert']
type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update']
type ProductStatus = Database['public']['Enums']['product_status']

// ---------------------------------------------------------------------------
// Lecture publique
// ---------------------------------------------------------------------------

/**
 * Récupère un produit publié par slug d'entity + slug produit, avec media et
 * variantes actives. Retourne null si introuvable (utiliser lookupSlugHistory
 * pour détecter un ancien slug et déclencher un redirect 301).
 */
export async function getPublishedProductBySlug(
  client: SupabaseClient<Database>,
  entitySlug: string,
  productSlug: string
) {
  // Résolution entity
  const { data: entityRow, error: entityError } = await client
    .from('entity')
    .select('id')
    .eq('slug', entitySlug)
    .maybeSingle()

  if (entityError) throw entityError
  if (!entityRow) return null

  const { data, error } = await client
    .from('products')
    .select(`
      *,
      entity_product_categories(name),
      product_media(*),
      product_variants(*)
    `)
    .eq('entity_id', entityRow.id)
    .eq('slug', productSlug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // Filtres post-fetch : RLS ne filtre pas is_active sur les variantes,
  // et PostgREST n'ordonne pas les médias embarqués dans cette version.
  const product = {
    ...data,
    product_media: [...(data.product_media ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    ),
    product_variants: (data.product_variants ?? []).filter(
      (v) => v.is_active
    ),
  }

  return product
}

/**
 * Liste les produits publiés d'une entity avec pagination et filtre catégorie.
 * Inclut les médias pour affichage card. Variantes non incluses (trop verbeux
 * pour une liste).
 */
export async function listPublishedProductsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { limit?: number; offset?: number; category?: string } = {}
) {
  const { limit = 20, offset = 0 } = opts

  let query = client
    .from('products')
    .select('*, product_media(*)')
    .eq('entity_id', entityId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.category) query = query.eq('category', opts.category)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Lookup dans product_slug_history pour redirect 301 SEO.
 * Retourne le produit cible si l'ancien slug appartient à cette entity,
 * null sinon.
 */
export async function lookupProductSlugHistory(
  client: SupabaseClient<Database>,
  entityId: string,
  oldSlug: string
) {
  const { data, error } = await client
    .from('product_slug_history')
    .select('new_slug, product_id')
    .eq('entity_id', entityId)
    .eq('old_slug', oldSlug)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// CRUD owner — produits
// ---------------------------------------------------------------------------

/**
 * Récupère un produit par id (tous statuts). Requiert client authentifié ;
 * RLS filtre à l'owner.
 */
export async function getProductById(
  client: SupabaseClient<Database>,
  productId: string
) {
  const { data, error } = await client
    .from('products')
    .select('*, product_media(*), product_variants(*)')
    .eq('id', productId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Liste tous les produits d'une entity (tous statuts par défaut) pour le
 * dashboard owner. Filtre optionnel par status.
 */
export async function listProductsByEntity(
  client: SupabaseClient<Database>,
  entityId: string,
  opts: { status?: ProductStatus; limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = opts

  let query = client
    .from('products')
    .select('*, product_media(*)')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Crée un produit. Le slug doit être fourni et unique par entity (DB enforce).
 * Quand status='published', published_at est positionné automatiquement.
 */
export async function createProduct(
  client: SupabaseClient<Database>,
  data: Omit<ProductInsert, 'id' | 'created_at' | 'updated_at' | 'archived_at'>
) {
  const insert: ProductInsert = {
    ...data,
    published_at: data.published_at !== undefined ? data.published_at : (data.status === 'published' ? new Date().toISOString() : null),
    archived_at: null,
  }

  const { data: product, error } = await client
    .from('products')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return product as Product
}

/**
 * Met à jour un produit. Gère la transition de statut (published_at /
 * archived_at). Si le slug change, insère automatiquement dans
 * product_slug_history pour la continuité SEO.
 */
export async function updateProduct(
  client: SupabaseClient<Database>,
  productId: string,
  data: ProductUpdate & { previousSlug?: string; entityId?: string }
) {
  const { previousSlug, entityId, ...update } = data

  if (update.status === 'published' && !update.published_at) {
    update.published_at = new Date().toISOString()
  }
  if (update.status === 'archived') {
    update.archived_at = new Date().toISOString()
  }
  if (update.status === 'draft') {
    update.published_at = null
    update.archived_at = null
  }

  const { data: product, error } = await client
    .from('products')
    .update(update)
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error

  // Historique slug SEO
  if (previousSlug && update.slug && update.slug !== previousSlug && entityId) {
    const { error: historyError } = await client
      .from('product_slug_history')
      .insert({
        product_id: productId,
        entity_id: entityId,
        old_slug: previousSlug,
        new_slug: update.slug,
      })
    if (historyError) throw historyError
  }

  return product as Product
}

/**
 * Supprime un produit. Les médias, variantes et slug_history sont supprimés
 * en cascade par la DB.
 */
export async function deleteProduct(
  client: SupabaseClient<Database>,
  productId: string
) {
  const { error } = await client
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Gestion médias owner
// ---------------------------------------------------------------------------

/**
 * Ajoute un ou plusieurs médias à un produit.
 */
export async function addProductMedia(
  client: SupabaseClient<Database>,
  productId: string,
  media: Omit<ProductMediaInsert, 'product_id'>[]
) {
  const inserts: ProductMediaInsert[] = media.map((m, i) => ({
    ...m,
    product_id: productId,
    display_order: m.display_order ?? i,
  }))

  const { data, error } = await client
    .from('product_media')
    .insert(inserts)
    .select()

  if (error) throw error
  return data ?? []
}

/**
 * Supprime un média par son id.
 */
export async function removeProductMedia(
  client: SupabaseClient<Database>,
  mediaId: string
) {
  const { error } = await client
    .from('product_media')
    .delete()
    .eq('id', mediaId)

  if (error) throw error
}

/**
 * Réordonne les médias d'un produit. Prend un tableau d'{ id, display_order }
 * et met à jour chaque ligne individuellement.
 */
export async function reorderProductMedia(
  client: SupabaseClient<Database>,
  items: { id: string; display_order: number }[]
) {
  await Promise.all(
    items.map(({ id, display_order }) =>
      client
        .from('product_media')
        .update({ display_order })
        .eq('id', id)
        .then(({ error }) => { if (error) throw error })
    )
  )
}

// ---------------------------------------------------------------------------
// Variantes owner + lecture publique
// ---------------------------------------------------------------------------

/**
 * Liste les variantes actives d'un produit (lecture publique).
 */
export async function listProductVariants(
  client: SupabaseClient<Database>,
  productId: string,
  opts: { activeOnly?: boolean } = {}
) {
  const { activeOnly = true } = opts

  let query = client
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Crée une variante pour un produit.
 */
export async function createProductVariant(
  client: SupabaseClient<Database>,
  productId: string,
  data: Omit<ProductVariantInsert, 'product_id' | 'id' | 'created_at' | 'updated_at'>
) {
  const { data: variant, error } = await client
    .from('product_variants')
    .insert({ ...data, product_id: productId })
    .select()
    .single()

  if (error) throw error
  return variant
}

/**
 * Met à jour une variante.
 */
export async function updateProductVariant(
  client: SupabaseClient<Database>,
  variantId: string,
  data: ProductVariantUpdate
) {
  const { data: variant, error } = await client
    .from('product_variants')
    .update(data)
    .eq('id', variantId)
    .select()
    .single()

  if (error) throw error
  return variant
}

/**
 * Supprime une variante.
 */
export async function deleteProductVariant(
  client: SupabaseClient<Database>,
  variantId: string
) {
  const { error } = await client
    .from('product_variants')
    .delete()
    .eq('id', variantId)

  if (error) throw error
}
