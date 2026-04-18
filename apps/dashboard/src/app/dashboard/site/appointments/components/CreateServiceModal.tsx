'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@agora/ui-react'
import { createAppointmentTypeAction } from '../actions'

type Props = {
  open: boolean
  onClose: () => void
}

type LocationType = 'video' | 'in_person' | 'phone'

const DURATIONS = [15, 30, 45, 60, 90, 120]
const LOCATIONS: { value: LocationType; label: string }[] = [
  { value: 'video', label: 'Visio' },
  { value: 'in_person', label: 'Sur place' },
  { value: 'phone', label: 'Téléphone' },
]

function sanitizePriceInput(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, '')
  const firstSep = cleaned.search(/[.,]/)
  if (firstSep !== -1) {
    cleaned =
      cleaned.slice(0, firstSep + 1) + cleaned.slice(firstSep + 1).replace(/[.,]/g, '')
  }
  return cleaned
}

function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^\d+\s().\-]/g, '')
}

function parsePrice(input: string): number | null {
  if (!input.trim()) return null
  const n = parseFloat(input.replace(',', '.'))
  if (isNaN(n) || n < 0) return null
  return Math.round(n * 100)
}

export function CreateServiceModal({ open, onClose }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [locationType, setLocationType] = useState<LocationType>('video')
  const [locationDetails, setLocationDetails] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoConfirmed, setPromoConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const priceCents = parsePrice(priceInput)
  const promoCents = promoOpen ? parsePrice(promoInput) : null
  const promoValid =
    promoCents === null ||
    (priceCents !== null && promoCents > 0 && promoCents < priceCents)
  const promoDiscount =
    promoCents && priceCents && promoValid
      ? Math.round(((priceCents - promoCents) / priceCents) * 100)
      : null

  const canConfirmPromo = promoValid && promoCents !== null && promoCents > 0
  const promoPending = promoOpen && !promoConfirmed && priceInput.trim() !== '' && promoInput.trim() !== ''
  const effectivePromoCents = promoConfirmed ? promoCents : null
  const canSubmit = title.trim().length > 0 && promoValid && !promoPending

  const reset = () => {
    setTitle('')
    setDuration(30)
    setLocationType('video')
    setLocationDetails('')
    setPriceInput('')
    setPromoInput('')
    setPromoOpen(false)
    setPromoConfirmed(false)
    setError(null)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handlePromoChange = (raw: string) => {
    setPromoInput(sanitizePriceInput(raw))
    if (promoConfirmed) setPromoConfirmed(false)
  }

  const handlePromoConfirm = () => {
    if (!canConfirmPromo) return
    setPromoConfirmed(true)
  }

  const handleLocationDetailsChange = (raw: string) => {
    if (locationType === 'phone') setLocationDetails(sanitizePhoneInput(raw))
    else setLocationDetails(raw)
  }

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const result = await createAppointmentTypeAction({
        title,
        duration_minutes: duration,
        location_type: locationType,
        location_details: locationDetails || null,
        price_cents: priceCents,
        promo_price_cents: effectivePromoCents,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      toast.success('Service créé. Enrichissez-le maintenant.')
      reset()
      onClose()
      router.push(`/dashboard/site/appointments/types/${result.id}/edit`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="flex w-full max-w-[520px] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl bg-neutral-0 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-busy={submitting}
        aria-labelledby="create-service-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-5">
          <div>
            <h2 id="create-service-title" className="text-lg font-bold text-neutral-900">
              Nouveau service
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              L’essentiel pour démarrer. Tu enrichiras les détails après.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer"
            className="flex rounded-full p-2 text-neutral-500 transition hover:bg-neutral-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {error && (
            <div className="rounded-md bg-error/10 px-4 py-3 text-xs text-error">{error}</div>
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-600">Nom du service</label>
            <Input
              variant="subtle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Consultation découverte"
              maxLength={120}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-600">Durée</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-md border px-3.5 py-1.5 text-sm font-bold transition ${
                    duration === d
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-600">Type de lieu</label>
            <div className="flex gap-1 rounded-md bg-neutral-100 p-1">
              {LOCATIONS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLocationType(l.value)}
                  className={`flex-1 rounded-sm px-3 py-2 text-xs font-bold transition ${
                    locationType === l.value
                      ? 'bg-neutral-0 text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Input
              variant="subtle"
              type={locationType === 'phone' ? 'tel' : 'text'}
              inputMode={locationType === 'phone' ? 'tel' : undefined}
              value={locationDetails}
              onChange={(e) => handleLocationDetailsChange(e.target.value)}
              placeholder={
                locationType === 'video'
                  ? 'Lien visio (optionnel)'
                  : locationType === 'in_person'
                  ? 'Adresse (optionnel)'
                  : 'Numéro (optionnel)'
              }
              className="mt-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-600">Prix</label>
            <div className="relative">
              <Input
                variant="subtle"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(sanitizePriceInput(e.target.value))}
                placeholder="49,99"
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                €
              </span>
            </div>

            {!promoOpen ? (
              <button
                type="button"
                onClick={() => setPromoOpen(true)}
                className="mt-2 flex items-center gap-1 text-xs font-bold text-accent transition hover:text-accent-hover"
              >
                + Ajouter une promotion
              </button>
            ) : (
              <div className="mt-3 rounded-md border border-neutral-100 bg-neutral-50 p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <label className="text-sm font-bold text-neutral-600">Prix après promotion</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPromoOpen(false)
                      setPromoInput('')
                      setPromoConfirmed(false)
                    }}
                    aria-label="Retirer la promotion"
                    className="flex text-neutral-500 transition hover:text-neutral-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <Input
                      variant="subtle"
                      type="text"
                      inputMode="decimal"
                      value={promoInput}
                      onChange={(e) => handlePromoChange(e.target.value)}
                      placeholder="Prix promo"
                      readOnly={promoConfirmed}
                      className={`bg-neutral-0 pr-8 ${promoConfirmed ? 'text-neutral-500' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      €
                    </span>
                  </div>
                  {promoConfirmed && promoDiscount !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-md bg-success px-4 py-2.5 text-sm font-bold text-white">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-success">
                          <Check className="h-3 w-3" />
                        </span>
                        -{promoDiscount}%
                      </div>
                      <button
                        type="button"
                        onClick={() => setPromoConfirmed(false)}
                        aria-label="Modifier la promotion"
                        className="flex rounded-md border border-neutral-200 bg-neutral-0 p-2.5 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePromoConfirm}
                      disabled={!canConfirmPromo}
                      className="rounded-md bg-cta-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cta-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Valider
                    </button>
                  )}
                </div>
                {!promoValid && promoCents !== null && promoCents > 0 && (
                  <p className="mt-1.5 text-[11px] font-bold text-error">
                    Le prix promo doit être inférieur au prix normal.
                  </p>
                )}
                {promoPending && promoValid && (
                  <p className="mt-1.5 text-[11px] font-bold text-neutral-500">
                    Cliquez sur « Valider » pour appliquer la promotion.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-neutral-100 bg-neutral-50 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md px-4 py-2.5 text-sm font-bold text-neutral-500 transition hover:text-neutral-900 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-1.5 rounded-md bg-cta-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cta-primary-hover disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              'Créer et continuer'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
