'use client'

import { useEffect, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { FAQ_ANSWER_MAX, FAQ_MAX_ITEMS, FAQ_QUESTION_MAX } from '@ibee/shared'
import { saveFaqItemsAction } from '@/app/dashboard/site/faq-actions'

export type FaqItem = { question: string; answer: string }

interface Props {
  open: boolean
  initialItems: FaqItem[]
  onClose: () => void
  onSaved: (items: FaqItem[]) => void
}

function validateItems(items: FaqItem[]): string | null {
  const payload: FaqItem[] = []
  for (const it of items) {
    const question = it.question.trim()
    const answer = it.answer.trim()
    if (!question && !answer) continue
    if (question.length < 1 || question.length > FAQ_QUESTION_MAX) {
      return `Chaque question doit faire entre 1 et ${FAQ_QUESTION_MAX} caractères.`
    }
    if (answer.length < 1 || answer.length > FAQ_ANSWER_MAX) {
      return `Chaque réponse doit faire entre 1 et ${FAQ_ANSWER_MAX} caractères.`
    }
    payload.push({ question, answer })
  }
  if (payload.length > FAQ_MAX_ITEMS) return `Maximum ${FAQ_MAX_ITEMS} questions.`
  return null
}

export function FaqEditDialog({ open, initialItems, onClose, onSaved }: Props) {
  const [items, setItems] = useState<FaqItem[]>(initialItems)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setItems(initialItems.map((it) => ({ ...it })))
      setError('')
    }
  }, [open, initialItems])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  function moveItem(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= items.length) return
    setItems((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[next]] = [copy[next]!, copy[index]!]
      return copy
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const err = validateItems(items)
    if (err) {
      setError(err)
      return
    }
    const payload = items
      .map((it) => ({ question: it.question.trim(), answer: it.answer.trim() }))
      .filter((it) => it.question || it.answer)

    startTransition(async () => {
      const result = await saveFaqItemsAction(payload)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      onSaved(result.items)
      toast.success('FAQ enregistrée')
      onClose()
    })
  }

  const filledCount = items.filter((it) => it.question.trim() || it.answer.trim()).length

  return (
    <div className="faq-edit" role="presentation">
      <button type="button" className="faq-edit__backdrop" aria-label="Fermer" onClick={onClose} />
      <div
        className="faq-edit__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-edit-title"
      >
        <header className="faq-edit__head">
          <div>
            <p className="faq-edit__eyebrow">Menu F.A.Q</p>
            <h2 id="faq-edit-title" className="faq-edit__title">
              Questions fréquentes
            </h2>
            <p className="faq-edit__hint">
              Chaque question s&apos;affiche en menu dépliant sur l&apos;accueil et dans le menu
              F.A.Q.
            </p>
          </div>
          <button type="button" className="faq-edit__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <form className="faq-edit__form" onSubmit={handleSubmit}>
          <div className="faq-edit__scroll">
            {items.length === 0 ? (
              <p className="faq-edit__empty">Aucune question pour l&apos;instant.</p>
            ) : (
              <div className="faq-edit__list">
                {items.map((item, i) => (
                  <details key={i} className="faq-edit__item" open>
                    <summary className="faq-edit__summary">
                      <input
                        type="text"
                        className="faq-edit__q"
                        maxLength={FAQ_QUESTION_MAX}
                        placeholder="Ta question (ex : Comment réserver un rendez-vous ?)"
                        value={item.question}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)),
                          )
                        }
                      />
                      <div className="faq-edit__actions">
                        <button
                          type="button"
                          className="faq-edit__icon-btn"
                          disabled={i === 0}
                          aria-label="Monter"
                          onClick={(e) => {
                            e.preventDefault()
                            moveItem(i, -1)
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="faq-edit__icon-btn"
                          disabled={i === items.length - 1}
                          aria-label="Descendre"
                          onClick={(e) => {
                            e.preventDefault()
                            moveItem(i, 1)
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="faq-edit__icon-btn faq-edit__icon-btn--danger"
                          aria-label="Supprimer"
                          onClick={(e) => {
                            e.preventDefault()
                            setItems((prev) => prev.filter((_, j) => j !== i))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <ChevronDown
                        className="faq-edit__chevron h-4 w-4 shrink-0 text-neutral-400"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="faq-edit__body">
                      <textarea
                        className="faq-edit__a"
                        rows={4}
                        maxLength={FAQ_ANSWER_MAX}
                        placeholder="Ta réponse..."
                        value={item.answer}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div className="faq-edit__composer">
            <div className="faq-edit__composer-row">
              {items.length < FAQ_MAX_ITEMS && (
                <button
                  type="button"
                  className="faq-edit__add"
                  onClick={() => setItems((prev) => [...prev, { question: '', answer: '' }])}
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter une question</span>
                </button>
              )}
              <span className="faq-edit__count">
                {filledCount}/{FAQ_MAX_ITEMS}
              </span>
            </div>
          </div>

          {error && <p className="faq-edit__error">{error}</p>}

          <footer className="faq-edit__foot">
            <button type="button" className="faq-edit__btn faq-edit__btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className="faq-edit__btn faq-edit__btn--primary"
              disabled={pending}
            >
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
