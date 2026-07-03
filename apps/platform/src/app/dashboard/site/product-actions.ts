'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateAfterEntityMutation } from '@/lib/revalidate-public'
import { digitalFormatFromName } from '@/lib/digital-product-utils'
import {
  addProductMedia,
  createProduct,
  createProductVariant,
  getEntityByUserId,
  getEntityFileById,
  getOrCreateProductCategory,
  listProductCategories,
  purgeEntityCache,
} from '@ibee/supabase'
import type { ProductCreateInput } from '@ibee/shared'
import { isMissingColumnError } from '@/lib/postgres-errors'

const siteUrl = () => process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const VIDEO_TYPES = ['video/mp4', 'video/webm']
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov'])

function resolveUploadMediaType(file: File): { mediaType: 'image' | 'video'; contentType: string } | null {
  if (IMAGE_TYPES.includes(file.type)) {
    return { mediaType: 'image', contentType: file.type }
  }
  if (VIDEO_TYPES.includes(file.type)) {
    return { mediaType: 'video', contentType: file.type }
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (IMAGE_EXT.has(ext)) {
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'avif'
              ? 'image/avif'
              : 'image/jpeg'
    return { mediaType: 'image', contentType }
  }
  if (VIDEO_EXT.has(ext)) {
    return { mediaType: 'video', contentType: ext === 'webm' ? 'video/webm' : 'video/mp4' }
  }
  return null
}
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 200 * 1024 * 1024

const PHYSICAL_CONDITIONS = ['new', 'like_new', 'very_good', 'good', 'acceptable']

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  )
}

export async function uploadProductMediaAction(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'Aucun fichier fourni.' }
  }

  const resolved = resolveUploadMediaType(file)
  if (!resolved) return { ok: false as const, error: 'Format non supporté (jpeg, png, webp, gif, mp4, webm).' }
  const { mediaType, contentType } = resolved

  if (mediaType === 'image' && file.size > MAX_IMAGE_BYTES) {
    return { ok: false as const, error: "L'image ne doit pas dépasser 10 Mo." }
  }
  if (mediaType === 'video' && file.size > MAX_VIDEO_BYTES) {
    return { ok: false as const, error: 'La vidéo ne doit pas dépasser 200 Mo.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${user.id}/${crypto.randomUUID()}/${mediaType}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('publication-media')
      .upload(path, file, { contentType })

    if (uploadError) {
      console.error('[uploadProductMediaAction]', uploadError)
      return { ok: false as const, error: "Erreur lors de l'envoi du fichier." }
    }

    const { data } = supabase.storage.from('publication-media').getPublicUrl(path)
    return { ok: true as const, url: data.publicUrl, type: mediaType }
  } catch (err) {
    console.error('[uploadProductMediaAction]', err)
    return { ok: false as const, error: "Erreur lors de l'envoi du fichier." }
  }
}

