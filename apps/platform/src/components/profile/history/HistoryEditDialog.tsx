'use client'

import { useEffect, useState, useTransition, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, Trash2, Type, X, List } from 'lucide-react'
import { toast } from 'sonner'
import type { HistoryBlock } from '@ibee/shared'
import { HISTORY_MAX_BLOCKS, HISTORY_TEXT_MAX } from '@ibee/shared'
import { saveHistoryBlocksAction } from '@/app/dashboard/site/history-actions'
import { HistoryImageBlockEditor } from './HistoryImageBlockEditor'
import {
  draftBlocksFromInitial,
  nextBlockId,
  serializeDraftBlocks,
  type DraftBlock,
} from './history-edit-utils'

interface Props {
  open: boolean
  initialBlocks: HistoryBlock[]
  returnToAddContent?: boolean
  onClose: () => void
  onSaved: (blocks: HistoryBlock[]) => void
  onReturnToAddContent?: () => void
}

export function HistoryEditDialog({
  open,
  initialBlocks,
  returnToAddContent = false,
  onClose,
  onSaved,
  onReturnToAddContent,
}: Props) {
  const [blocks, setBlocks] = useState<DraftBlock[]>([])
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setBlocks(draftBlocksFromInitial(initialBlocks))
      setError('')
    }
  }, [open, initialBlocks])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  function handleClose() {
    if (returnToAddContent) {
      onClose()
      onReturnToAddContent?.()
      return
    }
    onClose()
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= blocks.length) return
    setBlocks((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
      return copy
    })
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  function addTextBlock() {
    if (blocks.length >= HISTORY_MAX_BLOCKS) {
      setError(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
      return
    }
    setBlocks((prev) => [...prev, { id: nextBlockId(), type: 'text', content: '' }])
  }

  function addImageBlock() {
    if (blocks.length >= HISTORY_MAX_BLOCKS) {
      setError(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
      return
    }
    setBlocks((prev) => [
      ...prev,
      {
        id: nextBlockId(),
        type: 'image',
        slot_count: 1,
        images: [],
        title: '',
        description: '',
        uploading: false,
      },
    ])
  }

  function addListBlock() {
    if (blocks.length >= HISTORY_MAX_BLOCKS) {
      setError(`Maximum ${HISTORY_MAX_BLOCKS} blocs.`)
      return
    }
    setBlocks((prev) => [...prev, { id: nextBlockId(), type: 'list', items: [{ id: nextBlockId(), value: '' }] }])
  }

  function updateBlock(index: number, block: DraftBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (blocks.some((b) => b.type === 'image' && b.uploading)) {
      setError('Patiente, une image est en cours d\'envoi.')
      return
    }

    let payload: HistoryBlock[]
    try {
      payload = serializeDraftBlocks(blocks)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Blocs invalides.'
      setError(msg)
      return
    }

    startTransition(async () => {
      const result = await saveHistoryBlocksAction(payload)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      onSaved(result.blocks)
      toast.success('Histoire enregistrée')
      if (returnToAddContent) {
        onClose()
        onReturnToAddContent?.()
      } else {
        onClose()
      }
    })
  }

  const cancelLabel = returnToAddContent ? 'Retour' : 'Annuler'

  return createPortal(
    <div className="hist-edit" role="presentation">
      <button type="button" className="hist-edit__backdrop" aria-label="Fermer" onClick={handleClose} />
      <div
        className="hist-edit__panel"
        role="dialog"
        aria-labelledby="hist-edit-title"
        aria-modal="true"
      >
        <header className="hist-edit__head">
          <div className="hist-edit__head-text">
            <p className="hist-edit__eyebrow">Menu Histoire</p>
            <h2 id="hist-edit-title" className="hist-edit__title">
              Composer ton récit
            </h2>
            <p className="hist-edit__hint">Alterne texte et visuels. Utilise les flèches pour réordonner.</p>
          </div>
          <button type="button" className="hist-edit__close" aria-label="Fermer" onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <form className="hist-edit__form" onSubmit={handleSubmit}>
          <div className="hist-edit__scroll">
            <div className="hist-edit__canvas">
              {blocks.length === 0 ? (
                <div className="hist-edit__empty">
                  <div className="hist-edit__empty-icon" aria-hidden="true">
                    <Type className="h-7 w-7" />
                  </div>
                  <p className="hist-edit__empty-title">Ton histoire commence ici</p>
                  <p className="hist-edit__empty-desc">
                    Ajoute un bloc texte ou image pour structurer ton récit.
                  </p>
                </div>
              ) : (
                blocks.map((block, i) => (
                  <article key={block.id} className={`hist-edit__card hist-edit__card--${block.type}`}>
                    <div className="hist-edit__card-main">
                      <header className="hist-edit__card-head">
                        <div className="hist-edit__meta">
                          <span className="hist-edit__index">{i + 1}</span>
                          <span className={`hist-edit__tag hist-edit__tag--${block.type}`}>
                            {block.type === 'text' ? 'Paragraphe' : block.type === 'image' ? 'Visuel' : 'Liste'}
                          </span>
                        </div>
                        <div className="hist-edit__ctrls">
                          <button
                            type="button"
                            className="hist-edit__ctrl"
                            disabled={i === 0}
                            aria-label="Monter"
                            onClick={() => moveBlock(i, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="hist-edit__ctrl"
                            disabled={i === blocks.length - 1}
                            aria-label="Descendre"
                            onClick={() => moveBlock(i, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="hist-edit__ctrl hist-edit__ctrl--danger"
                            aria-label="Supprimer"
                            onClick={() => removeBlock(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </header>

                      <div className="hist-edit__card-body">
                        {block.type === 'text' ? (
                          <div className="hist-edit__text-shell">
                            <textarea
                              className="hist-edit__textarea"
                              rows={6}
                              maxLength={HISTORY_TEXT_MAX}
                              placeholder="Ex. : J'ai lancé ce projet en 2020 avec l'envie de…"
                              value={block.content}
                              onChange={(e) =>
                                updateBlock(i, { ...block, content: e.target.value })
                              }
                            />
                            <div className="hist-edit__text-foot">
                              <span className="hist-edit__counter">
                                {block.content.length} / {HISTORY_TEXT_MAX}
                              </span>
                            </div>
                          </div>
                        ) : block.type === 'list' ? (
                          <div className="space-y-3 px-2 py-1">
                            {block.items.map((item, itemIndex) => (
                              <div key={item.id} className="flex items-start gap-3">
                                <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                                <input
                                  type="text"
                                  className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                  placeholder="Élément de la liste..."
                                  value={item.value}
                                  onChange={(e) => {
                                    const newItems = [...block.items]
                                    newItems[itemIndex] = { ...newItems[itemIndex], value: e.target.value }
                                    updateBlock(i, { ...block, items: newItems })
                                  }}
                                />
                                <button
                                  type="button"
                                  className="mt-1 p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                                  onClick={() => {
                                    const newItems = block.items.filter((_, idx) => idx !== itemIndex)
                                    updateBlock(i, { ...block, items: newItems })
                                  }}
                                  aria-label="Supprimer cet élément"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="text-sm text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center gap-1 mt-2"
                              onClick={() => {
                                updateBlock(i, { ...block, items: [...block.items, { id: nextBlockId(), value: '' }] })
                              }}
                            >
                              <Plus className="h-4 w-4" /> Ajouter une puce
                            </button>
                          </div>
                        ) : (
                          <HistoryImageBlockEditor
                            block={block}
                            onChange={(next) => updateBlock(i, next)}
                          />
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="hist-edit__composer">
            <p className="hist-edit__composer-label">Ajouter un bloc</p>
            <div className="hist-edit__add-grid">
              <button type="button" className="hist-edit__add-card" onClick={addTextBlock}>
                <span className="hist-edit__add-icon hist-edit__add-icon--text">
                  <Type className="h-[18px] w-[18px]" />
                </span>
                <span className="hist-edit__add-copy">
                  <strong>Texte</strong>
                  <span>Un paragraphe de ton histoire</span>
                </span>
                <span className="hist-edit__add-plus" aria-hidden="true">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <button type="button" className="hist-edit__add-card" onClick={addImageBlock}>
                <span className="hist-edit__add-icon hist-edit__add-icon--image">
                  <ImageIcon className="h-[18px] w-[18px]" />
                </span>
                <span className="hist-edit__add-copy">
                  <strong>Image</strong>
                  <span>Une photo ou illustration</span>
                </span>
                <span className="hist-edit__add-plus" aria-hidden="true">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <button type="button" className="hist-edit__add-card" onClick={addListBlock}>
                <span className="hist-edit__add-icon bg-neutral-100 text-neutral-600">
                  <List className="h-[18px] w-[18px]" />
                </span>
                <span className="hist-edit__add-copy">
                  <strong>Liste</strong>
                  <span>Une liste à puces</span>
                </span>
                <span className="hist-edit__add-plus" aria-hidden="true">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </div>
          </div>

          {error && <p className="hist-edit__error">{error}</p>}

          <footer className="hist-edit__foot">
            <button type="button" className="hist-edit__btn hist-edit__btn--ghost" onClick={handleClose}>
              {cancelLabel}
            </button>
            <button type="submit" className="hist-edit__btn hist-edit__btn--primary" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}
