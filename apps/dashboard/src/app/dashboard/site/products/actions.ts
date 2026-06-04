'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductMedia,
  removeProductMedia,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  getDiscountCodeById,
  setDiscountCodeProducts,
  setDiscountCodeCategories,
  purgeEntityCache,
} from '@ibee/supabase'

const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'

// ---------------------------------------------------------------------------
// Résultat commun (même forme que news/new/actions.ts)
// ---------------------------------------------------------------------------

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  error.issues.forEach((issue) => {
    const key = issue.path[0]
    if (key !== undefined) fieldErrors[String(key)] = issue.message
  })
  return fieldErrors
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  )
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// ---------------------------------------------------------------------------
// Activation section Boutique (copie de ensureNewsSectionActive, type 'shop')
// ---------------------------------------------------------------------------

async function ensureShopSectionActive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string
) {
  const { data: existing } = await supabase
    .from('entity_menu_sections')
    .select('id, is_active')
    .eq('entity_id', entityId)
    .eq('type', 'shop')
    .maybeSingle()

  if (!existing) {
    await supabase.from('entity_menu_sections').insert({
      entity_id: entityId,
      type: 'shop',
      is_active: true,
      is_configured: true,
      position: 1,
    })
  } else if (!existing.is_active) {
    await supabase
      .from('entity_menu_sections')
      .update({ is_active: true })
      .eq('id', existing.id)
  }
}

// ---------------------------------------------------------------------------
// Schémas Zod — produit (discriminated union sur `type`)
// ---------------------------------------------------------------------------

const slugRegex = /^[a-z0-9-]+$/

const baseProductFields = {
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  slug: z
    .string()
    .trim()
    .regex(slugRegex, 'Le slug ne peut contenir que des minuscules, chiffres et tirets')
    .max(80)
    .optional()
    .or(z.literal('')),
  description_short: z.string().trim().min(1, 'La description courte est obligatoire').max(160, 'La description courte ne peut pas dépasser 160 caractères'),
  description_long: z.string().trim().max(10000).optional().or(z.literal('')),
  price_cents: z.number().int('Prix invalide').positive('Le prix doit être supérieur à 0'),
  currency: z.string().trim().length(3).default('EUR'),
  category: z.string().trim().max(80).optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(['draft', 'published', 'archived']),
}

const digitalSchema = z.object({
  type: z.literal('digital'),
  ...baseProductFields,
  digital_file_url: z.string().trim().url('Le lien du fichier doit être une URL valide'),
  digital_file_format: z.enum(['pdf', 'epub', 'mp4', 'mp3', 'zip', 'other']),
  digital_license: z.enum(['personal', 'professional', 'commercial']),
})

const physicalSchema = z.object({
  type: z.literal('physical'),
  ...baseProductFields,
  physical_condition: z.enum(['new', 'like_new', 'very_good', 'good', 'acceptable']),
  physical_pickup_location: z.string().trim().min(1, 'Le lieu de retrait est obligatoire').max(200),
  stock_quantity: z.number().int().min(0, 'Le stock ne peut pas être négatif').default(0),
})

const productSchema = z.discriminatedUnion('type', [digitalSchema, physicalSchema])

export type ProductInput = z.input<typeof productSchema>

// Construit le payload d'insert/update à partir des données parsées.
function buildProductPayload(data: z.infer<typeof productSchema>, slug: string) {
  const common = {
    title: data.title,
    slug,
    description_short: data.description_short,
    description_long: data.description_long ? data.description_long : null,
    price_cents: data.price_cents,
    currency: data.currency,
    category: data.category ? data.category : '',
    tags: data.tags,
    status: data.status,
    type: data.type,
  }

  if (data.type === 'digital') {
    return {
      ...common,
      digital_file_url: data.digital_file_url,
      digital_file_format: data.digital_file_format,
      digital_license: data.digital_license,
      // Colonnes physical laissées à null (CHECK conditionnel sur type)
      physical_condition: null,
      physical_pickup_location: null,
      physical_stock_quantity: null,
    }
  }

  return {
    ...common,
    physical_condition: data.physical_condition,
    physical_pickup_location: data.physical_pickup_location,
    physical_stock_quantity: data.stock_quantity,
    // Colonnes digital laissées à null
    digital_file_url: null,
    digital_file_format: null,
    digital_license: null,
  }
}

