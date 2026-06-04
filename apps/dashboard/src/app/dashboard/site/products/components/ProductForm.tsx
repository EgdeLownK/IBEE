'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, FileDown, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Input, Textarea, UploadPublicationImages } from '@ibee/ui-react'
import type { ImageItem } from '@ibee/ui-react'
import { createClient } from '@/lib/supabase/client'
import {
  createProductAction,
  updateProductAction,
  saveProductMediaAction,
  type ProductInput,
} from '../actions'
import { VariantsEditor, type VariantDraft } from './VariantsEditor'

type ProductType = 'digital' | 'physical'
type ProductStatus = 'draft' | 'published' | 'archived'

const DIGITAL_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'epub', label: 'ePub' },
  { value: 'mp4', label: 'MP4 (vidéo)' },
  { value: 'mp3', label: 'MP3 (audio)' },
  { value: 'zip', label: 'ZIP' },
  { value: 'other', label: 'Autre' },
] as const

const DIGITAL_LICENSES = [
  { value: 'personal', label: 'Personnelle' },
  { value: 'professional', label: 'Professionnelle' },
  { value: 'commercial', label: 'Commerciale' },
] as const

const PHYSICAL_CONDITIONS = [
  { value: 'new', label: 'Neuf' },
  { value: 'like_new', label: 'Comme neuf' },
  { value: 'very_good', label: 'Très bon état' },
  { value: 'good', label: 'Bon état' },
  { value: 'acceptable', label: 'Correct' },
] as const

export type ProductFormInitial = {
  id: string
  type: ProductType
  title: string
  slug: string
  description_short: string
  description_long: string
  priceInput: string
  currency: string
  category: string
  tags: string[]
  status: ProductStatus
  digital_file_url: string
  digital_file_format: (typeof DIGITAL_FORMATS)[number]['value']
  digital_license: (typeof DIGITAL_LICENSES)[number]['value']
  physical_condition: (typeof PHYSICAL_CONDITIONS)[number]['value']
  physical_pickup_location: string
  stock_quantity: string
  media: { url: string }[]
  variants: VariantDraft[]
}

type Props = {
  userId: string
  mode: 'create' | 'edit'
  initial?: ProductFormInitial
}

function parsePrice(input: string): number | null {
  if (!input.trim()) return null
  const n = parseFloat(input.replace(',', '.'))
  if (isNaN(n) || n < 0) return null
  return Math.round(n * 100)
}

function sanitizePriceInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, '')
  const firstSep = cleaned.search(/[.,]/)
  if (firstSep !== -1) {
    cleaned = cleaned.slice(0, firstSep + 1) + cleaned.slice(firstSep + 1).replace(/[.,]/g, '')
  }
  return cleaned
}

