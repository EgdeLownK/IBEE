/** Validation + payload builder — miroir ProductCreateOverlay.astro */

export const PHYSICAL_CONDITIONS = ['new', 'like_new', 'very_good', 'good', 'acceptable'] as const
export type PhysicalCondition = (typeof PHYSICAL_CONDITIONS)[number]

export type ProductMediaInput = { url: string; type: 'image' | 'video' }
export type ContentBlockInput =
  | { type: 'text'; content: string }
  | { type: 'title'; content: string }
  | { type: 'list'; items: string[] }
  | {
      type: 'image'
      slot_count: 1 | 2 | 3
      images: { url: string; aspect_ratio: number; type: 'image' | 'video' }[]
      title?: string
      description?: string
    }
export type FaqInput = { question: string; answer: string }
export type CustomDetailInput = { label: string; value: string; family?: string }
export type VariantInput = {
  attributes: Record<string, string>
  sku?: string
  price_cents_override?: number
  stock_quantity?: number
  sale_price_cents_override?: number
  sale_ends_at?: string
}

export type ProductCreateInput = {
  type: 'physical' | 'digital'
  audience?: 'men' | 'women' | 'unisex' | null
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
  in_person_enabled?: boolean
  delivery_enabled?: boolean
  variants?: VariantInput[]
}