// ---------------------------------------------------------------------------
// Produits — CRUD
// ---------------------------------------------------------------------------

export async function createProductAction(input: ProductInput): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const slug = parsed.data.slug && parsed.data.slug.length > 0 ? parsed.data.slug : slugify(parsed.data.title)
  if (!slug) return { success: false, error: 'Données invalides', fieldErrors: { slug: 'Slug invalide' } }

  let productId: string
  try {
    const product = await createProduct(supabase, {
      entity_id: entity.id,
      ...buildProductPayload(parsed.data, slug),
    })
    productId = product.id

    if (parsed.data.status === 'published') {
      await ensureShopSectionActive(supabase, entity.id)
    }

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/products')
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: false, error: 'Slug déjà utilisé', fieldErrors: { slug: 'Ce slug est déjà utilisé' } }
    }
    console.error('[createProductAction]', err)
    return { success: false, error: 'Erreur lors de la création du produit' }
  }

  return { success: true, id: productId }
}

const updateProductSchemaWrapper = z.object({ productId: z.string().uuid() })

export async function updateProductAction(
  input: ProductInput & { productId: string }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const idParsed = updateProductSchemaWrapper.safeParse({ productId: input.productId })
  if (!idParsed.success) return { success: false, error: 'Identifiant invalide' }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const existing = await getProductById(supabase, idParsed.data.productId)
  if (!existing) return { success: false, error: 'Produit introuvable' }

  const slug = parsed.data.slug && parsed.data.slug.length > 0 ? parsed.data.slug : slugify(parsed.data.title)
  if (!slug) return { success: false, error: 'Données invalides', fieldErrors: { slug: 'Slug invalide' } }

  try {
    await updateProduct(supabase, idParsed.data.productId, {
      ...buildProductPayload(parsed.data, slug),
      previousSlug: existing.slug,
      entityId: entity.id,
    })

    if (parsed.data.status === 'published') {
      await ensureShopSectionActive(supabase, entity.id)
    }

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/products')
    revalidatePath(`/dashboard/site/products/${idParsed.data.productId}/edit`)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: false, error: 'Slug déjà utilisé', fieldErrors: { slug: 'Ce slug est déjà utilisé' } }
    }
    console.error('[updateProductAction]', err)
    return { success: false, error: 'Erreur lors de la mise à jour du produit' }
  }

  return { success: true, id: idParsed.data.productId }
}

const deleteProductSchema = z.object({ productId: z.string().uuid() })

export async function deleteProductAction(input: { productId: string }): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = deleteProductSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Identifiant invalide' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await deleteProduct(supabase, parsed.data.productId)
    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/products')
  } catch (err) {
    console.error('[deleteProductAction]', err)
    return { success: false, error: 'Erreur lors de la suppression du produit' }
  }

  return { success: true }
}

const setStatusSchema = z.object({
  productId: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']),
})

