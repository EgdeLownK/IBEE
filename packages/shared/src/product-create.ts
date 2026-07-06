/** Validation + payload builder — miroir ProductCreateOverlay.astro */

export const PHYSICAL_CONDITIONS = ['new', 'like_new', 'very_good', 'good', 'acceptable'] as const
export type PhysicalCondition = (typeof PHYSICAL_CONDITIONS)[number]

export type ProductMediaInput = { url: string; type: 'image' | 'video' }
export type ContentBlockInput =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt?: string }
export type FaqInput = { question: string; answer: string }
export type CustomDetailInput = { label: string; value: string; family?: string }
export type VariantInput = {
  attributes: Record<string, string>
  sku?: string
  price_cents_override?: number
  stock_quantity?: number
}

export type ProductCreateInput = {
  type: 'physical' | 'digital'
  title: string
  description_short: string
  price_cents: number
  status: 'draft' | 'published'
  bullet_points?: string[]
  sale_price_cents?: number
  sale_ends_at?: string
  category_id?: string
  new_category_name?: string
  media?: ProductMediaInput[]
  content_blocks?: ContentBlockInput[]
  faq?: FaqInput[]
  custom_details?: CustomDetailInput[]
  digital_file_id?: string
  digital_stock_quantity?: number
  digital_stock_unlimited?: boolean
  physical_condition?: string
  physical_pickup_location?: string
  physical_stock_quantity?: number
  pickup_enabled?: boolean
  delivery_enabled?: boolean
  variants?: VariantInput[]
}

export type ProductCreateDraft = {
  type: 'physical' | 'digital'
  title: string
  descriptionShort: string
  bullets: string[]
  price: string
  promoEnabled: boolean
  salePrice: string
  saleEndsAt: string
  categoryId: string
  newCategoryName: string
  media: { url: string; type: 'image' | 'video'; uploading: boolean }[]
  pickupEnabled: boolean
  deliveryEnabled: boolean
  physicalPickupLocation: string
  physicalStockQuantity: string
  physicalCondition: string
  variants: {
    pairs: { key: string; value: string }[]
    sku: string
    price: string
    stock: string
  }[]
  digitalFileId: string | null
  digitalFileUploading: boolean
  digitalStockUnlimited: boolean
  customDetails: { label: string; value: string }[]
  contentBlocks: (
    | { type: 'text'; content: string }
    | { type: 'image'; url: string; uploading: boolean }
  )[]
  faq: { question: string; answer: string }[]
  publish: boolean
}

export type ValidationResult = {
  ok: boolean
  fieldErrors: Record<string, string>
}

