'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { eventStepForField } from '@ibee/shared'
import { createEventAction } from '@/app/dashboard/site/event-actions'
import { truncateExcerpt } from '../entity-create/shared'
import { StepEssentials } from './steps/StepEssentials'
import { StepPresentation } from './steps/StepPresentation'
import type { CreatedPlaylistEvent, EventCreateFormState } from './types'
import { buildPayload, createInitialFormState, validateStep } from './utils'

interface Props {
  open: boolean
  returnToAddContent?: boolean
  onClose: () => void
  onReturnToAddContent?: () => void
  onCreated: (event: CreatedPlaylistEvent) => void
}

const STEP_LABELS = ["L'essentiel", 'Présentation'] as const

export function EventCreateWizard({
  open,
  returnToAddContent = false,
  onClose,
  onReturnToAddContent,
  onCreated,
}: Props) {
  const [form, setForm] = useState<EventCreateFormState>(createInitialFormState)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setForm(createInitialFormState())
  }, [open])

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
  }, [open, returnToAddContent])

  if (!open || typeof document === 'undefined') return null

  function patchForm(patch: Partial<EventCreateFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function updateForm(fn: (prev: EventCreateFormState) => EventCreateFormState) {
    setForm(fn)
  }

  function handleClose() {
    if (returnToAddContent) {
      onClose()
      onReturnToAddContent?.()
      return
    }
    onClose()
  }

  function goNext() {
    const result = validateStep(form, form.step)
    if (!result.ok) {
      patchForm({ fieldErrors: result.fieldErrors, globalError: '' })
      return
    }
    if (form.step < 2) {
      patchForm({ step: 2, fieldErrors: {}, globalError: '' })
    }
  }

  function goPrev() {
    if (form.step <= 1) return
    patchForm({ step: 1, fieldErrors: {}, globalError: '' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    for (const s of [1, 2] as const) {
      const result = validateStep(form, s)
      if (!result.ok) {
        patchForm({ step: s, fieldErrors: result.fieldErrors, globalError: '' })
        return
      }
    }

    const payload = buildPayload(form)
    startTransition(async () => {
      const result = await createEventAction(payload)
      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {}
        const firstField = Object.keys(fieldErrors)[0]
        const targetStep = firstField ? eventStepForField(firstField) : 2
        patchForm({
          step: targetStep,
          fieldErrors,
          globalError: result.error,
        })
        toast.error(result.error)
        return
      }

      const ev = result.event
      onCreated({
        id: ev.id,
        title: ev.title,
        slug: ev.slug,
        detailExcerpt: truncateExcerpt(ev.description ?? ''),
        start_at: ev.start_at,
        price_cents: ev.price_cents,
        currency: ev.currency,
        image_url: ev.image_url,
      })
      toast.success(ev.is_published ? 'Event publié' : 'Event enregistré en brouillon')
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
    <div className="pco-root" role="presentation">
      <button type="button" className="pco-root__backdrop" aria-label="Fermer" onClick={handleClose} />
      <div className="pco__panel" role="dialog" aria-modal="true" aria-labelledby="ev-wizard-title">
        <header className="pco__header">
          <h2 id="ev-wizard-title" className="pco__title">
            Ajouter un event
          </h2>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="pco__steps" aria-label="Étapes de création">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2
            return (
              <span
                key={n}
                className={`pco__step${form.step === n ? ' is-active' : ''}${form.step > n ? ' is-done' : ''}`}
              >
                <span className="pco__step-num">{n}</span>
                <span className="pco__step-label">{label}</span>
              </span>
            )
          })}
        </nav>

        <form className="pco__form" onSubmit={handleSubmit} noValidate>
          {form.globalError ? (
            <p className="pco__error-global" role="alert">
              {form.globalError}
            </p>
          ) : null}

          <div className="pco__scroll">
            {form.step === 1 ? <StepEssentials form={form} onChange={patchForm} /> : null}
            {form.step === 2 ? (
              <StepPresentation form={form} onChange={patchForm} updateForm={updateForm} />
            ) : null}
          </div>

          <footer className="pco__actions">
            <div className="pco__actions-start">
              <button type="button" className="pco__btn pco__btn--ghost" onClick={handleClose}>
                {cancelLabel}
              </button>
              {form.step > 1 ? (
                <button type="button" className="pco__btn pco__btn--ghost" onClick={goPrev}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </button>
              ) : null}
            </div>
            <div className="pco__actions-end">
              {form.step < 2 ? (
                <button type="button" className="pco__btn pco__btn--primary" onClick={goNext}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" className="pco__btn pco__btn--primary" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{pending ? 'Création...' : "Créer l'event"}</span>
                </button>
              )}
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}
