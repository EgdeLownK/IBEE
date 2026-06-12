/** @deprecated Phase 9 — produits via dashboard (`product-actions`). Rollback only. */
import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import {
  getEntityByUserId,
  getEntityFileById,
  createProduct,
  addProductMedia,
  createProductVariant,
  listProductCategories,
  getOrCreateProductCategory,
  purgeEntityCache,
} from '@ibee/supabase'

// ---------------------------------------------------------------------------
// Constantes de validation (miroir des CHECK de la migration products_v1)
// ---------------------------------------------------------------------------

const DIGITAL_FORMATS = ['pdf', 'epub', 'mp4', 'mp3', 'zip', 'other']
const PHYSICAL_CONDITIONS = ['new', 'like_new', 'very_good', 'good', 'acceptable']

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Format enum (DIGITAL_FORMATS) déduit de l'extension du nom de fichier. */
function digitalFormatFromName(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return DIGITAL_FORMATS.includes(ext) ? ext : 'other'
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  )
}

interface FieldErrors {
  [field: string]: string
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'Profil introuvable.' }), { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const fieldErrors: FieldErrors = {}

  // --- Type ---
  const type = body?.type
  if (type !== 'digital' && type !== 'physical') {
    return new Response(
      JSON.stringify({ success: false, error: 'Type de produit invalide.', fieldErrors: { type: 'Choisis un type de produit.' } }),
      { status: 400 }
    )
  }

  // --- Communs ---
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (title.length < 1) fieldErrors.title = 'Le titre est obligatoire.'
  else if (title.length > 100) fieldErrors.title = 'Le titre ne peut pas dépasser 100 caractères.'

  const descriptionShort = typeof body?.description_short === 'string' ? body.description_short.trim() : ''
  if (descriptionShort.length < 1) fieldErrors.description_short = 'La description courte est obligatoire.'
  else if (descriptionShort.length > 160) fieldErrors.description_short = 'La description courte ne peut pas dépasser 160 caractères.'

  // Prix : reçu en cents (entier) depuis l'overlay
  const priceCents = Number(body?.price_cents)
  const priceValid = Number.isInteger(priceCents) && priceCents > 0
  if (!priceValid) {
    fieldErrors.price_cents = 'Le prix doit être supérieur à 0.'
  }

  // --- Points principaux (bullet_points) ---
  // Array de strings optionnel : max 8 points, chacun trim 1-100 caractères.
  let bulletPoints: string[] = []
  if (body?.bullet_points !== undefined && body?.bullet_points !== null) {
    if (!Array.isArray(body.bullet_points)) {
      fieldErrors.bullet_points = 'Les points principaux doivent être une liste.'
    } else if (body.bullet_points.length > 8) {
      fieldErrors.bullet_points = 'Maximum 8 points principaux.'
    } else {
      const cleaned: string[] = []
      for (const raw of body.bullet_points) {
        const point = typeof raw === 'string' ? raw.trim() : ''
        if (point.length < 1 || point.length > 100) {
          fieldErrors.bullet_points = 'Chaque point doit faire entre 1 et 100 caractères.'
          break
        }
        cleaned.push(point)
      }
      if (!fieldErrors.bullet_points) bulletPoints = cleaned
    }
  }

  // --- Promo (prix barré) ---
  // sale_price_cents optionnel : entier ≥ 0, STRICTEMENT < price_cents.
  // sale_ends_at optionnel : date ISO future, acceptée seulement si sale_price fourni.
  let salePriceCents: number | null = null
  let saleEndsAt: string | null = null
  const hasSalePrice = body?.sale_price_cents !== undefined && body?.sale_price_cents !== null
  if (hasSalePrice) {
    const sp = Number(body.sale_price_cents)
    if (!Number.isInteger(sp) || sp < 0) {
      fieldErrors.sale_price_cents = 'Le prix promo doit être un entier positif ou nul.'
    } else if (priceValid && sp >= priceCents) {
      // On ne compare que si le prix de base est valide (sinon message trompeur).
      fieldErrors.sale_price_cents = 'Le prix promo doit être inférieur au prix.'
    } else if (priceValid) {
      salePriceCents = sp
    }
  }
  if (body?.sale_ends_at !== undefined && body?.sale_ends_at !== null && `${body.sale_ends_at}`.length > 0) {
    if (!hasSalePrice) {
      fieldErrors.sale_ends_at = 'Une date de fin nécessite un prix promo.'
    } else {
      const d = new Date(body.sale_ends_at)
      if (Number.isNaN(d.getTime())) {
        fieldErrors.sale_ends_at = 'La date de fin de promo est invalide.'
      } else if (d.getTime() <= Date.now()) {
        fieldErrors.sale_ends_at = 'La date de fin de promo doit être dans le futur.'
      } else {
        saleEndsAt = d.toISOString()
      }
    }
  }

  // --- Catégorie (category_id existant OU new_category_name, exclusifs) ---
  const categoryIdInput = typeof body?.category_id === 'string' && body.category_id.trim().length > 0
    ? body.category_id.trim()
    : null
  const newCategoryName = typeof body?.new_category_name === 'string' && body.new_category_name.trim().length > 0
    ? body.new_category_name.trim()
    : null
  if (categoryIdInput && newCategoryName) {
    fieldErrors.category_id = 'Choisis une catégorie existante OU crée-en une, pas les deux.'
  }
  if (newCategoryName && (newCategoryName.length < 1 || newCategoryName.length > 60)) {
    fieldErrors.new_category_name = 'Le nom de catégorie doit faire entre 1 et 60 caractères.'
  }

  // --- Description riche (content_blocks) ---
  // Array optionnel de blocs : {type:'text', content 1-2000} | {type:'image', url valide, alt? ≤200}. Max 20.
  type ContentBlock =
    | { type: 'text'; content: string }
    | { type: 'image'; url: string; alt?: string }
  let contentBlocks: ContentBlock[] = []
  if (body?.content_blocks !== undefined && body?.content_blocks !== null) {
    if (!Array.isArray(body.content_blocks)) {
      fieldErrors.content_blocks = 'La description doit être une liste de blocs.'
    } else if (body.content_blocks.length > 20) {
      fieldErrors.content_blocks = 'Maximum 20 blocs de contenu.'
    } else {
      const blocks: ContentBlock[] = []
      for (const raw of body.content_blocks) {
        if (raw?.type === 'text') {
          const content = typeof raw.content === 'string' ? raw.content.trim() : ''
          if (content.length < 1 || content.length > 2000) {
            fieldErrors.content_blocks = 'Chaque bloc texte doit faire entre 1 et 2000 caractères.'
            break
          }
          blocks.push({ type: 'text', content })
        } else if (raw?.type === 'image') {
          const url = typeof raw.url === 'string' ? raw.url.trim() : ''
          let urlOk = false
          try { new URL(url); urlOk = true } catch { urlOk = false }
          if (!urlOk) {
            fieldErrors.content_blocks = 'Chaque bloc image doit avoir une URL valide.'
            break
          }
          const alt = typeof raw.alt === 'string' ? raw.alt.trim().slice(0, 200) : undefined
          blocks.push(alt ? { type: 'image', url, alt } : { type: 'image', url })
        } else {
          fieldErrors.content_blocks = 'Type de bloc inconnu (text ou image attendu).'
          break
        }
      }
      if (!fieldErrors.content_blocks) contentBlocks = blocks
    }
  }

  // --- FAQ (faq) ---
  // Array optionnel de {question 1-200, answer 1-1000}. Max 10. Les deux types.
  type FaqItem = { question: string; answer: string }
  let faqItems: FaqItem[] = []
  if (body?.faq !== undefined && body?.faq !== null) {
    if (!Array.isArray(body.faq)) {
      fieldErrors.faq = 'La FAQ doit être une liste.'
    } else if (body.faq.length > 10) {
      fieldErrors.faq = 'Maximum 10 questions dans la FAQ.'
    } else {
      const cleaned: FaqItem[] = []
      for (const raw of body.faq) {
        const question = typeof raw?.question === 'string' ? raw.question.trim() : ''
        const answer = typeof raw?.answer === 'string' ? raw.answer.trim() : ''
        if (question.length < 1 || question.length > 200) {
          fieldErrors.faq = 'Chaque question doit faire entre 1 et 200 caractères.'
          break
        }
        if (answer.length < 1 || answer.length > 1000) {
          fieldErrors.faq = 'Chaque réponse doit faire entre 1 et 1000 caractères.'
          break
        }
        cleaned.push({ question, answer })
      }
      if (!fieldErrors.faq) faqItems = cleaned
    }
  }

  // --- Détails personnalisés (custom_details) ---
  // Array optionnel de {label 1-40, value 1-100, family? 1-40}. Max 30 au total
  // (libres + familles). family optionnel : regroupe les détails par famille
  // à l'affichage. Remplace digital_license (dépréciée).
  type CustomDetail = { label: string; value: string; family?: string }
  let customDetails: CustomDetail[] = []
  if (body?.custom_details !== undefined && body?.custom_details !== null) {
    if (!Array.isArray(body.custom_details)) {
      fieldErrors.custom_details = 'Les détails doivent être une liste.'
    } else if (body.custom_details.length > 30) {
      fieldErrors.custom_details = 'Maximum 30 détails au total.'
    } else {
      const cleaned: CustomDetail[] = []
      for (const raw of body.custom_details) {
        const label = typeof raw?.label === 'string' ? raw.label.trim() : ''
        const value = typeof raw?.value === 'string' ? raw.value.trim() : ''
        if (label.length < 1 || label.length > 40) {
          fieldErrors.custom_details = 'Chaque libellé doit faire entre 1 et 40 caractères.'
          break
        }
        if (value.length < 1 || value.length > 100) {
          fieldErrors.custom_details = 'Chaque valeur doit faire entre 1 et 100 caractères.'
          break
        }
        let family: string | undefined
        if (raw?.family !== undefined && raw?.family !== null && `${raw.family}`.length > 0) {
          const fam = typeof raw.family === 'string' ? raw.family.trim() : ''
          if (fam.length < 1 || fam.length > 40) {
            fieldErrors.custom_details = 'Chaque nom de famille doit faire entre 1 et 40 caractères.'
            break
          }
          family = fam
        }
        cleaned.push(family ? { label, value, family } : { label, value })
      }
      if (!fieldErrors.custom_details) customDetails = cleaned
    }
  }

  // --- Médias (remplace image_url) ---
  // Array jusqu'à 10 items {url, type:'image'|'video'}, MAX 1 vidéo.
  // Rétro-compat : si image_url fourni et pas de media[], on le traite comme media[0] image.
  type MediaInput = { url: string; type: 'image' | 'video' }
  let mediaInputs: MediaInput[] = []
  const rawMedia = Array.isArray(body?.media) ? body.media : null
  if (rawMedia) {
    if (rawMedia.length > 10) {
      fieldErrors.media = 'Maximum 10 médias.'
    } else {
      let videoCount = 0
      const cleaned: MediaInput[] = []
      for (const m of rawMedia) {
        const url = typeof m?.url === 'string' ? m.url.trim() : ''
        let urlOk = false
        try { new URL(url); urlOk = true } catch { urlOk = false }
        if (!urlOk) { fieldErrors.media = 'Chaque média doit avoir une URL valide.'; break }
        if (m?.type !== 'image' && m?.type !== 'video') {
          fieldErrors.media = 'Type de média invalide (image ou video).'
          break
        }
        if (m.type === 'video') videoCount++
        cleaned.push({ url, type: m.type })
      }
      if (!fieldErrors.media && videoCount > 1) {
        fieldErrors.media = 'Une seule vidéo est autorisée.'
      }
      if (!fieldErrors.media) mediaInputs = cleaned
    }
  } else if (typeof body?.image_url === 'string' && body.image_url.trim().length > 0) {
    // Rétro-compat ancien overlay : image_url unique → media[0] image.
    mediaInputs = [{ url: body.image_url.trim(), type: 'image' }]
  }

  // --- Variantes (création) ---
  // Array optionnel ≤ 20. Chaque variante :
  //   attributes : Record<string,string> ≥ 1 paire, clés/valeurs trim 1-40 car.
  //   sku? : string ≤ 80 ; price_cents_override? : entier > 0 ; stock_quantity? : entier ≥ 0.
  // Erreurs préfixées `variants_<i>_<champ>` pour que le client revienne à l'étape 2.
  type VariantInput = {
    attributes: Record<string, string>
    sku?: string
    price_cents_override?: number
    stock_quantity?: number
  }
  let variantInputs: VariantInput[] = []
  if (body?.variants !== undefined && body?.variants !== null) {
    if (!Array.isArray(body.variants)) {
      fieldErrors.variants = 'Les variantes doivent être une liste.'
    } else if (body.variants.length > 20) {
      fieldErrors.variants = 'Maximum 20 variantes.'
    } else {
      const cleaned: VariantInput[] = []
      for (let i = 0; i < body.variants.length; i++) {
        const raw = body.variants[i]
        const variant: VariantInput = { attributes: {} }

        // attributes : objet de paires clé/valeur (≥ 1)
        const rawAttrs = raw?.attributes
        const attrs: Record<string, string> = {}
        if (typeof rawAttrs !== 'object' || rawAttrs === null || Array.isArray(rawAttrs)) {
          fieldErrors[`variants_${i}_attributes`] = 'Ajoute au moins un attribut (ex : Taille = M).'
        } else {
          let pairCount = 0
          let attrError = false
          for (const key of Object.keys(rawAttrs)) {
            const k = typeof key === 'string' ? key.trim() : ''
            const v = typeof rawAttrs[key] === 'string' ? rawAttrs[key].trim() : ''
            if (k.length < 1 || k.length > 40) {
              fieldErrors[`variants_${i}_attributes`] = 'Chaque nom d\'attribut doit faire entre 1 et 40 caractères.'
              attrError = true
              break
            }
            if (v.length < 1 || v.length > 40) {
              fieldErrors[`variants_${i}_attributes`] = 'Chaque valeur d\'attribut doit faire entre 1 et 40 caractères.'
              attrError = true
              break
            }
            attrs[k] = v
            pairCount++
          }
          if (!attrError && pairCount < 1) {
            fieldErrors[`variants_${i}_attributes`] = 'Ajoute au moins un attribut (ex : Taille = M).'
          } else if (!attrError) {
            variant.attributes = attrs
          }
        }

        // sku? : ≤ 80 caractères
        if (raw?.sku !== undefined && raw?.sku !== null && `${raw.sku}`.length > 0) {
          const sku = typeof raw.sku === 'string' ? raw.sku.trim() : ''
          if (sku.length > 80) {
            fieldErrors[`variants_${i}_sku`] = 'Le SKU ne peut pas dépasser 80 caractères.'
          } else if (sku.length > 0) {
            variant.sku = sku
          }
        }

        // price_cents_override? : entier > 0
        if (raw?.price_cents_override !== undefined && raw?.price_cents_override !== null) {
          const po = Number(raw.price_cents_override)
          if (!Number.isInteger(po) || po <= 0) {
            fieldErrors[`variants_${i}_price_cents_override`] = 'Le prix de la variante doit être supérieur à 0.'
          } else {
            variant.price_cents_override = po
          }
        }

        // stock_quantity? : entier ≥ 0
        if (raw?.stock_quantity !== undefined && raw?.stock_quantity !== null) {
          const sq = Number(raw.stock_quantity)
          if (!Number.isInteger(sq) || sq < 0) {
            fieldErrors[`variants_${i}_stock_quantity`] = 'Le stock de la variante doit être un entier positif ou nul.'
          } else {
            variant.stock_quantity = sq
          }
        }

        cleaned.push(variant)
      }
      // On ne conserve les variantes que si aucune erreur de variante n'a été levée.
      const hasVariantError = Object.keys(fieldErrors).some((k) => k.startsWith('variants'))
      if (!hasVariantError) variantInputs = cleaned
    }
  }

  // --- Statut ---
  const status = body?.status === 'published' ? 'published' : 'draft'

  // --- Champs conditionnels par type ---
  let digitalFields: {
    digital_file_id: string
    digital_file_format: string
  } | null = null
  let physicalFields: {
    physical_condition: string
    physical_pickup_location: string | null
    physical_stock_quantity: number
    pickup_enabled: boolean
    delivery_enabled: boolean
  } | null = null

  if (type === 'digital') {
    // Le fichier vient du catalogue entity_files (upload direct ou fichier
    // réutilisé). RLS owner-only sur entity_files : un id valide mais
    // appartenant à un autre vendeur ressort en null → "Fichier introuvable."
    const fileId = typeof body?.digital_file_id === 'string' ? body.digital_file_id.trim() : ''
    let fileName: string | null = null
    if (fileId.length < 1) {
      fieldErrors.digital_file_id = 'Choisis ou téléverse un fichier.'
    } else {
      try {
        const entityFile = await getEntityFileById(authClient, fileId)
        if (!entityFile || entityFile.entity_id !== entity.id) {
          fieldErrors.digital_file_id = 'Fichier introuvable.'
        } else {
          fileName = entityFile.name
        }
      } catch (err) {
        console.error('[api/products] getEntityFileById', err)
        return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la vérification du fichier.' }), { status: 500 })
      }
    }

    // digital_license dépréciée : plus saisie dans le formulaire (custom_details
    // la remplace). La colonne reste lisible pour les anciens produits.
    if (!fieldErrors.digital_file_id && fileName) {
      digitalFields = {
        digital_file_id: fileId,
        // Le format n'est plus saisi : déduit de l'extension du fichier.
        digital_file_format: digitalFormatFromName(fileName),
      }
    }
  } else {
    const condition = body?.physical_condition
    if (!PHYSICAL_CONDITIONS.includes(condition)) {
      fieldErrors.physical_condition = 'État invalide.'
    }

    // Modes de remise cumulables : au moins un actif (miroir du CHECK DB).
    const pickupEnabled = body?.pickup_enabled === true
    const deliveryEnabled = body?.delivery_enabled === true
    if (!pickupEnabled && !deliveryEnabled) {
      fieldErrors.pickup_enabled = 'Active au moins un mode de remise (retrait ou livraison).'
    }

    // Lieu de retrait : requis seulement si pickup actif, sinon ignoré → null.
    let pickupLocation: string | null = null
    if (pickupEnabled) {
      const loc = typeof body?.physical_pickup_location === 'string'
        ? body.physical_pickup_location.trim()
        : ''
      if (loc.length < 1) {
        fieldErrors.physical_pickup_location = 'Le lieu de retrait est obligatoire si le retrait est actif.'
      } else if (loc.length > 200) {
        fieldErrors.physical_pickup_location = 'Le lieu de retrait ne peut pas dépasser 200 caractères.'
      } else {
        pickupLocation = loc
      }
    }

    let stockQuantity = Number(body?.physical_stock_quantity)
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      stockQuantity = 1
    }

    if (
      !fieldErrors.physical_condition &&
      !fieldErrors.physical_pickup_location &&
      !fieldErrors.pickup_enabled
    ) {
      physicalFields = {
        physical_condition: condition,
        physical_pickup_location: pickupLocation,
        physical_stock_quantity: stockQuantity,
        pickup_enabled: pickupEnabled,
        delivery_enabled: deliveryEnabled,
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return new Response(JSON.stringify({ success: false, error: 'Données invalides.', fieldErrors }), { status: 400 })
  }

  // --- Résolution catégorie (après gate de validation) ---
  // category_id : doit appartenir à l'entity (vérif via helper, jamais de
  // from('entity_product_categories') direct dans apps/).
  // new_category_name : création/réutilisation via getOrCreateProductCategory.
  let resolvedCategoryId: string | null = null
  if (categoryIdInput) {
    try {
      const categories = await listProductCategories(authClient, entity.id)
      const owned = categories.some((c) => c.id === categoryIdInput)
      if (!owned) {
        return new Response(
          JSON.stringify({ success: false, error: 'Données invalides.', fieldErrors: { category_id: 'Catégorie introuvable.' } }),
          { status: 400 }
        )
      }
      resolvedCategoryId = categoryIdInput
    } catch (err) {
      console.error('[api/products] listProductCategories', err)
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la vérification de la catégorie.' }), { status: 500 })
    }
  } else if (newCategoryName) {
    try {
      const cat = await getOrCreateProductCategory(authClient, entity.id, newCategoryName)
      resolvedCategoryId = cat.id
    } catch (err) {
      console.error('[api/products] getOrCreateProductCategory', err)
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la création de la catégorie.' }), { status: 500 })
    }
  }

  // --- Slug auto depuis le titre, fallback si vide ---
  const baseSlug = slugify(title) || 'produit'

  // Payload commun + champs discriminés (l'autre type reste null pour les CHECK)
  // Note V2 : description_long et category (texte) sont dépréciées — on ne les
  // écrit plus (category est nullable DEFAULT '' en base, description_long nullable).
  const common = {
    entity_id: entity.id,
    type: type as 'digital' | 'physical',
    title,
    description_short: descriptionShort,
    price_cents: priceCents,
    currency: 'EUR',
    status: status as 'draft' | 'published',
    // V2 : points, promo, catégorie, blocs, FAQ, détails personnalisés
    bullet_points: bulletPoints,
    sale_price_cents: salePriceCents,
    sale_ends_at: saleEndsAt,
    category_id: resolvedCategoryId,
    content_blocks: contentBlocks,
    faq: faqItems,
    custom_details: customDetails,
    // digital — digital_file_url déprécié (les nouveaux produits passent par
    // digital_file_id ; le CHECK products_digital_requires_file accepte les deux)
    // digital_license dépréciée : plus jamais écrite (custom_details la remplace)
    digital_file_url: null,
    digital_file_id: digitalFields ? digitalFields.digital_file_id : null,
    digital_file_format: (digitalFields ? digitalFields.digital_file_format : null) as never,
    digital_license: null as never,
    // physical
    physical_condition: (physicalFields ? physicalFields.physical_condition : null) as never,
    physical_pickup_location: physicalFields ? physicalFields.physical_pickup_location : null,
    physical_stock_quantity: physicalFields ? physicalFields.physical_stock_quantity : null,
    pickup_enabled: physicalFields ? physicalFields.pickup_enabled : false,
    delivery_enabled: physicalFields ? physicalFields.delivery_enabled : false,
  }

  // --- Création avec retry sur collision de slug (-2, -3, ...) ---
  let productId: string | null = null
  let lastError: unknown = null
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 76)}-${attempt + 1}`
    try {
      const product = await createProduct(authClient, { ...common, slug })
      productId = product.id
      break
    } catch (err) {
      lastError = err
      if (isUniqueViolation(err)) {
        continue // collision → on tente le suffixe suivant
      }
      console.error('[api/products] createProduct', err)
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la création du produit.' }), { status: 500 })
    }
  }

  if (!productId) {
    console.error('[api/products] slug collision exhausted', lastError)
    return new Response(
      JSON.stringify({ success: false, error: 'Impossible de générer un identifiant unique pour ce titre.', fieldErrors: { title: 'Choisis un titre légèrement différent.' } }),
      { status: 409 }
    )
  }

  // --- Médias (insérés dans l'ordre du payload) ---
  if (mediaInputs.length > 0) {
    try {
      await addProductMedia(
        authClient,
        productId,
        mediaInputs.map((m, i) => ({
          url: m.url,
          media_type: m.type, // payload {type} → colonne {media_type}
          display_order: i,
          alt_text: i === 0 ? title : null,
        }))
      )
    } catch (err) {
      // Les médias sont secondaires : on log mais on ne fait pas échouer la création.
      console.error('[api/products] addProductMedia', err)
    }
  }

  // --- Variantes (créées dans l'ordre du payload, après le produit) ---
  // Secondaires comme les médias : échec d'une variante = log + continue.
  if (variantInputs.length > 0) {
    for (const v of variantInputs) {
      try {
        await createProductVariant(authClient, productId, {
          attributes: v.attributes,
          ...(v.sku !== undefined ? { sku: v.sku } : {}),
          ...(v.price_cents_override !== undefined ? { price_cents_override: v.price_cents_override } : {}),
          ...(v.stock_quantity !== undefined ? { stock_quantity: v.stock_quantity } : {}),
        })
      } catch (err) {
        console.error('[api/products] createProductVariant', err)
      }
    }
  }

  // --- Si publié, activer la section menu "shop" (pattern menu-sections) ---
  if (status === 'published') {
    try {
      const { data: existing } = await authClient
        .from('entity_menu_sections')
        .select('id, is_active')
        .eq('entity_id', entity.id)
        .eq('type', 'shop' as never)
        .maybeSingle()

      if (!existing) {
        const { data: positions } = await authClient
          .from('entity_menu_sections')
          .select('position')
          .eq('entity_id', entity.id)
          .order('position', { ascending: false })
          .limit(1)
        const nextPosition = (positions?.[0]?.position ?? 0) + 1

        await authClient.from('entity_menu_sections').insert({
          entity_id: entity.id,
          type: 'shop' as never,
          is_active: true,
          is_configured: true,
          position: nextPosition,
        })
      } else if (!existing.is_active) {
        await authClient
          .from('entity_menu_sections')
          .update({ is_active: true })
          .eq('id', existing.id)
      }
    } catch (err) {
      console.error('[api/products] ensure shop section', err)
    }
  }

  const siteUrl = import.meta.env.SITE_URL ?? ''
  await purgeEntityCache(entity.slug, siteUrl)

  return new Response(JSON.stringify({ success: true, productId }))
}