export function priceToCents(raw: string | number | null | undefined): number | null {
  if (raw === '' || raw === null || raw === undefined) return null
  const n = Number(String(raw).replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

export function validateProductStep(step: 1 | 2 | 3 | 4, draft: ProductCreateDraft): ValidationResult {
  const fieldErrors: Record<string, string> = {}
  const fail = (field: string, msg: string) => {
    fieldErrors[field] = msg
  }

  if (step === 1) {
    if (draft.media.some((m) => m.uploading)) {
      fail('media', "Patiente, un média est en cours d'envoi.")
    }
    const title = draft.title.trim()
    if (title.length < 1) fail('title', 'Le titre est obligatoire.')
    else if (title.length > 100) fail('title', 'Maximum 100 caractères.')

    const ds = draft.descriptionShort.trim()
    if (ds.length < 1) fail('description_short', 'La description courte est obligatoire.')
    else if (ds.length > 160) fail('description_short', 'Maximum 160 caractères.')

    for (const b of draft.bullets) {
      const t = b.trim()
      if (t.length < 1 || t.length > 100) {
        fail('bullet_points', 'Chaque point doit faire entre 1 et 100 caractères.')
        break
      }
    }
    if (draft.bullets.length > 8) fail('bullet_points', 'Maximum 8 points.')

    if (draft.categoryId === '__new__') {
      const nn = draft.newCategoryName.trim()
      if (nn.length < 1 || nn.length > 60) {
        fail('new_category_name', 'Le nom doit faire entre 1 et 60 caractères.')
      }
    }

    if (draft.type === 'physical') {
      if (!draft.pickupEnabled && !draft.deliveryEnabled) {
        fail('pickup_enabled', 'Active au moins un mode de remise.')
      }
      if (draft.pickupEnabled) {
        const loc = draft.physicalPickupLocation.trim()
        if (loc.length < 1) fail('physical_pickup_location', 'Le lieu de retrait est obligatoire.')
        else if (loc.length > 200) fail('physical_pickup_location', 'Maximum 200 caractères.')
      }
    }
  }

  if (step === 2) {
    if (draft.type === 'digital') {
      if (draft.digitalFileUploading) {
        fail('digital_file_id', "Patiente, le fichier est en cours d'envoi.")
      }
      if (!draft.digitalFileId) {
        fail('digital_file_id', 'Choisis ou téléverse un fichier.')
      }
      if (!draft.digitalStockUnlimited) {
        const stock = draft.physicalStockQuantity
        const sn = Number(stock)
        if (stock === '' || !Number.isInteger(sn) || sn < 0) {
          fail('digital_stock_quantity', 'Indique une quantité disponible (entier ≥ 0).')
        }
      }
      if (draft.customDetails.length > 8) fail('custom_details', 'Maximum 8 détails.')
      let totalDetails = 0
      for (const d of draft.customDetails) {
        const l = d.label.trim()
        const v = d.value.trim()
        if (l === '' && v === '') continue
        if (l.length < 1 || l.length > 40 || v.length < 1 || v.length > 100) {
          fail('custom_details', 'Chaque détail : libellé 1-40 caractères, valeur 1-100 caractères.')
          break
        }
        totalDetails++
      }
      if (totalDetails > 30) fail('custom_details', 'Maximum 30 détails au total.')
    } else {
      const stock = draft.physicalStockQuantity
      const sn = Number(stock)
      if (stock !== '' && (!Number.isInteger(sn) || sn < 0)) {
        fail('physical_stock_quantity', 'Le stock doit être un entier positif ou nul.')
      }
      if (draft.variants.length > 20) fail('variants', 'Maximum 20 variantes.')
      draft.variants.forEach((v, i) => {
        let pairCount = 0
        for (const p of v.pairs) {
          const k = p.key.trim()
          const val = p.value.trim()
          if (k === '' && val === '') continue
          if (k.length < 1 || k.length > 40 || val.length < 1 || val.length > 40) {
            fieldErrors[`variants_${i}_attributes`] =
              'Attribut/valeur : 1 à 40 caractères chacun.'
            return
          }
          pairCount++
        }
        if (fieldErrors[`variants_${i}_attributes`]) return
        if (pairCount < 1) {
          fieldErrors[`variants_${i}_attributes`] = 'Ajoute au moins un attribut (ex : Taille = M).'
          return
        }
        if (v.sku.trim().length > 80) {
          fieldErrors[`variants_${i}_sku`] = 'Le SKU ne peut pas dépasser 80 caractères.'
          return
        }
        if (v.price !== '') {
          const pc = priceToCents(v.price)
          if (!(Number.isInteger(pc) && pc! > 0)) {
            fieldErrors[`variants_${i}_price_cents_override`] =
              'Le prix de la variante doit être supérieur à 0.'
          }
        }
        if (v.stock !== '') {
          const sq = Number(v.stock)
          if (!Number.isInteger(sq) || sq < 0) {
            fieldErrors[`variants_${i}_stock_quantity`] =
              'Le stock doit être un entier positif ou nul.'
          }
        }
      })
    }
  }

  if (step === 3) {
    if (draft.contentBlocks.some((b) => b.type === 'image' && b.uploading)) {
      fail('content_blocks', "Patiente, une image est en cours d'envoi.")
    }
    if (draft.contentBlocks.length > 20) fail('content_blocks', 'Maximum 20 blocs.')
    for (const b of draft.contentBlocks) {
      if (b.type === 'text') {
        const c = b.content.trim()
        if (c.length < 1 || c.length > 2000) {
          fail('content_blocks', 'Chaque bloc texte doit faire entre 1 et 2000 caractères.')
          break
        }
      } else if (!b.url) {
        fail('content_blocks', 'Chaque bloc image doit contenir une image envoyée.')
        break
      }
    }
  }

  if (step === 4) {
    if (draft.faq.length > 10) fail('faq', 'Maximum 10 questions.')
    for (const f of draft.faq) {
      const q = f.question.trim()
      const a = f.answer.trim()
      if (q === '' && a === '') continue
      if (q.length < 1 || q.length > 100 || a.length < 1 || a.length > 1000) {
        fail('faq', 'Chaque question (1-100 car.) et réponse (1-1000 car.) doit être valide.')
        break
      }
    }
  }

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors }
}

export function buildProductCreatePayload(draft: ProductCreateDraft): ProductCreateInput {
  let basePrice = priceToCents(draft.price)
  if (basePrice === null || Number.isNaN(basePrice)) {
    if (draft.variants && draft.variants.length > 0) {
      const prices = draft.variants.map(v => priceToCents(v.price)).filter(p => p !== null && !Number.isNaN(p)) as number[]
      basePrice = prices.length > 0 ? Math.min(...prices) : 0
    } else {
      basePrice = 0
    }
  }

  const payload: ProductCreateInput = {
    type: draft.type,
    title: draft.title.trim(),
    description_short: draft.descriptionShort.trim(),
    price_cents: basePrice,
    status: draft.publish ? 'published' : 'draft',
  }

  const bullets = draft.bullets.map((b) => b.trim()).filter((b) => b.length > 0)
  if (bullets.length > 0) payload.bullet_points = bullets

  if (draft.promoEnabled) {
    const sp = priceToCents(draft.salePrice)
    if (sp !== null) payload.sale_price_cents = sp
    if (draft.saleEndsAt) {
      const d = new Date(draft.saleEndsAt)
      if (!Number.isNaN(d.getTime())) payload.sale_ends_at = d.toISOString()
    }
  }

  if (draft.categoryId === '__new__') {
    const nn = draft.newCategoryName.trim()
    if (nn.length > 0) payload.new_category_name = nn
  } else if (draft.categoryId) {
    payload.category_id = draft.categoryId
  }

  const media = draft.media.filter((m) => m.url).map((m) => ({ url: m.url, type: m.type }))
  if (media.length > 0) payload.media = media

  const blocks: ContentBlockInput[] = []
  for (const b of draft.contentBlocks) {
    if (b.type === 'text') {
      const c = b.content.trim()
      if (c.length > 0) blocks.push({ type: 'text', content: c })
    } else if (b.url) {
      blocks.push({ type: 'image', url: b.url })
    }
  }
  if (blocks.length > 0) payload.content_blocks = blocks

  const faq: FaqInput[] = []
  for (const item of draft.faq) {
    const q = item.question.trim()
    const a = item.answer.trim()
    if (q.length > 0 && a.length > 0) faq.push({ question: q, answer: a })
  }
  if (faq.length > 0) payload.faq = faq

  if (draft.type === 'digital') {
    payload.digital_stock_unlimited = draft.digitalStockUnlimited
    if (!draft.digitalStockUnlimited) {
      const sn = Number(draft.physicalStockQuantity)
      if (Number.isInteger(sn) && sn >= 0) payload.digital_stock_quantity = sn
    }
    if (draft.digitalFileId) payload.digital_file_id = draft.digitalFileId
    const details: CustomDetailInput[] = []
    for (const d of draft.customDetails) {
      const l = d.label.trim()
      const v = d.value.trim()
      if (l.length > 0 && v.length > 0) details.push({ label: l, value: v })
    }
    if (details.length > 0) payload.custom_details = details
  } else {
    payload.physical_condition = draft.physicalCondition
    payload.pickup_enabled = draft.pickupEnabled
    payload.delivery_enabled = draft.deliveryEnabled
    if (draft.pickupEnabled) {
      payload.physical_pickup_location = draft.physicalPickupLocation.trim()
    }
    const sn = Number(draft.physicalStockQuantity)
    if (Number.isInteger(sn) && sn >= 0) payload.physical_stock_quantity = sn

    const variants: VariantInput[] = []
    for (const v of draft.variants) {
      const attributes: Record<string, string> = {}
      for (const p of v.pairs) {
        const k = p.key.trim()
        const val = p.value.trim()
        if (k.length > 0 && val.length > 0) attributes[k] = val
      }
      if (Object.keys(attributes).length === 0) continue
      const out: VariantInput = { attributes }
      if (v.sku.trim()) out.sku = v.sku.trim()
      const pc = priceToCents(v.price)
      if (pc !== null) out.price_cents_override = pc
      if (v.stock !== '') {
        const sq = Number(v.stock)
        if (Number.isInteger(sq) && sq >= 0) out.stock_quantity = sq
      }
      variants.push(out)
    }
    if (variants.length > 0) payload.variants = variants
  }

  return payload
}

export function stepForField(field: string): 1 | 2 | 3 {
  if (
    field === 'physical_stock_quantity' ||
    field === 'digital_stock_quantity' ||
    field === 'physical_condition' ||
    field === 'variants' ||
    field.startsWith('variants_') ||
    field === 'digital_file_id' ||
    field === 'custom_details'
  ) {
    return 2
  }
  if (field === 'content_blocks' || field === 'faq') return 3
  return 1
}
