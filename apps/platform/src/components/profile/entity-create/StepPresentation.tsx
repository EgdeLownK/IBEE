'use client'

import { useRef } from 'react'
import { flushSync } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import type { ContentBlockItem, GalleryImageItem, PresentationFields } from './shared'
import { nextId } from './shared'

type Props = {
  fields: PresentationFields
  publishChecked: boolean
  publishLabel: string
  publishHint: string
  faqHint?: string
  onChange: (patch: Partial<PresentationFields>) => void
  updateGallery: (fn: (prev: GalleryImageItem[]) => GalleryImageItem[]) => void
  updateBlocks: (fn: (prev: ContentBlockItem[]) => ContentBlockItem[]) => void
  onPublishChange: (checked: boolean) => void
}

export function StepPresentation({
  fields,
  publishChecked,
  publishLabel,
  publishHint,
  faqHint = 'questions fréquentes',
  onChange,
  updateGallery,
  updateBlocks,
  onPublishChange,
}: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const blockImageInputRef = useRef<HTMLInputElement>(null)
  const pendingBlockIdRef = useRef<string | null>(null)

  function err(field: string) {
    return fields.fieldErrors[field]
  }

  function addHighlight() {
    if (fields.highlights.length >= 4) return
    onChange({ highlights: [...fields.highlights, ''] })
  }

  async function handleGalleryFile(file: File) {
    if (fields.galleryImages.length >= 6) return
    const id = nextId('g')
    const previewUrl = URL.createObjectURL(file)
    let accepted = false

    flushSync(() => {
      updateGallery((prev) => {
        if (prev.length >= 6) return prev
        accepted = true
        return [...prev, { id, url: '', previewUrl, uploading: true }]
      })
    })

    if (!accepted) {
      URL.revokeObjectURL(previewUrl)
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    try {
      const result = await uploadProductMediaAction(fd)
      updateGallery((prev) =>
        prev
          .map((g) => {
            if (g.id !== id) return g
            if (result.ok) return { ...g, url: result.url, uploading: false }
            URL.revokeObjectURL(previewUrl)
            toast.error(result.error)
            return null
          })
          .filter(Boolean) as GalleryImageItem[]
      )
    } catch {
      URL.revokeObjectURL(previewUrl)
      toast.error("Erreur réseau lors de l'envoi de l'image.")
      updateGallery((prev) => prev.filter((g) => g.id !== id))
    }
  }

  function moveGallery(id: string, delta: number) {
    updateGallery((prev) => {
      const idx = prev.findIndex((g) => g.id === id)
      if (idx < 0) return prev
      const target = idx + delta
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target]!, copy[idx]!]
      return copy
    })
  }

  function removeGallery(id: string) {
    updateGallery((prev) => {
      const item = prev.find((g) => g.id === id)
      if (item?.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(item.previewUrl)
        } catch {
          /* ignore */
        }
      }
      return prev.filter((g) => g.id !== id)
    })
  }

  function addTextBlock() {
    if (fields.contentBlocks.length >= 20) return
    onChange({
      contentBlocks: [...fields.contentBlocks, { id: nextId('b'), type: 'text', content: '' }],
    })
  }

  function triggerImageBlock() {
    if (fields.contentBlocks.length >= 20) return
    pendingBlockIdRef.current = nextId('b')
    blockImageInputRef.current?.click()
  }

  async function handleBlockImage(file: File) {
    const blockId = pendingBlockIdRef.current ?? nextId('b')
    pendingBlockIdRef.current = null
    const previewUrl = URL.createObjectURL(file)
    let accepted = false

    flushSync(() => {
      updateBlocks((prev) => {
        if (prev.length >= 20) return prev
        accepted = true
        return [
          ...prev,
          { id: blockId, type: 'image', url: '', previewUrl, uploading: true },
        ]
      })
    })

    if (!accepted) {
      URL.revokeObjectURL(previewUrl)
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    try {
      const result = await uploadProductMediaAction(fd)
      updateBlocks((prev) =>
        prev
          .map((b) => {
            if (b.id !== blockId || b.type !== 'image') return b
            if (result.ok) return { ...b, url: result.url, uploading: false }
            URL.revokeObjectURL(previewUrl)
            toast.error(result.error)
            return null
          })
          .filter(Boolean) as ContentBlockItem[]
      )
    } catch {
      URL.revokeObjectURL(previewUrl)
      toast.error("Erreur réseau lors de l'envoi de l'image.")
      updateBlocks((prev) => prev.filter((b) => b.id !== blockId))
    }
  }

  function addFaq() {
    if (fields.faq.length >= 10) return
    onChange({ faq: [...fields.faq, { question: '', answer: '' }] })
  }

  const filledHighlights = fields.highlights.filter((h) => h.trim()).length
  const filledFaq = fields.faq.filter((f) => f.question.trim() || f.answer.trim()).length

  return (
    <section className="pco__stage">
      <div className="pco__field">
        <span className="pco__label">
          Points forts <span className="pco__hint">(max 4, 80 car. chacun)</span>{' '}
          <span className="pco__counter">{filledHighlights}/4</span>
        </span>
        <div className="pco__attr-pairs">
          {fields.highlights.map((val, i) => (
            <div key={i} className="pco__highlight-row">
              <input
                type="text"
                maxLength={80}
                className="pco__input"
                placeholder={`Point fort ${i + 1}`}
                value={val}
                onChange={(e) => {
                  const highlights = [...fields.highlights]
                  highlights[i] = e.target.value
                  onChange({ highlights })
                }}
              />
              <button
                type="button"
                className="pco__icon-btn"
                aria-label="Supprimer"
                onClick={() => onChange({ highlights: fields.highlights.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {fields.highlights.length < 4 ? (
          <button type="button" className="pco__add-btn" onClick={addHighlight}>
            <Plus className="h-4 w-4" /> Ajouter un point fort
          </button>
        ) : null}
        {err('highlights') ? <p className="pco__error">{err('highlights')}</p> : null}
      </div>

      <div className="pco__field">
        <span className="pco__label">
          Galerie <span className="pco__hint">(jusqu&apos;à 6 images, la première = couverture)</span>
        </span>
        {fields.galleryImages.length > 0 ? (
          <div className="pco__media-grid">
            {fields.galleryImages.map((g, i) => (
              <div key={g.id} className="pco__media-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.previewUrl || g.url} alt="" />
                {g.uploading ? (
                  <span className="pco__media-uploading">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : null}
                {i === 0 && !g.uploading ? <span className="pco__media-cover">Couverture</span> : null}
                {!g.uploading ? (
                  <div className="pco__media-controls">
                    <button
                      type="button"
                      className="pco__mini-btn"
                      disabled={i === 0}
                      aria-label="Déplacer avant"
                      onClick={() => moveGallery(g.id, -1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="pco__mini-btn"
                      disabled={i === fields.galleryImages.length - 1}
                      aria-label="Déplacer après"
                      onClick={() => moveGallery(g.id, 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="pco__mini-btn pco__mini-btn--danger"
                      aria-label="Supprimer"
                      onClick={() => removeGallery(g.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {fields.galleryImages.length < 6 ? (
          <label className="pco__upload">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="pco__upload-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleGalleryFile(f)
                e.target.value = ''
              }}
            />
            <span className="pco__upload-empty">
              <ImagePlus className="h-5 w-5" />
              Ajouter une image
            </span>
          </label>
        ) : null}
        {err('gallery_images') ? <p className="pco__error">{err('gallery_images')}</p> : null}
      </div>

      <span className="pco__label">
        Contenu détaillé <span className="pco__hint">(max 20 blocs)</span>
      </span>
      <div className="pco__blocks">
        {fields.contentBlocks.map((b) => (
          <div key={b.id} className="pco__block-card">
            <div className="pco__block-head">
              <span className="pco__block-tag">{b.type === 'text' ? 'Texte' : 'Image'}</span>
              <button
                type="button"
                className="pco__icon-btn"
                aria-label="Supprimer"
                onClick={() =>
                  onChange({ contentBlocks: fields.contentBlocks.filter((x) => x.id !== b.id) })
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {b.type === 'text' ? (
              <textarea
                className="pco__input"
                rows={4}
                maxLength={2000}
                placeholder="Décris en détail…"
                value={b.content}
                onChange={(e) => {
                  const contentBlocks = fields.contentBlocks.map((x) =>
                    x.id === b.id && x.type === 'text' ? { ...x, content: e.target.value } : x
                  )
                  onChange({ contentBlocks })
                }}
              />
            ) : (
              <div className="pco__block-image">
                {b.previewUrl || b.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.previewUrl || b.url} alt="" />
                ) : null}
                {b.uploading ? (
                  <span className="pco__media-uploading">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="pco__block-add-row">
        <button type="button" className="pco__add-btn" onClick={addTextBlock}>
          <Type className="h-4 w-4" /> Texte
        </button>
        <button type="button" className="pco__add-btn" onClick={triggerImageBlock}>
          <ImageIcon className="h-4 w-4" /> Image
        </button>
        <input
          ref={blockImageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleBlockImage(f)
            e.target.value = ''
          }}
        />
      </div>
      {err('content_blocks') ? <p className="pco__error">{err('content_blocks')}</p> : null}

      <div className="pco__field">
        <span className="pco__label">
          FAQ <span className="pco__hint">(max 10 — {faqHint})</span>{' '}
          <span className="pco__counter">{filledFaq}/10</span>
        </span>
        <div className="pco__attr-pairs">
          {fields.faq.map((item, i) => (
            <div key={i} className="pco__faq-row">
              <input
                type="text"
                maxLength={200}
                className="pco__input"
                placeholder="Question"
                value={item.question}
                onChange={(e) => {
                  const faq = [...fields.faq]
                  faq[i] = { ...faq[i]!, question: e.target.value }
                  onChange({ faq })
                }}
              />
              <textarea
                className="pco__input"
                rows={2}
                maxLength={1000}
                placeholder="Réponse"
                value={item.answer}
                onChange={(e) => {
                  const faq = [...fields.faq]
                  faq[i] = { ...faq[i]!, answer: e.target.value }
                  onChange({ faq })
                }}
              />
              <button
                type="button"
                className="pco__icon-btn"
                aria-label="Supprimer"
                onClick={() => onChange({ faq: fields.faq.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {fields.faq.length < 10 ? (
          <button type="button" className="pco__add-btn" onClick={addFaq}>
            <Plus className="h-4 w-4" /> Ajouter une question
          </button>
        ) : null}
        {err('faq') ? <p className="pco__error">{err('faq')}</p> : null}
      </div>

      <div className="pco__field pco__publish">
        <label className="pco__switch">
          <input
            type="checkbox"
            checked={publishChecked}
            onChange={(e) => onPublishChange(e.target.checked)}
          />
          <span className="pco__switch-track" aria-hidden="true">
            <span className="pco__switch-thumb" />
          </span>
          <span className="pco__switch-label">
            {publishLabel} <span className="pco__switch-hint">{publishHint}</span>
          </span>
        </label>
      </div>
    </section>
  )
}
