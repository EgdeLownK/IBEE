'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { serviceStepForField } from '@ibee/shared'
import { createServiceAction } from '@/app/dashboard/site/service-actions'
import { truncateExcerpt } from '../entity-create/shared'
import { StepBooking } from './steps/StepBooking'
import { StepEssentials } from './steps/StepEssentials'
import { StepPresentation } from './steps/StepPresentation'
import type { CreatedPlaylistService, ServiceCreateFormState } from './types'
import { buildPayload, createInitialFormState, validateStep } from './utils'

interface Props {
  open: boolean
  returnToAddContent?: boolean
  onClose: () => void
  onReturnToAddContent?: () => void
  onCreated: (service: CreatedPlaylistService) => void
}

const STEP_LABELS = ["L'essentiel", 'Réservation', 'Présentation'] as const

export function ServiceCreateWizard({
  open,
  returnToAddContent = false,
  onClose,
  onReturnToAddContent,
  onCreated,
}: Props) {
  const [form, setForm] = useState<ServiceCreateFormState>(createInitialFormState)
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

  function patchForm(patch: Partial<ServiceCreateFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function updateForm(fn: (prev: ServiceCreateFormState) => ServiceCreateFormState) {
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
    if (form.step < 3) {
      patchForm({
        step: (form.step + 1) as ServiceCreateFormState['step'],
        fieldErrors: {},
        globalError: '',
      })
    }
  }

  function goPrev() {
    if (form.step <= 1) return
    patchForm({
      step: (form.step - 1) as ServiceCreateFormState['step'],
      fieldErrors: {},
      globalError: '',
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    for (const s of [1, 2, 3] as const) {
      const result = validateStep(form, s)
      if (!result.ok) {
        patchForm({ step: s, fieldErrors: result.fieldErrors, globalError: '' })
        return
      }
    }

    const payload = buildPayload(form)
    startTransition(async () => {
      const result = await createServiceAction(payload)
      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {}
        const firstField = Object.keys(fieldErrors)[0]
        const targetStep = firstField ? serviceStepForField(firstField) : 3
        patchForm({
          step: targetStep,
          fieldErrors,
          globalError: result.error,
        })
        toast.error(result.error)
        return
      }

      const s = result.service
      onCreated({
        id: s.id,
        title: s.title,
        slug: s.slug,
        detailExcerpt: truncateExcerpt(s.description ?? ''),
        reviewCount: 0,
        reviewAverage: 0,
        duration_minutes: s.duration_minutes,
        location_type: s.location_type,
        price_cents: s.price_cents,
        promo_price_cents: s.promo_price_cents,
        currency: s.currency,
        image_url: s.image_url,
      })
      toast.success(s.is_active ? 'Service publié' : 'Service enregistré en brouillon')
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
      <button
        type="button"
        className="pco-root__backdrop"
        aria-label="Fermer"
        onClick={handleClose}
      />
      <div
        className="pco__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="svc-wizard-title"
      >
        <header className="pco__header">
          <h2 id="svc-wizard-title" className="pco__title">
            Ajouter un service
          </h2>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="pco__steps" aria-label="Étapes de création">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3
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
            {form.step === 2 ? <StepBooking form={form} onChange={patchForm} /> : null}
            {form.step === 3 ? (
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
              {form.step < 3 ? (
                <button type="button" className="pco__btn pco__btn--primary" onClick={goNext}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" className="pco__btn pco__btn--primary" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{pending ? 'Création...' : 'Créer le service'}</span>
                </button>
              )}
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
