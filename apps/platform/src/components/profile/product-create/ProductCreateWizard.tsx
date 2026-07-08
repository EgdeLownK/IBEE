'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { stepForField } from '@ibee/shared'
import { createProductAction } from '@/app/dashboard/site/product-actions'
import { StepDescription } from './steps/StepDescription'
import { StepEssentials } from './steps/StepEssentials'
import { StepFaq } from './steps/StepFaq'
import { StepTypeSelect } from './steps/StepTypeSelect'
import { StepTypeSpecific } from './steps/StepTypeSpecific'
import type { CreatedShopProduct, ProductCategoryOption, ProductCreateFormState, ProductType } from './types'
import {
  buildPayload,
  createInitialFormState,
  step2Label,
  truncateExcerpt,
  validateStep,
} from './utils'

interface Props {
  open: boolean
  productCategories: ProductCategoryOption[]
  returnToAddContent?: boolean
  onClose: () => void
  onReturnToAddContent?: () => void
  onCreated: (product: CreatedShopProduct) => void
}

export function ProductCreateWizard({
  open,
  productCategories,
  returnToAddContent = false,
  onClose,
  onReturnToAddContent,
  onCreated,
}: Props) {
  const [form, setForm] = useState<ProductCreateFormState>(createInitialFormState)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setForm(createInitialFormState())
  }, [open])

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
  }, [open, returnToAddContent])

  if (!open || typeof document === 'undefined') return null

  function patchForm(patch: Partial<ProductCreateFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function updateForm(fn: (prev: ProductCreateFormState) => ProductCreateFormState) {
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

  function selectType(type: ProductType) {
    patchForm({ type, step: 1, fieldErrors: {}, globalError: '' })
  }

  function goNext() {
    if (form.step === 0) return
    const result = validateStep(form, form.step as 1 | 2 | 3 | 4)
    if (!result.ok) {
      patchForm({ fieldErrors: result.fieldErrors, globalError: '' })
      return
    }
    if (form.step < 4) {
      patchForm({ step: (form.step + 1) as ProductCreateFormState['step'], fieldErrors: {}, globalError: '' })
    }
  }

  function goPrev() {
    if (form.step <= 1) return
    patchForm({ step: (form.step - 1) as ProductCreateFormState['step'], fieldErrors: {}, globalError: '' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    for (const s of [1, 2, 3, 4] as const) {
      const result = validateStep(form, s)
      if (!result.ok) {
        patchForm({ step: s, fieldErrors: result.fieldErrors, globalError: '' })
        return
      }
    }

    const payload = buildPayload(form)
    startTransition(async () => {
      const result = await createProductAction(payload)
      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {}
        const firstField = Object.keys(fieldErrors)[0]
        const targetStep = firstField ? stepForField(firstField) : 4
        patchForm({
          step: targetStep as ProductCreateFormState['step'],
          fieldErrors,
          globalError: result.error,
        })
        toast.error(result.error)
        return
      }

      const p = result.product
      onCreated({
        id: p.id,
        title: p.title,
        slug: p.slug,
        detailExcerpt: truncateExcerpt(p.description_short),
        reviewCount: 0,
        reviewAverage: 0,
        price_cents: p.price_cents,
        sale_price_cents: p.sale_price_cents,
        sale_ends_at: p.sale_ends_at,
        currency: p.currency,
        image_url: p.image_url,
        status: p.status as CreatedShopProduct['status'],
        category_id: p.category_id,
        type: p.type as CreatedShopProduct['type'],
        physical_stock_quantity: p.physical_stock_quantity,
      })
      toast.success(form.publish ? 'Produit publié' : 'Produit enregistré en brouillon')
      if (returnToAddContent) {
        onClose()
        onReturnToAddContent?.()
      } else {
        onClose()
      }
    })
  }

  const cancelLabel = returnToAddContent ? 'Retour' : 'Annuler'
  const showSteps = form.step >= 1
  const step2 = step2Label(form.type)

  return createPortal(
    <div className="pco-root" role="presentation">
      <button type="button" className="pco-root__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="pco__panel" role="dialog" aria-modal="true" aria-labelledby="pco-title">
        <header className="pco__header">
          <h2 id="pco-title" className="pco__title">
            Ajouter un produit
          </h2>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        {showSteps ? (
          <nav className="pco__steps" aria-label="Étapes de création">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`pco__step${form.step === n ? ' is-active' : ''}${form.step > n ? ' is-done' : ''}`}
              >
                <span className="pco__step-num">{n}</span>
                <span className="pco__step-label">
                  {n === 1 ? "Présentation" : n === 2 ? step2 : n === 3 ? 'Description' : 'FAQ'}
                </span>
              </span>
            ))}
          </nav>
        ) : null}

        <form className="pco__form" onSubmit={handleSubmit} noValidate>
          {form.globalError ? (
            <p className="pco__error-global" role="alert">
              {form.globalError}
            </p>
          ) : null}

          <div className="pco__scroll">
            {form.step === 0 ? <StepTypeSelect form={form} onSelectType={selectType} /> : null}
            {form.step === 1 ? (
              <StepEssentials
                form={form}
                categories={productCategories}
                updateForm={updateForm}
                onChange={patchForm}
              />
            ) : null}
            {form.step === 2 ? (
              <StepTypeSpecific form={form} updateForm={updateForm} onChange={patchForm} />
            ) : null}
            {form.step === 3 ? (
              <StepDescription form={form} updateForm={updateForm} onChange={patchForm} />
            ) : null}
            {form.step === 4 ? (
              <StepFaq form={form} onChange={patchForm} />
            ) : null}
          </div>

          <footer className="pco__actions">
            <div className="pco__actions-start">
              {form.step < 2 ? (
                <button type="button" className="pco__btn pco__btn--ghost" onClick={handleClose}>
                  {cancelLabel}
                </button>
              ) : null}
              {form.step > 1 ? (
                <button type="button" className="pco__btn pco__btn--ghost" onClick={goPrev}>
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </button>
              ) : null}
            </div>
            <div className="pco__actions-end">
              {form.step >= 1 && form.step < 4 ? (
                <button type="button" className="pco__btn pco__btn--primary" onClick={goNext}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
              {form.step === 4 ? (
                <button type="submit" className="pco__btn pco__btn--primary" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{pending ? 'Création...' : 'Créer le produit'}</span>
                </button>
              ) : null}
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}