export async function createProductAction(input: ProductCreateInput) {
  const fieldErrors: Record<string, string> = {}

  const type = input.type
  if (type !== 'digital' && type !== 'physical') {
    return { ok: false as const, error: 'Type de produit invalide.', fieldErrors: { type: 'Choisis un type de produit.' } }
  }

  const title = input.title?.trim() ?? ''
  if (title.length < 1) fieldErrors.title = 'Le titre est obligatoire.'
  else if (title.length > 100) fieldErrors.title = 'Le titre ne peut pas dépasser 100 caractères.'

  const descriptionShort = input.description_short?.trim() ?? ''
  if (descriptionShort.length < 1) fieldErrors.description_short = 'La description courte est obligatoire.'
  else if (descriptionShort.length > 160) {
    fieldErrors.description_short = 'La description courte ne peut pas dépasser 160 caractères.'
  }

  const priceCents = Number(input.price_cents)
  const priceValid = Number.isInteger(priceCents) && priceCents > 0
  if (!priceValid) fieldErrors.price_cents = 'Le prix doit être supérieur à 0.'

  const status = input.status === 'published' ? 'published' : 'draft'

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, error: 'Données invalides.', fieldErrors }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, error: 'Non authentifié.' }

    const entity = await getEntityByUserId(supabase, user.id)
    if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

    let resolvedCategoryId: string | null = null
    if (input.category_id) {
      const categories = await listProductCategories(supabase, entity.id)
      if (!categories.some((c) => c.id === input.category_id)) {
        return {
          ok: false as const,
          error: 'Données invalides.',
          fieldErrors: { category_id: 'Catégorie introuvable.' },
        }
      }
      resolvedCategoryId = input.category_id
    } else if (input.new_category_name?.trim()) {
      const cat = await getOrCreateProductCategory(supabase, entity.id, input.new_category_name.trim())
      resolvedCategoryId = cat.id
    }

    let digitalFileId: string | null = null
    let digitalFileFormat: string | null = null
    if (type === 'digital') {
      const fileId = input.digital_file_id?.trim() ?? ''
      if (!fileId) {
        return {
          ok: false as const,
          error: 'Données invalides.',
          fieldErrors: {
            digital_file_id: 'Le téléversement de fichiers n’est pas disponible pour le moment.',
          },
        }
      }
      const entityFile = await getEntityFileById(supabase, fileId)
      if (!entityFile || entityFile.entity_id !== entity.id) {
        return {
          ok: false as const,
          error: 'Données invalides.',
          fieldErrors: { digital_file_id: 'Fichier introuvable.' },
        }
      }
      digitalFileId = fileId
      digitalFileFormat = digitalFormatFromName(entityFile.name)
    }

    const baseSlug = slugify(title) || 'produit'
    const baseCommon = {
      entity_id: entity.id,
      type,
      title,
      description_short: descriptionShort,
      price_cents: priceCents,
      currency: 'EUR',
      status: status as 'draft' | 'published',
      bullet_points: input.bullet_points ?? [],
      sale_price_cents: input.sale_price_cents ?? null,
      sale_ends_at: input.sale_ends_at ?? null,
      category_id: resolvedCategoryId,
      content_blocks: input.content_blocks ?? [],
      faq: input.faq ?? [],
      custom_details: input.custom_details ?? [],
      digital_file_url: null,
      digital_file_id: digitalFileId,
      digital_file_format: digitalFileFormat as never,
      digital_license: null as never,
      physical_condition: (type === 'physical' ? input.physical_condition : null) as never,
      physical_pickup_location:
        type === 'physical' && input.pickup_enabled ? (input.physical_pickup_location ?? null) : null,
      physical_stock_quantity:
        type === 'physical'
          ? (Number.isInteger(input.physical_stock_quantity) ? input.physical_stock_quantity! : 1)
          : null,
      pickup_enabled: type === 'physical' ? (input.pickup_enabled ?? false) : false,
      delivery_enabled: type === 'physical' ? (input.delivery_enabled ?? false) : false,
    }

    const digitalStockFields =
      type === 'digital'
        ? {
            digital_stock_unlimited: input.digital_stock_unlimited ?? true,
            digital_stock_quantity:
              input.digital_stock_unlimited === false
                ? Number.isInteger(input.digital_stock_quantity)
                  ? input.digital_stock_quantity!
                  : 0
                : null,
          }
        : null

    let productId: string | null = null
    let productSlug: string | null = null
    let lastError: unknown = null
    let digitalStockSkipped = false

    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 76)}-${attempt + 1}`
      const payload = {
        ...baseCommon,
        ...(digitalStockFields && !digitalStockSkipped ? digitalStockFields : {}),
        slug,
      }
      try {
        const product = await createProduct(supabase, payload)
        productId = product.id
        productSlug = product.slug
        break
      } catch (err) {
        lastError = err
        if (
          !digitalStockSkipped &&
          digitalStockFields &&
          isMissingColumnError(err, 'digital_stock')
        ) {
          digitalStockSkipped = true
          attempt -= 1
          continue
        }
        if (isUniqueViolation(err)) continue
        console.error('[createProductAction]', err)
        return { ok: false as const, error: 'Erreur lors de la création du produit.' }
      }
    }

    if (!productId || !productSlug) {
      console.error('[createProductAction] slug collision', lastError)
      return {
        ok: false as const,
        error: 'Impossible de générer un identifiant unique pour ce titre.',
        fieldErrors: { title: 'Choisis un titre légèrement différent.' },
      }
    }

    const media = input.media ?? []
    if (media.length > 0) {
      try {
        await addProductMedia(
          supabase,
          productId,
          media.map((m, i) => ({
            url: m.url,
            media_type: m.type,
            display_order: i,
            alt_text: i === 0 ? title : null,
          }))
        )
      } catch (err) {
        console.error('[createProductAction] addProductMedia', err)
      }
    }

    for (const v of input.variants ?? []) {
      try {
        await createProductVariant(supabase, productId, {
          attributes: v.attributes,
          ...(v.sku !== undefined ? { sku: v.sku } : {}),
          ...(v.price_cents_override !== undefined ? { price_cents_override: v.price_cents_override } : {}),
          ...(v.stock_quantity !== undefined ? { stock_quantity: v.stock_quantity } : {}),
        })
      } catch (err) {
        console.error('[createProductAction] createProductVariant', err)
      }
    }

    if (status === 'published') {
      try {
        const { data: existing } = await supabase
          .from('entity_menu_sections')
          .select('id, is_active')
          .eq('entity_id', entity.id)
          .eq('type', 'shop' as never)
          .maybeSingle()

        if (!existing) {
          const { data: positions } = await supabase
            .from('entity_menu_sections')
            .select('position')
            .eq('entity_id', entity.id)
            .order('position', { ascending: false })
            .limit(1)
          const nextPosition = (positions?.[0]?.position ?? 0) + 1
          await supabase.from('entity_menu_sections').insert({
            entity_id: entity.id,
            type: 'shop' as never,
            is_active: true,
            is_configured: true,
            position: nextPosition,
          })
        } else if (!existing.is_active) {
          await supabase.from('entity_menu_sections').update({ is_active: true }).eq('id', existing.id)
        }
      } catch (err) {
        console.error('[createProductAction] ensure shop section', err)
      }
    }

    void purgeEntityCache(entity.slug, siteUrl())
    revalidateAfterEntityMutation(entity.slug, { productSlug })

    return {
      ok: true as const,
      product: {
        id: productId,
        title,
        slug: productSlug,
        description_short: descriptionShort,
        price_cents: priceCents,
        sale_price_cents: input.sale_price_cents ?? null,
        sale_ends_at: input.sale_ends_at ?? null,
        currency: 'EUR',
        status,
        category_id: resolvedCategoryId,
        type,
        physical_stock_quantity: baseCommon.physical_stock_quantity,
        image_url: media[0]?.url ?? null,
      },
    }
  } catch (err) {
    console.error('[createProductAction]', err)
    return { ok: false as const, error: 'Erreur lors de la création du produit.' }
  }
}