export async function setProductStatusAction(input: {
  productId: string
  status: 'draft' | 'published' | 'archived'
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = setStatusSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Données invalides' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const existing = await getProductById(supabase, parsed.data.productId)
  if (!existing) return { success: false, error: 'Produit introuvable' }

  try {
    await updateProduct(supabase, parsed.data.productId, { status: parsed.data.status })

    if (parsed.data.status === 'published') {
      await ensureShopSectionActive(supabase, entity.id)
    }

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath('/dashboard/site/products')
  } catch (err) {
    console.error('[setProductStatusAction]', err)
    return { success: false, error: 'Erreur lors du changement de statut' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Médias — remplace la galerie complète
// ---------------------------------------------------------------------------

const saveMediaSchema = z.object({
  productId: z.string().uuid(),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        alt_text: z.string().trim().max(200).optional().nullable(),
      })
    )
    .default([]),
})

export async function saveProductMediaAction(input: {
  productId: string
  media: { url: string; alt_text?: string | null }[]
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = saveMediaSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Données invalides' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const existing = await getProductById(supabase, parsed.data.productId)
  if (!existing) return { success: false, error: 'Produit introuvable' }

  try {
    // Pas de helper de remplacement atomique : on supprime l'existant puis on
    // ré-insère la galerie ordonnée via addProductMedia.
    const currentMedia = existing.product_media ?? []
    for (const m of currentMedia) {
      await removeProductMedia(supabase, m.id)
    }

    if (parsed.data.media.length > 0) {
      await addProductMedia(
        supabase,
        parsed.data.productId,
        parsed.data.media.map((m, i) => ({
          url: m.url,
          media_type: 'image' as const,
          display_order: i,
          alt_text: m.alt_text ?? null,
        }))
      )
    }

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath(`/dashboard/site/products/${parsed.data.productId}/edit`)
  } catch (err) {
    console.error('[saveProductMediaAction]', err)
    return { success: false, error: 'Erreur lors de l\'enregistrement des médias' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Variantes — CRUD
// ---------------------------------------------------------------------------

const createVariantSchema = z.object({
  productId: z.string().uuid(),
  attributes: z.record(z.string(), z.string()).default({}),
  sku: z.string().trim().max(80).optional().nullable(),
  price_cents_override: z.number().int().positive().optional().nullable(),
  stock_quantity: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export async function createVariantAction(input: {
  productId: string
  attributes?: Record<string, string>
  sku?: string | null
  price_cents_override?: number | null
  stock_quantity?: number
  is_active?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = createVariantSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const product = await getProductById(supabase, parsed.data.productId)
  if (!product) return { success: false, error: 'Produit introuvable' }

  let variantId: string
  try {
    const variant = await createProductVariant(supabase, parsed.data.productId, {
      attributes: parsed.data.attributes,
      sku: parsed.data.sku ?? null,
      price_cents_override: parsed.data.price_cents_override ?? null,
      stock_quantity: parsed.data.stock_quantity,
      is_active: parsed.data.is_active,
    })
    variantId = variant.id

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath(`/dashboard/site/products/${parsed.data.productId}/edit`)
  } catch (err) {
    console.error('[createVariantAction]', err)
    return { success: false, error: 'Erreur lors de la création de la variante' }
  }

  return { success: true, id: variantId }
}

const updateVariantSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
  attributes: z.record(z.string(), z.string()).optional(),
  sku: z.string().trim().max(80).optional().nullable(),
  price_cents_override: z.number().int().positive().optional().nullable(),
  stock_quantity: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export async function updateVariantAction(input: {
  variantId: string
  productId: string
  attributes?: Record<string, string>
  sku?: string | null
  price_cents_override?: number | null
  stock_quantity?: number
  is_active?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = updateVariantSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await updateProductVariant(supabase, parsed.data.variantId, {
      ...(parsed.data.attributes !== undefined ? { attributes: parsed.data.attributes } : {}),
      ...(parsed.data.sku !== undefined ? { sku: parsed.data.sku } : {}),
      ...(parsed.data.price_cents_override !== undefined
        ? { price_cents_override: parsed.data.price_cents_override }
        : {}),
      ...(parsed.data.stock_quantity !== undefined ? { stock_quantity: parsed.data.stock_quantity } : {}),
      ...(parsed.data.is_active !== undefined ? { is_active: parsed.data.is_active } : {}),
    })

    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath(`/dashboard/site/products/${parsed.data.productId}/edit`)
  } catch (err) {
    console.error('[updateVariantAction]', err)
    return { success: false, error: 'Erreur lors de la mise à jour de la variante' }
  }

  return { success: true }
}

const deleteVariantSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
})

export async function deleteVariantAction(input: {
  variantId: string
  productId: string
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = deleteVariantSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Données invalides' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await deleteProductVariant(supabase, parsed.data.variantId)
    await purgeEntityCache(entity.slug, siteUrl)
    revalidatePath(`/dashboard/site/products/${parsed.data.productId}/edit`)
  } catch (err) {
    console.error('[deleteVariantAction]', err)
    return { success: false, error: 'Erreur lors de la suppression de la variante' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Codes promo — CRUD + associations
// ---------------------------------------------------------------------------

const discountBaseFields = {
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9-]+$/, 'Le code ne peut contenir que des majuscules, chiffres et tirets').min(1).max(40)),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  value: z.number().int().min(0, 'La valeur ne peut pas être négative'),
  applies_to: z.enum(['all_products', 'specific_products', 'specific_categories']).default('all_products'),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  max_uses_total: z.number().int().positive().optional().nullable(),
  max_uses_per_user: z.number().int().positive().default(1),
  min_purchase_cents: z.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
  productIds: z.array(z.string().uuid()).default([]),
  categories: z.array(z.string().trim().min(1)).default([]),
}

const createDiscountSchema = z.object(discountBaseFields).refine(
  (d) => !d.ends_at || !d.starts_at || new Date(d.ends_at) > new Date(d.starts_at),
  { message: 'La date de fin doit être après la date de début', path: ['ends_at'] }
)

export type DiscountCodeInput = z.input<typeof createDiscountSchema>

async function applyDiscountAssociations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  codeId: string,
  appliesTo: 'all_products' | 'specific_products' | 'specific_categories',
  productIds: string[],
  categories: string[]
) {
  if (appliesTo === 'specific_products') {
    await setDiscountCodeProducts(supabase, codeId, productIds)
    await setDiscountCodeCategories(supabase, codeId, [])
  } else if (appliesTo === 'specific_categories') {
    await setDiscountCodeCategories(supabase, codeId, categories)
    await setDiscountCodeProducts(supabase, codeId, [])
  } else {
    await setDiscountCodeProducts(supabase, codeId, [])
    await setDiscountCodeCategories(supabase, codeId, [])
  }
}

export async function createDiscountCodeAction(input: DiscountCodeInput): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = createDiscountSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  let codeId: string
  try {
    const code = await createDiscountCode(supabase, {
      entity_id: entity.id,
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      applies_to: parsed.data.applies_to,
      starts_at: parsed.data.starts_at ?? null,
      ends_at: parsed.data.ends_at ?? null,
      max_uses_total: parsed.data.max_uses_total ?? null,
      max_uses_per_user: parsed.data.max_uses_per_user,
      min_purchase_cents: parsed.data.min_purchase_cents ?? null,
      is_active: parsed.data.is_active,
    })
    codeId = code.id

    await applyDiscountAssociations(
      supabase,
      codeId,
      parsed.data.applies_to,
      parsed.data.productIds,
      parsed.data.categories
    )

    revalidatePath('/dashboard/site/products/codes')
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: false, error: 'Code déjà utilisé', fieldErrors: { code: 'Ce code existe déjà' } }
    }
    console.error('[createDiscountCodeAction]', err)
    return { success: false, error: 'Erreur lors de la création du code promo' }
  }

  return { success: true, id: codeId }
}

const updateDiscountSchema = z.object({ ...discountBaseFields, codeId: z.string().uuid() }).refine(
  (d) => !d.ends_at || !d.starts_at || new Date(d.ends_at) > new Date(d.starts_at),
  { message: 'La date de fin doit être après la date de début', path: ['ends_at'] }
)

export async function updateDiscountCodeAction(
  input: DiscountCodeInput & { codeId: string }
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = updateDiscountSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  const existing = await getDiscountCodeById(supabase, parsed.data.codeId)
  if (!existing) return { success: false, error: 'Code promo introuvable' }

  try {
    await updateDiscountCode(supabase, parsed.data.codeId, {
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      applies_to: parsed.data.applies_to,
      starts_at: parsed.data.starts_at ?? null,
      ends_at: parsed.data.ends_at ?? null,
      max_uses_total: parsed.data.max_uses_total ?? null,
      max_uses_per_user: parsed.data.max_uses_per_user,
      min_purchase_cents: parsed.data.min_purchase_cents ?? null,
      is_active: parsed.data.is_active,
    })

    await applyDiscountAssociations(
      supabase,
      parsed.data.codeId,
      parsed.data.applies_to,
      parsed.data.productIds,
      parsed.data.categories
    )

    revalidatePath('/dashboard/site/products/codes')
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: false, error: 'Code déjà utilisé', fieldErrors: { code: 'Ce code existe déjà' } }
    }
    console.error('[updateDiscountCodeAction]', err)
    return { success: false, error: 'Erreur lors de la mise à jour du code promo' }
  }

  return { success: true, id: parsed.data.codeId }
}

const deleteDiscountSchema = z.object({ codeId: z.string().uuid() })

export async function deleteDiscountCodeAction(input: { codeId: string }): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const parsed = deleteDiscountSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Identifiant invalide' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { success: false, error: 'Profil introuvable' }

  try {
    await deleteDiscountCode(supabase, parsed.data.codeId)
    revalidatePath('/dashboard/site/products/codes')
  } catch (err) {
    console.error('[deleteDiscountCodeAction]', err)
    return { success: false, error: 'Erreur lors de la suppression du code promo' }
  }

  return { success: true }
}
