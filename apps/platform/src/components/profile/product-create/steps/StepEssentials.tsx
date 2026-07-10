'use client'

import { useRef, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { ChevronLeft, ChevronRight, Crop, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import { BannerImageCropDialog } from '@/components/profile/history/BannerImageCropDialog'
import { AddressAutocomplete } from '../AddressAutocomplete'
import { PHYSICAL_CONDITIONS } from '@ibee/shared'
import type { ProductCategoryOption, ProductCreateFormState } from '../types'
import { canAddMedia, nextId } from '../utils'

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  very_good: 'Très bon état',
  good: 'Bon état',
  acceptable: 'Correct',
}

function OptionRow({
  opt,
  index,
  onChangeName,
  onChangeValues,
}: {
  opt: { name?: string; values?: string[] }
  index: number
  onChangeName: (v: string) => void
  onChangeValues: (v: string[]) => void
}) {
  const [val, setVal] = useState('')
  const optName = opt.name || ''
  const optValues = opt.values || []

  useEffect(() => {
    if (optName === '' && optValues.length === 0) {
      setVal('')
    }
  }, [optName, optValues.length])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const v = val.trim()
      if (v && !optValues.includes(v)) {
        onChangeValues([...optValues, v])
      }
      setVal('')
    } else if (e.key === 'Backspace' && val === '' && optValues.length > 0) {
      const copy = [...optValues]
      copy.pop()
      onChangeValues(copy)
    }
  }

  function removeValue(indexToRemove: number) {
    const copy = [...optValues]
    copy.splice(indexToRemove, 1)
    onChangeValues(copy)
  }

  return (
    <div className="flex gap-3 items-start">
      <input
        type="text"
        placeholder="Nom (ex: Couleur)"
        className="pco__input flex-1"
        value={optName}
        onChange={(e) => onChangeName(e.target.value)}
      />
      <div 
        className="pco__input flex-[2] flex flex-wrap gap-1 items-center cursor-text !py-1 min-h-[38px]" 
        onClick={() => document.getElementById(`opt-input-${index}`)?.focus()}
      >
        {optValues.map((v, i) => (
          <span key={i} className="flex items-center gap-1 bg-neutral-100 text-sm px-2 py-0.5 rounded border border-neutral-200">
            {v}
            <button type="button" onClick={() => removeValue(i)} className="text-neutral-500 hover:text-neutral-900"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          id={`opt-input-${index}`}
          type="text"
          placeholder={optValues.length === 0 ? "Valeurs (ex: Rouge)" : ""}
          className="flex-1 bg-transparent border-none outline-none min-w-[80px] text-sm"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}


type Props = {
  form: ProductCreateFormState
  categories: ProductCategoryOption[]
  updateForm: (fn: (prev: ProductCreateFormState) => ProductCreateFormState) => void
  onChange: (patch: Partial<ProductCreateFormState>) => void
}

type CropRequest = { mediaId: string; url: string }

export function StepEssentials({ form, categories, updateForm, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null)

  function err(field: string) {
    return form.fieldErrors[field]
  }

  function variantErr(vi: number) {
    for (const key of Object.keys(form.fieldErrors)) {
      if (key.startsWith(`variants_${vi}_`)) {
        return "Une erreur est présente dans cette variante ou ses sous-variantes (prix, stock, sku, attribut manquant, prix remisé)."
      }
    }
    return null
  }

  function handleOptionNameChange(index: number, name: string) {
    const copy = [...form.variantOptions]
    copy[index] = { ...copy[index]!, name }
    onChange({ variantOptions: copy })
  }

  function generateVariants() {
    const maxOpts = 1
    const defaultOpts = [{ name: '', values: [] }]
    const optsToProcess = (form.variantOptions.length >= maxOpts ? form.variantOptions : defaultOpts).slice(0, maxOpts)
    
    const validOptions = optsToProcess.map((o, i) => {
      const vals = [...(o.values || [])]
      const input = document.getElementById(`opt-input-${i}`) as HTMLInputElement
      if (input && input.value.trim()) {
        const v = input.value.trim()
        if (!vals.includes(v)) vals.push(v)
      }
      return { ...o, values: vals }
    }).filter(o => o.values.length > 0)

    if (validOptions.length === 0) {
      return
    }

    let newVariantsToAdd: typeof form.variants = []

    const combine = (options: typeof validOptions, currentIndex: number): {key: string; value: string}[][] => {
      if (currentIndex === options.length) return [[]]
      const currentOpt = options[currentIndex]!
      const subsequent = combine(options, currentIndex + 1)
      const results: {key: string; value: string}[][] = []
      const keyName = currentOpt.name.trim() || 'Variante'
      for (const val of currentOpt.values) {
        for (const sub of subsequent) {
          results.push([{ key: keyName, value: val }, ...sub])
        }
      }
      return results
    }

    const combinations = combine(validOptions, 0)
    newVariantsToAdd = combinations.map((pairs) => {
      return { id: nextId('v'), pairs, sku: '', price: '', stock: '', promoEnabled: false, salePrice: '', saleEndsAt: '' }
    })
    
    // Append to existing variants, respecting max 20
    const combinedVariants = [...form.variants, ...newVariantsToAdd].slice(0, 20)

    onChange({ 
      variants: combinedVariants,
      variantOptions: [{ name: '', values: [] }] // Reset input
    })
    
    // Clear DOM inputs
    form.variantOptions.forEach((_, i) => {
      const input = document.getElementById(`opt-input-${i}`) as HTMLInputElement
      if (input) input.value = ''
    })
  }


  async function uploadOneMedia(file: File) {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)
    const id = nextId('m')
    const mediaType = isVideo ? ('video' as const) : ('image' as const)
    const previewUrl = URL.createObjectURL(file)
    let accepted = false

    flushSync(() => {
      updateForm((prev) => {
        if (prev.media.length >= 10) {
          toast.error('Maximum 10 médias.')
          return prev
        }
        if (isVideo && prev.media.some((m) => m.type === 'video')) {
          toast.error('Une seule vidéo est autorisée.')
          return prev
        }
        accepted = true
        return {
          ...prev,
          fieldErrors: { ...prev.fieldErrors, media: '' },
          media: [...prev.media, { id, type: mediaType, url: '', previewUrl, uploading: true }],
        }
      })
    })

    if (!accepted) {
      URL.revokeObjectURL(previewUrl)
      return
    }

    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadProductMediaAction(fd)

      updateForm((prev) => {
        const item = prev.media.find((m) => m.id === id)
        if (!item) return prev

        if (!result.ok) {
          toast.error(result.error)
          if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
          return {
            ...prev,
            fieldErrors: { ...prev.fieldErrors, media: result.error },
            media: prev.media.filter((m) => m.id !== id),
          }
        }

        return {
          ...prev,
          media: prev.media.map((m) =>
            m.id === id
              ? { ...m, url: result.url, type: result.type, uploading: false }
              : m
          ),
        }
      })
    } catch {
      toast.error("Erreur réseau lors de l'envoi du média.")
      updateForm((prev) => {
        const item = prev.media.find((m) => m.id === id)
        if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
        return {
          ...prev,
          fieldErrors: { ...prev.fieldErrors, media: "Erreur réseau lors de l'envoi du média." },
          media: prev.media.filter((m) => m.id !== id),
        }
      })
    }
  }

  async function handleMediaFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      await uploadOneMedia(file)
    }
  }

  function removeMedia(id: string) {
    updateForm((prev) => {
      const item = prev.media.find((m) => m.id === id)
      if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
      return { ...prev, media: prev.media.filter((m) => m.id !== id) }
    })
  }

  function moveMedia(index: number, delta: -1 | 1) {
    updateForm((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.media.length) return prev
      const copy = [...prev.media]
      ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
      return { ...prev, media: copy }
    })
  }

  function openCrop(mediaId: string, imageUrl: string) {
    if (!imageUrl) return
    setCropRequest({ mediaId, url: imageUrl })
  }

  async function handleCropComplete(result: { blob: Blob; aspect_ratio: number }) {
    if (!cropRequest) return
    const { mediaId } = cropRequest
    setCropRequest(null)

    updateForm((prev) => ({
      ...prev,
      media: prev.media.map((m) => (m.id === mediaId ? { ...m, uploading: true } : m)),
    }))

    const fd = new FormData()
    fd.append('file', result.blob, 'image.jpg')
    
    try {
      const uploadResult = await uploadProductMediaAction(fd)

      updateForm((prev) => ({
        ...prev,
        media: prev.media.map((m) => {
          if (m.id !== mediaId) return m
          if (!uploadResult.ok) {
            toast.error(uploadResult.error)
            return { ...m, uploading: false }
          }
          if (m.previewUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(m.previewUrl)
            } catch {
              /* ignore */
            }
          }
          const previewUrl = URL.createObjectURL(result.blob)
          return {
            ...m,
            type: 'image',
            url: uploadResult.url,
            previewUrl,
            uploading: false,
          }
        }),
      }))
    } catch (e) {
      console.error('Failed to upload image:', e)
      updateForm((prev) => ({
        ...prev,
        media: prev.media.map((m) => {
          if (m.id !== mediaId) return m
          return { ...m, uploading: false }
        }),
      }))
    }
  }


  return (
    <section className="pco__stage">
      <div className="pco__field border-b border-neutral-200 pb-6 mb-6">
        <span className="pco__label mb-3">Type d'article</span>
        <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${form.variationMode === 'unique' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={() => onChange({ variationMode: 'unique' })}
          >
            Article unique
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${form.variationMode === 'variants' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={() => onChange({ variationMode: 'variants' })}
          >
            Avec variantes
          </button>
        </div>
        <div className="px-1 text-sm text-neutral-500">
          {form.variationMode === 'unique' && <p>Un seul article sans variantes (ex: un livre, une oeuvre originale).</p>}
          {form.variationMode === 'variants' && <p>Un article avec un choix simple (ex: T-shirt noir décliné en différentes tailles).</p>}
        </div>
      </div>

      <div className="pco__field">
        <span className="pco__label">
          Médias{' '}
          <span className="pco__hint">
            (jusqu&apos;à 10, dont 1 vidéo max — la 1<sup>re</sup> est la couverture)
          </span>
        </span>
        {form.media.length > 0 ? (
          <div className="pco__media-grid">
            {form.media.map((m, i) => (
              <div key={m.id} className="pco__media-item">
                {m.type === 'video' ? (
                  <video src={m.previewUrl || m.url} muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.previewUrl || m.url} alt="" />
                )}
                {m.uploading ? (
                  <span className="pco__media-uploading">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : null}
                {i === 0 && !m.uploading ? (
                  <span className="pco__media-cover">Couverture</span>
                ) : m.type === 'video' ? (
                  <span className="pco__media-badge">Vidéo</span>
                ) : null}
                {!m.uploading ? (
                  <div className="pco__media-controls">
                    <button
                      type="button"
                      className="pco__mini-btn"
                      disabled={i === 0}
                      aria-label="Déplacer à gauche"
                      onClick={() => moveMedia(i, -1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="pco__mini-btn"
                      disabled={i === form.media.length - 1}
                      aria-label="Déplacer à droite"
                      onClick={() => moveMedia(i, 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    {m.type === 'image' && (m.previewUrl || m.url) ? (
                      <button
                        type="button"
                        className="pco__mini-btn"
                        aria-label="Recadrer"
                        onClick={() => openCrop(m.id, m.previewUrl || m.url)}
                      >
                        <Crop className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="pco__mini-btn pco__mini-btn--danger"
                      aria-label="Retirer"
                      onClick={() => removeMedia(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <BannerImageCropDialog
          open={cropRequest != null}
          imageUrl={cropRequest?.url ?? null}
          mode="landscape"
          fileType="image/jpeg"
          onComplete={handleCropComplete}
          onCancel={() => setCropRequest(null)}
        />
        {canAddMedia(form.media) ? (
          <label className="pco__upload">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="pco__upload-input"
              multiple
              onChange={(e) => {
                void handleMediaFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <span className="pco__upload-empty">
              <ImagePlus className="h-5 w-5" />
              Ajouter une photo ou vidéo
            </span>
          </label>
        ) : null}
        {err('media') ? (
          <p className="pco__error" role="alert">
            {err('media')}
          </p>
        ) : null}
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="pco-category-select">
          Catégorie article
        </label>
        <select
          id="pco-category-select"
          className="pco__input"
          value={form.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value, newCategoryName: '' })}
        >
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__new__">+ Nouvelle catégorie</option>
        </select>
        {form.categoryId === '__new__' ? (
          <input
            type="text"
            maxLength={60}
            className="pco__input pco__category-new"
            placeholder="Nom de la nouvelle catégorie"
            value={form.newCategoryName}
            onChange={(e) => onChange({ newCategoryName: e.target.value })}
          />
        ) : null}
        {err('category_id') ? <p className="pco__error">{err('category_id')}</p> : null}
        {err('new_category_name') ? <p className="pco__error">{err('new_category_name')}</p> : null}
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="pco-title-input">
          Titre <span className="pco__req">*</span>
        </label>
        <input
          id="pco-title-input"
          type="text"
          maxLength={100}
          className="pco__input"
          placeholder="Nom de ton produit"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {err('title') ? <p className="pco__error">{err('title')}</p> : null}
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="pco-desc-short">
          Description courte <span className="pco__req">*</span>
        </label>
        <input
          id="pco-desc-short"
          type="text"
          maxLength={160}
          className="pco__input"
          placeholder="Une phrase qui résume le produit"
          value={form.descriptionShort}
          onChange={(e) => onChange({ descriptionShort: e.target.value })}
        />
        {err('description_short') ? <p className="pco__error">{err('description_short')}</p> : null}
      </div>

      {form.variationMode === 'unique' && (
        <div className="pco__field mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="pco__label" htmlFor="pco-unique-price">Prix (€) <span className="pco__req">*</span></label>
              <input
                id="pco-unique-price"
                type="number"
                min={0}
                step={0.01}
                className="pco__input"
                placeholder="Ex: 29.99"
                value={form.price}
                onChange={(e) => onChange({ price: e.target.value })}
              />
              {err('price') ? <p className="pco__error">{err('price')}</p> : null}
            </div>
            
            <div className="flex-1">
              <label className="pco__label" htmlFor="pco-unique-stock">Stock <span className="pco__req">*</span></label>
              <input
                id="pco-unique-stock"
                type="number"
                min={0}
                step={1}
                className="pco__input"
                placeholder="Ex: 100"
                value={form.physicalStockQuantity}
                onChange={(e) => onChange({ physicalStockQuantity: e.target.value })}
              />
              {err('physical_stock_quantity') ? <p className="pco__error">{err('physical_stock_quantity')}</p> : null}
            </div>
            
            <div className="flex-1">
              <label className="pco__label" htmlFor="pco-unique-sku">SKU</label>
              <input
                id="pco-unique-sku"
                type="text"
                maxLength={80}
                className="pco__input"
                placeholder="Réf. interne"
                value={form.sku}
                onChange={(e) => onChange({ sku: e.target.value })}
              />
              {err('sku') ? <p className="pco__error">{err('sku')}</p> : null}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-neutral-200">
            <label className="pco__check">
              <input
                type="checkbox"
                checked={form.promoEnabled}
                onChange={(e) => onChange({ promoEnabled: e.target.checked })}
              />
              <span className="font-medium text-xs">Promotion</span>
            </label>
            
            {form.promoEnabled && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                <input
                  id="pco-unique-sale-price"
                  type="number"
                  min={0}
                  step={0.01}
                  className="pco__input !py-1 text-sm w-24 bg-white"
                  placeholder="Prix remisé"
                  value={form.salePrice}
                  onChange={(e) => onChange({ salePrice: e.target.value })}
                />
                <input
                  id="pco-unique-sale-ends"
                  type="date"
                  className="pco__input !py-1 text-sm w-36 bg-white"
                  value={form.saleEndsAt ? new Date(form.saleEndsAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => onChange({ saleEndsAt: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {form.variationMode === 'variants' && (
        <div className="pco__field mt-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <span className="pco__label !mb-0">Variantes</span>
            <button
              type="button"
              className="text-sm font-medium text-neutral-600 flex items-center gap-1 hover:text-neutral-900 bg-neutral-100 px-3 py-1.5 rounded-md transition-colors"
              onClick={() => {
                const id = Math.random().toString(36).slice(2)
                onChange({
                  variants: [
                    ...form.variants,
                    { id, pairs: [{ key: 'Option', value: '' }], price: '', stock: '', sku: '' }
                  ]
                })
              }}
            >
              <Plus className="h-4 w-4" /> Ajouter une variante
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {form.variants.length === 0 ? (
              <div className="text-center p-8 bg-neutral-50 rounded-lg border border-neutral-200 border-dashed text-neutral-500 text-sm">
                Aucune variante pour le moment. Cliquez sur "Ajouter une variante" pour commencer.
              </div>
            ) : (
              form.variants.map((v, i) => (
                <VariantCard key={v.id} v={v} vi={i} form={form} onChange={onChange} errorMsg={err(`variant_${i}`)} />
              ))
            )}
          </div>
          {err('variants') ? <p className="pco__error mt-2">{err('variants')}</p> : null}
        </div>
      )}

    </section>
  )
}


export function VariantCard({
  v,
  vi,
  form,
  onChange,
  errorMsg,
}: {
  v: import('../types').VariantDraft
  vi: number
  form: import('../types').ProductCreateFormState
  onChange: (u: Partial<import('../types').ProductCreateFormState>) => void
  errorMsg?: string | null
}) {

  return (
    <div className="pco__variant-card !p-3 bg-neutral-50 rounded-lg border border-neutral-200">
      <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1 font-semibold text-sm">
            <input
              type="text"
              className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none p-0.5 w-48 transition-colors text-base"
              placeholder="Ex: Rouge, Taille M..."
              value={v.pairs[0]?.value || ''}
              onChange={(e) => {
                const variants = form.variants.map((x) => {
                  if (x.id !== v.id) return x
                  const pairs = [...x.pairs]
                  if (!pairs[0]) pairs[0] = { key: 'Option', value: '' }
                  pairs[0].key = 'Option' // Ensure key is always set to Option
                  pairs[0].value = e.target.value
                  return { ...x, pairs }
                })
                onChange({ variants })
              }}
            />
          </div>
        <button
          type="button"
          className="pco__icon-btn shrink-0 text-red-500 hover:bg-red-50 ml-2"
          onClick={() => onChange({ variants: form.variants.filter((x) => x.id !== v.id) })}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="pt-2">
        <div className="flex gap-2 mb-3">
              <input
              type="number"
              min={0}
              step={0.01}
              className="pco__input !py-1.5 text-sm"
              placeholder="Prix (€)"
              value={v.price}
              onChange={(e) => {
                const variants = form.variants.map((x) =>
                  x.id === v.id ? { ...x, price: e.target.value } : x
                )
                onChange({ variants })
              }}
            />
            <input
              type="number"
              min={0}
              step={1}
              className="pco__input !py-1.5 text-sm w-20"
              placeholder="Stock"
              value={v.stock}
              onChange={(e) => {
                const variants = form.variants.map((x) =>
                  x.id === v.id ? { ...x, stock: e.target.value } : x
                )
                onChange({ variants })
              }}
            />
            <input
              type="text"
              maxLength={80}
              className="pco__input !py-1.5 text-sm"
              placeholder="SKU"
              value={v.sku}
              onChange={(e) => {
                const variants = form.variants.map((x) =>
                  x.id === v.id ? { ...x, sku: e.target.value } : x
                )
                onChange({ variants })
              }}
            />
            {form.physicalCondition !== 'new' && (
              <select
                className="pco__input !py-1.5 text-sm min-w-[120px]"
                value={v.condition || 'good'}
                onChange={(e) => {
                  const variants = form.variants.map((x) =>
                    x.id === v.id ? { ...x, condition: e.target.value } : x
                  )
                  onChange({ variants })
                }}
              >
                {PHYSICAL_CONDITIONS.filter(c => c !== 'new').map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-2 border-t border-neutral-100 pt-2">
            <label className="pco__check">
              <input
                type="checkbox"
                checked={v.promoEnabled || false}
                onChange={(e) => {
                  const variants = form.variants.map((x) =>
                    x.id === v.id ? { ...x, promoEnabled: e.target.checked } : x
                  )
                  onChange({ variants })
                }}
              />
              <span className="font-medium text-xs">Promotion</span>
            </label>
            {v.promoEnabled && (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pco__input !py-1 text-sm w-24 bg-white"
                  placeholder="Prix remisé"
                  value={v.salePrice || ''}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, salePrice: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
                <input
                  type="date"
                  className="pco__input !py-1 text-sm w-36 bg-white"
                  value={v.saleEndsAt ? new Date(v.saleEndsAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, saleEndsAt: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
              </div>
            )}
        </div>
      </div>
      {errorMsg ? <p className="pco__error mt-2">{errorMsg}</p> : null}
    </div>
  )
}