export type ProductCreateDraft = {
  type: 'physical' | 'digital'
  audience?: 'men' | 'women' | 'unisex' | null
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
  inPersonEnabled: boolean
  deliveryEnabled: boolean
  physicalPickupLocation: string
  physicalStockQuantity: string
  physicalCondition: string
  variationMode: 'unique' | 'variants' | 'subvariants'
  variants: {
    pairs: { key: string; value: string }[]
    sku: string
    price: string
    stock: string
    promoEnabled?: boolean
    salePrice?: string
    saleEndsAt?: string
    subVariants?: {
      key: string
      value: string
      sku: string
      price: string
      stock: string
      promoEnabled?: boolean
      salePrice?: string
      saleEndsAt?: string
    }[]
  }[]
  digitalFileId: string | null
  digitalFileUploading: boolean
  digitalStockUnlimited: boolean
  customDetails: { category: string; items: { label: string; value: string }[] }[]
  contentBlocks: (
    | { type: 'text'; content: string }
    | { type: 'title'; content: string }
    | { type: 'list'; items: string[] }
    | { 
        type: 'image'
        slot_count: 1 | 2 | 3
        images: ({ url: string; aspect_ratio: number; type: 'image' | 'video' } | null)[]
        title: string
        description: string
        uploading: boolean 
      }
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

    for (const cat of draft.customDetails) {
      if (cat.category.trim().length > 40) {
        fail('custom_details', 'Le nom du groupe ne doit pas dépasser 40 caractères.')
        break
      }
      for (const d of cat.items) {
        const l = d.label.trim()
        const v = d.value.trim()
        if (l === '' && v === '') continue
        if (l.length < 1 || l.length > 40 || v.length < 1 || v.length > 100) {
          fail('custom_details', 'Chaque détail : libellé 1-40 caractères, valeur 1-100 caractères.')
          break
        }
      }
      if (fieldErrors['custom_details']) break
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
    } else {
      if (!draft.pickupEnabled && !draft.deliveryEnabled && !draft.inPersonEnabled) {
        fail('pickup_enabled', 'Active au moins un mode de remise.')
      }
      if (draft.pickupEnabled) {
        const loc = draft.physicalPickupLocation.trim()
        if (loc.length < 1) fail('physical_pickup_location', 'Le lieu de retrait est obligatoire.')
        else if (loc.length > 200) fail('physical_pickup_location', 'Maximum 200 caractères.')
      }

      if (draft.variationMode === 'unique') {
        const stock = draft.physicalStockQuantity
        const sn = Number(stock)
        if (stock !== '' && (!Number.isInteger(sn) || sn < 0)) {
          fail('physical_stock_quantity', 'Le stock doit être un entier positif ou nul.')
        }
        const pc = priceToCents(draft.price)
        if (pc === null || pc <= 0) {
          fail('price', 'Le prix doit être supérieur à 0.')
        }
      } else {
        if (draft.variants.length > 20) fail('variants', 'Maximum 20 variantes principales.')
        if (draft.variants.length === 0) fail('variants', 'Génère au moins une variante.')
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
        if (draft.variationMode === 'subvariants') {
          const subVariants = (v as any).subVariants || []
          if (subVariants.length === 0) {
            fieldErrors[`variants_${i}_attributes`] = 'Ajoute au moins une sous-variante.'
            return
          }
          subVariants.forEach((sub: any, si: number) => {
            if (sub.price !== '') {
              const pc = priceToCents(sub.price)
              if (!(Number.isInteger(pc) && pc! > 0)) {
                fieldErrors[`variants_${i}_sub_${si}_price`] = 'Prix > 0.'
              }
            }
            if (sub.stock !== '') {
              const sq = Number(sub.stock)
              if (!Number.isInteger(sq) || sq < 0) {
                fieldErrors[`variants_${i}_sub_${si}_stock`] = 'Stock entier ≥ 0.'
              }
            }
            if (sub.promoEnabled) {
              const sp = priceToCents(sub.salePrice)
              if (sp === null) fieldErrors[`variants_${i}_sub_${si}_salePrice`] = 'Prix remisé invalide.'
            }
          })
        } else {
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
          if (v.promoEnabled) {
            const sp = priceToCents(v.salePrice)
            if (sp === null) fieldErrors[`variants_${i}_salePrice`] = 'Prix remisé invalide.'
          }
        }
      })
    }
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
      } else if (b.type === 'title') {
        const c = b.content.trim()
        if (c.length < 1 || c.length > 100) {
          fail('content_blocks', 'Chaque bloc titre doit faire entre 1 et 100 caractères.')
          break
        }
      } else if (b.type === 'list') {
        if (b.items.length === 0) {
          fail('content_blocks', 'Une liste ne peut pas être vide.')
          break
        }
        for (const item of b.items) {
          if (item.trim().length < 1) {
            fail('content_blocks', 'Un élément de liste ne peut pas être vide.')
            break
          }
        }
      } else if (b.type === 'image') {
        const slots = b.slot_count === 2 || b.slot_count === 3 ? b.slot_count : 1
        let hasImage = false
        for (let i = 0; i < slots; i++) {
          if (b.images[i]?.url) hasImage = true
        }
        if (!hasImage) {
          fail('content_blocks', 'Un bloc image doit contenir au moins une image.')
          break
        }
        if (b.title && b.title.length > 100) {
          fail('content_blocks', 'Le titre de l\'image doit faire moins de 100 caractères.')
          break
        }
        if (b.description && b.description.length > 500) {
          fail('content_blocks', 'La description de l\'image doit faire moins de 500 caractères.')
          break
        }
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
    audience: draft.audience || null,
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
    } else if (b.type === 'title') {
      const c = b.content.trim()
      if (c.length > 0) blocks.push({ type: 'title', content: c })
    } else if (b.type === 'list') {
      const items = b.items.map((i) => i.trim()).filter((i) => i.length > 0)
      if (items.length > 0) blocks.push({ type: 'list', items })
    } else if (b.type === 'image') {
      const slots = b.slot_count === 2 || b.slot_count === 3 ? b.slot_count : 1
      const validImages = []
      for (let i = 0; i < slots; i++) {
        const img = b.images[i]
        if (img?.url) validImages.push({ url: img.url, aspect_ratio: img.aspect_ratio, type: img.type })
      }
      if (validImages.length > 0) {
        blocks.push({
          type: 'image',
          slot_count: slots,
          images: validImages,
          title: b.title?.trim() || undefined,
          description: b.description?.trim() || undefined
        })
      }
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
  } else {
    payload.physical_condition = draft.physicalCondition
    payload.pickup_enabled = draft.pickupEnabled
    payload.in_person_enabled = draft.inPersonEnabled
    payload.delivery_enabled = draft.deliveryEnabled
    if (draft.pickupEnabled) {
      payload.physical_pickup_location = draft.physicalPickupLocation.trim()
    }
    const sn = Number(draft.physicalStockQuantity)
    if (draft.variationMode === 'unique') {
      if (Number.isInteger(sn) && sn >= 0) payload.physical_stock_quantity = sn
    } else {
      const variants: VariantInput[] = []
      for (const v of draft.variants) {
        const attributes: Record<string, string> = {}
        for (const p of v.pairs) {
          const k = p.key.trim()
          const val = p.value.trim()
          if (k.length > 0 && val.length > 0) attributes[k] = val
        }
        if (Object.keys(attributes).length === 0) continue

        if (draft.variationMode === 'subvariants') {
          const subVariants = (v as any).subVariants || []
          for (const sub of subVariants) {
            const subAttrs = { ...attributes }
            if (sub.key && sub.value) {
              subAttrs[sub.key] = sub.value
            }
            const out: VariantInput = { attributes: subAttrs }
            if (sub.sku?.trim()) out.sku = sub.sku.trim()
            if (sub.condition?.trim()) out.sku = out.sku ? `${out.sku} | cond:${sub.condition}` : `cond:${sub.condition}` // Temporary hack to store condition if needed
            
            const pc = priceToCents(sub.price)
            if (pc !== null) out.price_cents_override = pc
            if (sub.stock !== '') {
              const sq = Number(sub.stock)
              if (Number.isInteger(sq) && sq >= 0) out.stock_quantity = sq
            }
            if (sub.promoEnabled) {
              const sp = priceToCents(sub.salePrice)
              if (sp !== null) out.sale_price_cents_override = sp
              if (sub.saleEndsAt) {
                const d = new Date(sub.saleEndsAt)
                if (!Number.isNaN(d.getTime())) out.sale_ends_at = d.toISOString()
              }
            }
            variants.push(out)
          }
        } else {
          const out: VariantInput = { attributes }
          if (v.sku.trim()) out.sku = v.sku.trim()
          const pc = priceToCents(v.price)
          if (pc !== null) out.price_cents_override = pc
          if (v.stock !== '') {
            const sq = Number(v.stock)
            if (Number.isInteger(sq) && sq >= 0) out.stock_quantity = sq
          }
          if (v.promoEnabled) {
            const sp = priceToCents(v.salePrice)
            if (sp !== null) out.sale_price_cents_override = sp
            if (v.saleEndsAt) {
              const d = new Date(v.saleEndsAt)
              if (!Number.isNaN(d.getTime())) out.sale_ends_at = d.toISOString()
            }
          }
          variants.push(out)
        }
      }
      if (variants.length > 0) payload.variants = variants
    }
  }

  const details: CustomDetailInput[] = []
  for (const cat of draft.customDetails) {
    const family = cat.category.trim()
    for (const d of cat.items) {
      const l = d.label.trim()
      const v = d.value.trim()
      if (l.length > 0 && v.length > 0) {
        details.push({ label: l, value: v, ...(family ? { family } : {}) })
      }
    }
  }
  if (details.length > 0) payload.custom_details = details

  return payload
}

export function stepForField(field: string): 1 | 2 | 3 {
  if (
    field === 'physical_stock_quantity' ||
    field === 'digital_stock_quantity' ||
    field === 'physical_condition' ||
    field === 'pickup_enabled' ||
    field === 'in_person_enabled' ||
    field === 'delivery_enabled' ||
    field === 'physical_pickup_location' ||
    field === 'variants' ||
    field.startsWith('variants_') ||
    field === 'digital_file_id'
  ) {
    return 2
  }
  if (field === 'content_blocks' || field === 'faq') return 3
  return 1
}