export function ProductForm({ userId, mode, initial }: Props) {
  const router = useRouter()

  const [type, setType] = useState<ProductType>(initial?.type ?? 'digital')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [descShort, setDescShort] = useState(initial?.description_short ?? '')
  const [descLong, setDescLong] = useState(initial?.description_long ?? '')
  const [priceInput, setPriceInput] = useState(initial?.priceInput ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '))
  const [status, setStatus] = useState<ProductStatus>(initial?.status ?? 'draft')

  // Digital
  const [fileUrl, setFileUrl] = useState(initial?.digital_file_url ?? '')
  const [fileFormat, setFileFormat] = useState<(typeof DIGITAL_FORMATS)[number]['value']>(
    initial?.digital_file_format ?? 'pdf'
  )
  const [license, setLicense] = useState<(typeof DIGITAL_LICENSES)[number]['value']>(
    initial?.digital_license ?? 'personal'
  )

  // Physical
  const [condition, setCondition] = useState<(typeof PHYSICAL_CONDITIONS)[number]['value']>(
    initial?.physical_condition ?? 'new'
  )
  const [pickupLocation, setPickupLocation] = useState(initial?.physical_pickup_location ?? '')
  const [stock, setStock] = useState(initial?.stock_quantity ?? '0')

  const [images, setImages] = useState<ImageItem[]>(
    (initial?.media ?? []).map((m) => ({
      id: crypto.randomUUID(),
      file: new File([], 'existing'),
      previewUrl: m.url,
      uploading: false,
      uploadedUrl: m.url,
    }))
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleUpload(file: File): Promise<string> {
    const supabase = createClient()
    const batchId = crypto.randomUUID()
    const path = `${userId}/${batchId}/${file.name}`
    const { error } = await supabase.storage
      .from('publication-media')
      .upload(path, file, { contentType: 'image/webp' })
    if (error) throw error
    const { data } = supabase.storage.from('publication-media').getPublicUrl(path)
    return data.publicUrl
  }

  function buildInput(): ProductInput | null {
    const priceCents = parsePrice(priceInput)
    if (priceCents === null || priceCents <= 0) {
      setErrors({ price_cents: 'Le prix doit être supérieur à 0' })
      return null
    }
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const base = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description_short: descShort.trim(),
      description_long: descLong.trim() || undefined,
      price_cents: priceCents,
      currency: initial?.currency ?? 'EUR',
      category: category.trim() || undefined,
      tags,
      status,
    }

    if (type === 'digital') {
      return { ...base, type: 'digital', digital_file_url: fileUrl.trim(), digital_file_format: fileFormat, digital_license: license }
    }
    const stockN = parseInt(stock || '0', 10)
    return {
      ...base,
      type: 'physical',
      physical_condition: condition,
      physical_pickup_location: pickupLocation.trim(),
      stock_quantity: isNaN(stockN) ? 0 : stockN,
    }
  }

  async function handleSubmit() {
    setErrors({})

    if (images.some((i) => i.uploading)) {
      setErrors({ media: 'Attendez la fin des uploads' })
      return
    }

    const input = buildInput()
    if (!input) return

    setSubmitting(true)
    try {
      const media = images
        .filter((i) => i.uploadedUrl)
        .map((i) => ({ url: i.uploadedUrl! }))

      if (mode === 'create') {
        const result = await createProductAction(input)
        if (!result.success) {
          setErrors(result.fieldErrors ?? { _global: result.error })
          toast.error(result.error)
          return
        }
        if (result.id && media.length > 0) {
          await saveProductMediaAction({ productId: result.id, media })
        }
        toast.success('Produit créé.')
        router.push('/dashboard/site/products?toast=created')
      } else if (initial) {
        const result = await updateProductAction({ ...input, productId: initial.id })
        if (!result.success) {
          setErrors(result.fieldErrors ?? { _global: result.error })
          toast.error(result.error)
          return
        }
        await saveProductMediaAction({ productId: initial.id, media })
        toast.success('Produit mis à jour.')
        router.push('/dashboard/site/products?toast=updated')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const canSwitchType = mode === 'create'

  return (
    <div className="mx-auto max-w-[760px] px-4 py-6 md:px-8 md:py-10">
      <a
        href="/dashboard/site/products"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux produits
      </a>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
        </h1>
      </div>

      {/* Type */}
      <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">Type de produit</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['digital', 'physical'] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!canSwitchType}
              onClick={() => setType(t)}
              className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition ${
                type === t ? 'border-accent bg-accent-soft/40' : 'border-neutral-200 hover:border-neutral-400'
              } ${!canSwitchType && type !== t ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {t === 'digital' ? <FileDown className="h-5 w-5 text-accent" /> : <Package className="h-5 w-5 text-accent" />}
              <span className="text-sm font-bold text-neutral-900">
                {t === 'digital' ? 'Numérique' : 'Physique'}
              </span>
              <span className="text-xs text-neutral-500">
                {t === 'digital' ? 'Fichier téléchargeable' : 'Click & collect'}
              </span>
            </button>
          ))}
        </div>
        {!canSwitchType && (
          <p className="mt-3 text-xs text-neutral-400">Le type ne peut pas être modifié après création.</p>
        )}
      </section>

      {/* Infos générales */}
      <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">Informations</h2>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Titre</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Nom du produit" error={!!errors.title} />
            {errors.title && <p className="mt-1 text-xs text-error">{errors.title}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">
              Slug <span className="text-neutral-400">(optionnel — généré du titre)</span>
            </label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mon-produit" error={!!errors.slug} />
            {errors.slug && <p className="mt-1 text-xs text-error">{errors.slug}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Description courte</label>
            <Input value={descShort} onChange={(e) => setDescShort(e.target.value)} maxLength={160} placeholder="Une phrase d'accroche" error={!!errors.description_short} />
            {errors.description_short && <p className="mt-1 text-xs text-error">{errors.description_short}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Description longue</label>
            <Textarea value={descLong} onChange={(e) => setDescLong(e.target.value)} rows={6} maxLength={10000} placeholder="Détails du produit..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Prix (€)</label>
              <Input value={priceInput} onChange={(e) => setPriceInput(sanitizePriceInput(e.target.value))} inputMode="decimal" placeholder="29,99" error={!!errors.price_cents} />
              {errors.price_cents && <p className="mt-1 text-xs text-error">{errors.price_cents}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Catégorie</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex : E-books" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Tags (séparés par des virgules)</label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="design, template, marketing" />
          </div>
        </div>
      </section>

      {/* Champs spécifiques au type */}
      {type === 'digital' ? (
        <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">Fichier numérique</h2>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Lien du fichier</label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." error={!!errors.digital_file_url} />
              {errors.digital_file_url && <p className="mt-1 text-xs text-error">{errors.digital_file_url}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Format</label>
                <select value={fileFormat} onChange={(e) => setFileFormat(e.target.value as typeof fileFormat)} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
                  {DIGITAL_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Licence</label>
                <select value={license} onChange={(e) => setLicense(e.target.value as typeof license)} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
                  {DIGITAL_LICENSES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">Produit physique (Click & collect)</h2>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">État</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
                  {PHYSICAL_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Stock</label>
                <Input value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Lieu de retrait</label>
              <Input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="Adresse de retrait" error={!!errors.physical_pickup_location} />
              {errors.physical_pickup_location && <p className="mt-1 text-xs text-error">{errors.physical_pickup_location}</p>}
            </div>
          </div>
        </section>
      )}

      {/* Médias */}
      <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">Galerie</h2>
        <UploadPublicationImages images={images} onImagesChange={setImages} onUpload={handleUpload} />
        {errors.media && <p className="mt-2 text-xs text-error">{errors.media}</p>}
      </section>

      {/* Statut */}
      <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">Statut</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
          <option value="archived">Archivé</option>
        </select>
      </section>

      {/* Variantes (édition uniquement — nécessite un product id) */}
      {mode === 'edit' && initial && (
        <section className="mt-5 rounded-xl border border-neutral-200 bg-neutral-0 p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">Variantes</h2>
          <VariantsEditor productId={initial.id} initialVariants={initial.variants} />
        </section>
      )}

      {errors._global && <p className="mt-5 text-sm text-error">{errors._global}</p>}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-cta-primary px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cta-primary-hover disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {submitting ? 'Enregistrement...' : mode === 'create' ? 'Créer le produit' : 'Enregistrer'}
        </button>
        <a href="/dashboard/site/products" className="rounded-lg px-5 py-3 text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600">
          Annuler
        </a>
      </div>

      <div className="h-12" />
    </div>
  )
}
