'use client'

import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { Image as ImageIcon, Loader2, Plus, Trash2, Type } from 'lucide-react'
import { toast } from 'sonner'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import type { ProductCreateFormState } from '../types'
import { nextId } from '../utils'

type Props = {
  form: ProductCreateFormState
  updateForm: (fn: (prev: ProductCreateFormState) => ProductCreateFormState) => void
  onChange: (patch: Partial<ProductCreateFormState>) => void
}

export function StepDescription({ form, updateForm, onChange }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingImageBlockIdRef = useRef<string | null>(null)

  function err(field: string) {
    return form.fieldErrors[field]
  }

  function addTextBlock() {
    if (form.contentBlocks.length >= 20) return
    onChange({
      contentBlocks: [...form.contentBlocks, { id: nextId('b'), type: 'text', content: '' }],
    })
  }

  function triggerImageBlock() {
    if (form.contentBlocks.length >= 20) return
    pendingImageBlockIdRef.current = nextId('b')
    imageInputRef.current?.click()
  }

  async function handleImageFile(file: File) {
    const blockId = pendingImageBlockIdRef.current ?? nextId('b')
    pendingImageBlockIdRef.current = null
    const previewUrl = URL.createObjectURL(file)
    let accepted = false

    flushSync(() => {
      updateForm((prev) => {
        if (prev.contentBlocks.length >= 20) return prev
        accepted = true
        return {
          ...prev,
          contentBlocks: [
            ...prev.contentBlocks,
            { id: blockId, type: 'image', url: '', previewUrl, uploading: true },
          ],
        }
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
      updateForm((prev) => ({
        ...prev,
        contentBlocks: prev.contentBlocks
          .map((b) => {
            if (b.id !== blockId || b.type !== 'image') return b
            if (result.ok) return { ...b, url: result.url, uploading: false }
            URL.revokeObjectURL(previewUrl)
            toast.error(result.error)
            return null
          })
          .filter(Boolean) as ProductCreateFormState['contentBlocks'],
        fieldErrors: result.ok
          ? { ...prev.fieldErrors, content_blocks: '' }
          : { ...prev.fieldErrors, content_blocks: result.error },
      }))
    } catch {
      URL.revokeObjectURL(previewUrl)
      toast.error("Erreur réseau lors de l'envoi de l'image.")
      updateForm((prev) => ({
        ...prev,
        contentBlocks: prev.contentBlocks.filter((b) => b.id !== blockId),
        fieldErrors: {
          ...prev.fieldErrors,
          content_blocks: "Erreur réseau lors de l'envoi de l'image.",
        },
      }))
    }
  }

  function addFaq() {
    if (form.faq.length >= 10) return
    onChange({ faq: [...form.faq, { question: '', answer: '' }] })
  }

  const filledFaq = form.faq.filter((f) => f.question.trim() || f.answer.trim()).length

  return (
    <section className="pco__stage">
      <span className="pco__label">
        Contenu détaillé <span className="pco__hint">(max 20 blocs)</span>
      </span>
      <div className="pco__blocks">
        {form.contentBlocks.map((b) => (
          <div key={b.id} className="pco__block-card">
            <div className="pco__block-head">
              <span className="pco__block-tag">{b.type === 'text' ? 'Texte' : 'Image'}</span>
              <button
                type="button"
                className="pco__icon-btn"
                aria-label="Supprimer"
                onClick={() =>
                  onChange({ contentBlocks: form.contentBlocks.filter((x) => x.id !== b.id) })
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
                placeholder="Décris ton produit en détail…"
                value={b.content}
                onChange={(e) => {
                  const contentBlocks = form.contentBlocks.map((x) =>
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
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleImageFile(f)
            e.target.value = ''
          }}
        />
      </div>
      {err('content_blocks') ? <p className="pco__error">{err('content_blocks')}</p> : null}

      <div className="pco__field">
        <span className="pco__label">
          FAQ{' '}
          <span className="pco__hint">(max 10 — questions fréquentes de tes clients)</span>{' '}
          <span className="pco__counter">{filledFaq}/10</span>
        </span>
        <div className="pco__attr-pairs">
          {form.faq.map((item, i) => (
            <div key={i} className="pco__faq-row">
              <input
                type="text"
                maxLength={200}
                className="pco__input"
                placeholder="Question"
                value={item.question}
                onChange={(e) => {
                  const faq = [...form.faq]
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
                  const faq = [...form.faq]
                  faq[i] = { ...faq[i]!, answer: e.target.value }
                  onChange({ faq })
                }}
              />
              <button
                type="button"
                className="pco__icon-btn"
                aria-label="Supprimer"
                onClick={() => onChange({ faq: form.faq.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {form.faq.length < 10 ? (
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
            checked={form.publish}
            onChange={(e) => onChange({ publish: e.target.checked })}
          />
          <span className="pco__switch-track" aria-hidden="true">
            <span className="pco__switch-thumb" />
          </span>
          <span className="pco__switch-label">
            Publier immédiatement <span className="pco__switch-hint">(sinon brouillon)</span>
          </span>
        </label>
      </div>
    </section>
  )
}
