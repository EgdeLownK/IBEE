'use client'

import { useRef } from 'react'
import { flushSync } from 'react-dom'
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Type,
  Heading,
  List,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadProductMediaAction } from '@/app/dashboard/site/product-actions'
import { ProductImageBlockEditor } from '../ProductImageBlockEditor'
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

  function moveBlock(index: number, dir: -1 | 1) {
    if (index + dir < 0 || index + dir >= form.contentBlocks.length) return
    const arr = [...form.contentBlocks]
    const temp = arr[index]
    arr[index] = arr[index + dir]
    arr[index + dir] = temp
    onChange({ contentBlocks: arr })
  }

  function err(field: string) {
    return form.fieldErrors[field]
  }

  function addTextBlock() {
    if (form.contentBlocks.length >= 20) return
    const id = nextId('blk')
    onChange({
      contentBlocks: [...form.contentBlocks, { id, type: 'text', content: '' }],
    })
  }

  function addTitleBlock() {
    if (form.contentBlocks.length >= 20) return
    const id = nextId('blk')
    onChange({
      contentBlocks: [...form.contentBlocks, { id, type: 'title', content: '' }],
    })
  }

  function addListBlock() {
    if (form.contentBlocks.length >= 20) return
    const id = nextId('blk')
    onChange({
      contentBlocks: [...form.contentBlocks, { id, type: 'list', items: [''] }],
    })
  }

  function addImageBlock() {
    if (form.contentBlocks.length >= 20) return
    const id = nextId('blk')
    onChange({
      contentBlocks: [
        ...form.contentBlocks,
        {
          id,
          type: 'image',
          slot_count: 1,
          images: [null],
          title: '',
          description: '',
          uploading: false,
        },
      ],
    })
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
        {form.contentBlocks.map((b, i) => (
          <div key={b.id} className="pco__block-card">
            <div className="pco__block-head">
              <span className="pco__block-tag">
                {b.type === 'text'
                  ? 'Texte'
                  : b.type === 'title'
                    ? 'Titre'
                    : b.type === 'list'
                      ? 'Liste'
                      : 'Image'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="pco__icon-btn"
                  disabled={i === 0}
                  onClick={() => moveBlock(i, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="pco__icon-btn"
                  disabled={i === form.contentBlocks.length - 1}
                  onClick={() => moveBlock(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="pco__icon-btn text-red-500 hover:text-red-600 hover:bg-red-50"
                  aria-label="Supprimer"
                  onClick={() =>
                    onChange({ contentBlocks: form.contentBlocks.filter((x) => x.id !== b.id) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
                    x.id === b.id && x.type === 'text' ? { ...x, content: e.target.value } : x,
                  )
                  onChange({ contentBlocks })
                }}
              />
            ) : b.type === 'title' ? (
              <input
                type="text"
                className="pco__input font-semibold text-lg"
                maxLength={100}
                placeholder="Titre de section"
                value={b.content}
                onChange={(e) => {
                  const contentBlocks = form.contentBlocks.map((x) =>
                    x.id === b.id && x.type === 'title' ? { ...x, content: e.target.value } : x,
                  )
                  onChange({ contentBlocks })
                }}
              />
            ) : b.type === 'list' ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  className="pco__input mb-2"
                  placeholder="Description de la liste (optionnelle)"
                  value={b.description || ''}
                  onChange={(e) => {
                    const contentBlocks = form.contentBlocks.map((x) =>
                      x.id === b.id && x.type === 'list'
                        ? { ...x, description: e.target.value }
                        : x,
                    )
                    onChange({ contentBlocks })
                  }}
                />
                {b.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-neutral-800 shrink-0" />
                    <textarea
                      className="pco__input flex-1 min-h-[40px] resize-none"
                      rows={1}
                      maxLength={500}
                      placeholder="Élément de la liste"
                      value={item}
                      onChange={(e) => {
                        const contentBlocks = form.contentBlocks.map((x) => {
                          if (x.id === b.id && x.type === 'list') {
                            const newItems = [...x.items]
                            newItems[i] = e.target.value
                            return { ...x, items: newItems }
                          }
                          return x
                        })
                        onChange({ contentBlocks })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const contentBlocks = form.contentBlocks.map((x) => {
                            if (x.id === b.id && x.type === 'list') {
                              const newItems = [...x.items]
                              newItems.splice(i + 1, 0, '')
                              return { ...x, items: newItems }
                            }
                            return x
                          })
                          onChange({ contentBlocks })
                        } else if (e.key === 'Backspace' && item === '' && b.items.length > 1) {
                          e.preventDefault()
                          const contentBlocks = form.contentBlocks.map((x) => {
                            if (x.id === b.id && x.type === 'list') {
                              const newItems = [...x.items]
                              newItems.splice(i, 1)
                              return { ...x, items: newItems }
                            }
                            return x
                          })
                          onChange({ contentBlocks })
                        }
                      }}
                    />
                    {b.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const contentBlocks = form.contentBlocks.map((x) => {
                            if (x.id === b.id && x.type === 'list') {
                              const newItems = [...x.items]
                              newItems.splice(i, 1)
                              return { ...x, items: newItems }
                            }
                            return x
                          })
                          onChange({ contentBlocks })
                        }}
                        className="pco__icon-btn mt-1 text-neutral-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-900 self-start mt-1 flex items-center gap-1"
                  onClick={() => {
                    const contentBlocks = form.contentBlocks.map((x) => {
                      if (x.id === b.id && x.type === 'list') {
                        return { ...x, items: [...x.items, ''] }
                      }
                      return x
                    })
                    onChange({ contentBlocks })
                  }}
                >
                  <Plus className="h-3 w-3" /> Ajouter un élément
                </button>
              </div>
            ) : b.type === 'image' ? (
              <ProductImageBlockEditor
                block={b}
                onChange={(updatedBlock) => {
                  const contentBlocks = form.contentBlocks.map((x) =>
                    x.id === b.id && x.type === 'image' ? updatedBlock : x,
                  )
                  onChange({ contentBlocks })
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="pco__block-add-row">
        <button type="button" className="pco__add-btn" onClick={addTitleBlock}>
          <Heading className="h-4 w-4" /> Titre
        </button>
        <button type="button" className="pco__add-btn" onClick={addTextBlock}>
          <Type className="h-4 w-4" /> Texte
        </button>
        <button type="button" className="pco__add-btn" onClick={addListBlock}>
          <List className="h-4 w-4" /> Liste
        </button>
        <button type="button" className="pco__add-btn" onClick={addImageBlock}>
          <ImageIcon className="h-4 w-4" /> Image
        </button>
      </div>
      {err('content_blocks') ? <p className="pco__error">{err('content_blocks')}</p> : null}
    </section>
  )
}
