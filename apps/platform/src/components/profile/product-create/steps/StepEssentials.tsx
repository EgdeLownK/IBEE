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

      <div className="pco__field">
        <span className="pco__label">
          Points principaux{' '}
          <span className="pco__hint">(max 8, 100 car. chacun)</span>{' '}
          <span className="pco__counter">{form.bullets.length}/8</span>
        </span>
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
        {form.bullets.length < 8 ? (
          <button type="button" className="pco__add-btn" onClick={addBullet}>
            <Plus className="h-4 w-4" /> Ajouter un point
          </button>
        ) : null}
        {err('bullet_points') ? <p className="pco__error">{err('bullet_points')}</p> : null}
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

      {form.type === 'physical' ? (
        <div className="pco__conditional">
          <span className="pco__label">
            Modes de remise <span className="pco__req">*</span>
          </span>
          <label className="pco__check">
            <input
              type="checkbox"
              checked={form.pickupEnabled}
              onChange={(e) => onChange({ pickupEnabled: e.target.checked })}
            />
            <span>Click-and-collect (retrait en main propre)</span>
          </label>
          {form.pickupEnabled ? (
            <div className="pco__field pco__pickup-loc">
              <label className="pco__label" htmlFor="pco-pickup">
                Lieu de retrait <span className="pco__req">*</span>
              </label>
              <AddressAutocomplete
                id="pco-pickup"
                className="pco__input"
                placeholder="Ville, point de retrait..."
                value={form.physicalPickupLocation}
                onChange={(val) => onChange({ physicalPickupLocation: val })}
              />
              {err('physical_pickup_location') ? (
                <p className="pco__error">{err('physical_pickup_location')}</p>
              ) : null}
            </div>
          ) : null}
          <label className="pco__check">
            <input
              type="checkbox"
              checked={form.deliveryEnabled}
              onChange={(e) => onChange({ deliveryEnabled: e.target.checked })}
            />
            <span>Livraison</span>
          </label>
          {err('pickup_enabled') ? <p className="pco__error">{err('pickup_enabled')}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
