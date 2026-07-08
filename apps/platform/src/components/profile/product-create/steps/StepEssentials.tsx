'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChevronLeft, ChevronRight, Crop, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import { BannerImageCropDialog } from '@/components/profile/history/BannerImageCropDialog'
import { AddressAutocomplete } from '../AddressAutocomplete'
import type { ProductCategoryOption, ProductCreateFormState } from '../types'
import { canAddMedia, nextId } from '../utils'

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
  const [activeTab, setActiveTab] = useState<'bullets' | 'details'>('bullets')

  function err(field: string) {
    return form.fieldErrors[field]
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
  }

  function addBullet() {
    if (form.bullets.length >= 8) return
    onChange({ bullets: [...form.bullets, ''] })
  }

  function addDetailCategory() {
    onChange({ customDetails: [...form.customDetails, { category: '', items: [{ label: '', value: '' }] }] })
  }

  function addDetailItem(catIndex: number) {
    const copy = [...form.customDetails]
    const cat = { ...copy[catIndex]! }
    cat.items = [...cat.items, { label: '', value: '' }]
    copy[catIndex] = cat
    onChange({ customDetails: copy })
  }

  return (
    <section className="pco__stage">
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
          Catégorie
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

      <div className="pco__field mt-6">
        <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              activeTab === 'bullets'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => setActiveTab('bullets')}
          >
            Points forts
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              activeTab === 'details'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Informations produits
          </button>
        </div>

        {activeTab === 'bullets' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-700">
                Points forts{' '}
                <span className="pco__hint">(max 8, 100 car. chacun)</span>{' '}
                <span className="pco__counter">{form.bullets.length}/8</span>
              </span>
              {form.bullets.length < 8 ? (
                <button type="button" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1" onClick={addBullet}>
                  <Plus className="h-3 w-3" /> Ajouter un point
                </button>
              ) : null}
            </div>
            <div className="pco__bullets">
              {form.bullets.map((b, i) => (
                <div key={i} className="pco__bullet-row">
                  <input
                    type="text"
                    maxLength={100}
                    className="pco__input"
                    placeholder="Ex : Livraison sous 48 h"
                    value={b}
                    onChange={(e) => {
                      const copy = [...form.bullets]
                      copy[i] = e.target.value
                      onChange({ bullets: copy })
                    }}
                  />
                  <button
                    type="button"
                    className="pco__icon-btn"
                    aria-label="Supprimer"
                    onClick={() => onChange({ bullets: form.bullets.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {err('bullet_points') ? <p className="pco__error mt-2">{err('bullet_points')}</p> : null}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-700">
                Informations produits
              </span>
              <button type="button" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1" onClick={addDetailCategory}>
                <Plus className="h-3 w-3" /> Ajouter un groupe d'informations
              </button>
            </div>
            <div className="pco__attr-pairs mt-3 flex flex-col gap-6">
              {form.customDetails.map((cat, catIndex) => (
                <div key={catIndex} className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      maxLength={40}
                      className="pco__input font-medium"
                      placeholder="Nom du groupe (ex: Spécifications)"
                      value={cat.category}
                      onChange={(e) => {
                        const copy = [...form.customDetails]
                        copy[catIndex] = { ...cat, category: e.target.value }
                        onChange({ customDetails: copy })
                      }}
                    />
                    <button
                      type="button"
                      className="pco__icon-btn bg-white"
                      aria-label="Supprimer ce groupe"
                      onClick={() =>
                        onChange({ customDetails: form.customDetails.filter((_, j) => j !== catIndex) })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 pl-4 border-l-2 border-neutral-200">
                    {cat.items.map((d, i) => (
                      <div key={i} className="pco__pair-row !mt-0">
                        <input
                          type="text"
                          maxLength={40}
                          className="pco__input bg-white"
                          placeholder="Libellé (ex: Poids)"
                          value={d.label}
                          onChange={(e) => {
                            const copy = [...form.customDetails]
                            const updatedCat = { ...cat, items: [...cat.items] }
                            updatedCat.items[i] = { ...d, label: e.target.value }
                            copy[catIndex] = updatedCat
                            onChange({ customDetails: copy })
                          }}
                        />
                        <input
                          type="text"
                          maxLength={100}
                          className="pco__input bg-white"
                          placeholder="Valeur (ex: 200g)"
                          value={d.value}
                          onChange={(e) => {
                            const copy = [...form.customDetails]
                            const updatedCat = { ...cat, items: [...cat.items] }
                            updatedCat.items[i] = { ...d, value: e.target.value }
                            copy[catIndex] = updatedCat
                            onChange({ customDetails: copy })
                          }}
                        />
                        <button
                          type="button"
                          className="pco__icon-btn bg-white"
                          aria-label="Supprimer"
                          onClick={() => {
                            const copy = [...form.customDetails]
                            const updatedCat = { ...cat, items: cat.items.filter((_, j) => j !== i) }
                            copy[catIndex] = updatedCat
                            onChange({ customDetails: copy })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button type="button" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 w-fit mt-1" onClick={() => addDetailItem(catIndex)}>
                      <Plus className="h-3 w-3" /> Ajouter une information
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {err('custom_details') ? <p className="pco__error mt-2">{err('custom_details')}</p> : null}
          </div>
        )}
      </div>

    </section>
  )
}
