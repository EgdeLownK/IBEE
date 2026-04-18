'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown, Save, Trash2, Loader2, Check, Pencil } from 'lucide-react'
import { Input } from '@agora/ui-react'
import { updateAppointmentTypeAction, deleteAppointmentTypeAction } from '../actions'
import { ServiceHighlightsEditor } from '../components/ServiceHighlightsEditor'
import { ServiceContentBuilder, newBlockId, type ContentBlock } from '../components/ServiceContentBuilder'

type LocationType = 'video' | 'in_person' | 'phone'

type EditData = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  location_type: string
  location_details: string | null
  price_cents: number | null
  promo_price_cents: number | null
  currency: string
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_hours: number
  max_advance_days: number
  is_active: boolean
  auto_accept_bookings: boolean
  highlights: unknown
  content_blocks: unknown
  entity_id: string
}

type Props = {
  editData: EditData
}

const DURATIONS = [15, 30, 45, 60, 90, 120]
const LOCATIONS: { value: LocationType; label: string }[] = [
  { value: 'video', label: 'Visio' },
  { value: 'in_person', label: 'Sur place' },
  { value: 'phone', label: 'Téléphone' },
]

function parsePrice(input: string): number | null {
  if (!input.trim()) return null
  const n = parseFloat(input.replace(',', '.'))
  if (isNaN(n) || n < 0) return null
  return Math.round(n * 100)
}

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

const DESCRIPTION_MAX_LENGTH = 250

function formatPrice(cents: number | null): string {
  if (cents === null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

function coerceHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

function coerceBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((raw): ContentBlock | null => {
      if (!raw || typeof raw !== 'object') return null
      const b = raw as Record<string, unknown>
      if (b.type === 'text') return { id: newBlockId(), type: 'text', content: String(b.content ?? '') }
      if (b.type === 'image') return { id: newBlockId(), type: 'image', url: String(b.url ?? ''), alt: String(b.alt ?? '') }
      if (b.type === 'list') return { id: newBlockId(), type: 'list', items: Array.isArray(b.items) ? b.items.map(String) : [] }
      return null
    })
    .filter((b): b is ContentBlock => b !== null)
}

export function AppointmentTypeEditorFull({ editData }: Props) {
  const router = useRouter()

  const [title, setTitle] = useState(editData.title)
  const [duration, setDuration] = useState(editData.duration_minutes)
  const [locationType, setLocationType] = useState<LocationType>(
    (LOCATIONS.find((l) => l.value === editData.location_type)?.value ?? 'video') as LocationType
  )
  const [locationDetails, setLocationDetails] = useState(editData.location_details ?? '')
  const [priceInput, setPriceInput] = useState(formatPrice(editData.price_cents))
  const [promoInput, setPromoInput] = useState(formatPrice(editData.promo_price_cents))
  const [promoOpen, setPromoOpen] = useState(editData.promo_price_cents !== null)
  const [promoConfirmed, setPromoConfirmed] = useState(editData.promo_price_cents !== null)
  const [isActive, setIsActive] = useState(editData.is_active)
  const [description, setDescription] = useState(editData.description ?? '')
  const [highlights, setHighlights] = useState<string[]>(coerceHighlights(editData.highlights))
  const [bufferBefore, setBufferBefore] = useState(editData.buffer_before_minutes)
  const [bufferAfter, setBufferAfter] = useState(editData.buffer_after_minutes)
  const [minNotice, setMinNotice] = useState(editData.min_notice_hours)
  const [maxAdvance, setMaxAdvance] = useState(editData.max_advance_days)
  const [autoAcceptBookings, setAutoAcceptBookings] = useState(editData.auto_accept_bookings)
  const [blocks, setBlocks] = useState<ContentBlock[]>(coerceBlocks(editData.content_blocks))

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceCents = parsePrice(priceInput)
  const promoCents = promoOpen ? parsePrice(promoInput) : null
  const promoValid =
    promoCents === null || (priceCents !== null && promoCents > 0 && promoCents < priceCents)
  const promoDiscount =
    promoCents && priceCents && promoValid
      ? Math.round(((priceCents - promoCents) / priceCents) * 100)
      : null
  const canConfirmPromo = promoValid && promoCents !== null && promoCents > 0
  const promoPending =
    promoOpen && !promoConfirmed && priceInput.trim() !== '' && promoInput.trim() !== ''
  const effectivePromoCents = promoConfirmed ? promoCents : null

  const handlePromoChange = (raw: string) => {
    setPromoInput(sanitizePriceInput(raw))
    if (promoConfirmed) setPromoConfirmed(false)
  }

  const handleLocationDetailsChange = (raw: string) => {
    if (locationType === 'phone') setLocationDetails(sanitizePhoneInput(raw))
    else setLocationDetails(raw)
  }

  const currentSnapshot = JSON.stringify({
    title: title.trim(),
    duration,
    locationType,
    locationDetails: locationDetails.trim(),
    priceCents,
    promoCents: effectivePromoCents,
    isActive,
    description: description.trim(),
    highlights,
    bufferBefore,
    bufferAfter,
    minNotice,
    maxAdvance,
    autoAcceptBookings,
    blocks: blocks.map((b) => {
      if (b.type === 'text') return { type: 'text', content: b.content }
      if (b.type === 'image') return { type: 'image', url: b.url, alt: b.alt }
      return { type: 'list', items: b.items }
    }),
  })

  // Intentionnel : on capture le snapshot initial une seule fois par editData.id pour détecter dirty.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialSnapshot = useMemo(() => currentSnapshot, [editData.id])
  const [savedSnapshot, setSavedSnapshot] = useState<string>(initialSnapshot)

  const dirty = currentSnapshot !== savedSnapshot
  const canSave = dirty && title.trim().length > 0 && promoValid && !promoPending

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      const result = await updateAppointmentTypeAction(editData.id, {
        title,
        description: description.trim() || null,
        duration_minutes: duration,
        location_type: locationType,
        location_details: locationDetails.trim() || null,
        price_cents: priceCents,
        promo_price_cents: effectivePromoCents,
        buffer_before_minutes: bufferBefore,
        buffer_after_minutes: bufferAfter,
        min_notice_hours: minNotice,
        max_advance_days: maxAdvance,
        is_active: isActive,
        auto_accept_bookings: autoAcceptBookings,
        highlights,
        content_blocks: blocks.map((b) => {
          if (b.type === 'text') return { type: 'text' as const, content: b.content }
          if (b.type === 'image') return { type: 'image' as const, url: b.url, alt: b.alt }
          return { type: 'list' as const, items: b.items }
        }),
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setSavedSnapshot(currentSnapshot)
      toast.success('Enregistré.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce service ? Cette action est irréversible.')) return
    setDeleting(true)
    try {
      const result = await deleteAppointmentTypeAction(editData.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      toast.success('Service supprimé.')
      router.push('/dashboard/site/appointments')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-6 md:px-8 md:py-10" aria-busy={saving}>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/site/appointments')}
            aria-label="Retour"
            className="flex rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">{title || 'Service'}</h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Enrichis ton service pour le mettre en valeur sur ton profil public.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            isActive ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isActive ? 'bg-success' : 'bg-neutral-400'}`}
          />
          {isActive ? 'Visible' : 'Masqué'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-xs text-error">{error}</div>
      )}

      <div className="flex flex-col gap-4">
        <Section title="Essentiel" subtitle="Les infos de base du service." defaultOpen>
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-neutral-600">Nom du service</label>
              <Input
                variant="subtle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
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
                      className="text-xs font-bold text-neutral-500 underline transition hover:text-neutral-900"
                    >
                      Retirer
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
                        onClick={() => canConfirmPromo && setPromoConfirmed(true)}
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
        </Section>

        <Section
          title="Marketing"
          subtitle="Ce que tes visiteurs voient dans l'aperçu."
        >
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <label className="block text-sm font-bold text-neutral-600">
                  Description courte
                </label>
                <span
                  className={`text-[11px] font-bold tabular-nums ${
                    description.length >= DESCRIPTION_MAX_LENGTH
                      ? 'text-error'
                      : 'text-neutral-400'
                  }`}
                  aria-live="polite"
                >
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                placeholder="Une phrase accrocheuse qui résume ton offre."
                rows={3}
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="w-full resize-none rounded-md bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:bg-neutral-0 focus:ring-2 focus:ring-accent/15"
              />
            </div>

            <ServiceHighlightsEditor value={highlights} onChange={setHighlights} />
          </div>
        </Section>

        <Section
          title="Contraintes de réservation"
          subtitle="Battements, fenêtres de réservation et validation."
        >
          <div className="mb-5">
            <ToggleField
              label="Accepter automatiquement les rendez-vous"
              description="Quand activé, chaque réservation est confirmée dès qu'un client réserve. Sinon, tu dois la confirmer manuellement."
              checked={autoAcceptBookings}
              onChange={setAutoAcceptBookings}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Battement avant"
              unitLabel="min"
              description="Temps tampon avant chaque RDV pour te préparer."
              value={bufferBefore}
              onChange={setBufferBefore}
              min={0}
              max={120}
            />
            <NumberField
              label="Battement après"
              unitLabel="min"
              description="Temps tampon après chaque RDV pour souffler."
              value={bufferAfter}
              onChange={setBufferAfter}
              min={0}
              max={120}
            />
            <DurationField
              label="Préavis minimum"
              description="Délai minimum entre la réservation et le RDV."
              hours={minNotice}
              onChange={setMinNotice}
              storageUnit="heure"
            />
            <DurationField
              label="Réservable jusqu'à"
              description="Horizon de réservation en avance."
              days={maxAdvance}
              onChange={setMaxAdvance}
              storageUnit="jour"
            />
          </div>
        </Section>

        <Section
          title="Contenu détaillé"
          subtitle="Raconte ton offre en profondeur avec du texte, des images et des listes."
        >
          <ServiceContentBuilder
            entityId={editData.entity_id}
            value={blocks}
            onChange={setBlocks}
            onError={setError}
          />
        </Section>

        <div className="mt-4 flex items-center justify-end gap-4 border-t border-neutral-100 bg-background/90 py-4">
          {dirty && !saving && (
            <span
              className="flex items-center gap-1.5 text-xs font-semibold text-accent"
              aria-live="polite"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Modifications non enregistrées
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 rounded-md bg-cta-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cta-primary-hover disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer
              </>
            )}
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-error/20 bg-error/5 p-5">
          <h3 className="text-sm font-bold text-error">Zone de danger</h3>
          <p className="mt-1 text-xs text-neutral-600">
            La suppression est irréversible. Les réservations existantes resteront liées au service supprimé.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-error/30 bg-neutral-0 px-4 py-2 text-xs font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Supprimer le service
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 transition open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 transition hover:bg-neutral-50">
        <div>
          <h2 className="text-base font-bold text-neutral-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-neutral-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-neutral-100 px-6 py-5">{children}</div>
    </details>
  )
}

function NumberField({
  label,
  unitLabel,
  description,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  unitLabel?: string
  description?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-neutral-600">{label}</label>
      <div className="relative">
        <Input
          variant="subtle"
          type="number"
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
          min={min}
          max={max}
          className={unitLabel ? 'pr-12' : ''}
        />
        {unitLabel && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
            {unitLabel}
          </span>
        )}
      </div>
      {description && <p className="mt-1.5 text-[11px] text-neutral-500">{description}</p>}
    </div>
  )
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-neutral-100 bg-neutral-50 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-neutral-900">{label}</p>
        {description && <p className="mt-1 text-[11px] text-neutral-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-accent' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-neutral-0 shadow-sm transition ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

type DurationUnit = 'minute' | 'heure' | 'jour'
const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  minute: 'min',
  heure: 'h',
  jour: 'j',
}

// Only allow display units that are equal to or coarser than the storage unit,
// to avoid silent precision loss when storing (e.g. "2 h" in a day-granular column
// would round to 0). Coarser-than-storage is fine since the conversion is exact.
function availableUnits(storageUnit: DurationUnit): DurationUnit[] {
  if (storageUnit === 'minute') return ['minute', 'heure', 'jour']
  if (storageUnit === 'heure') return ['heure', 'jour']
  return ['jour']
}

function pickInitialUnit(storageValue: number, storageUnit: DurationUnit): DurationUnit {
  if (storageUnit === 'heure') {
    if (storageValue > 0 && storageValue % 24 === 0) return 'jour'
    return 'heure'
  }
  return 'jour'
}

function toStorageValue(displayValue: number, displayUnit: DurationUnit, storageUnit: DurationUnit): number {
  // Convert displayValue from displayUnit to storageUnit, rounded to integer.
  const toMinutes: Record<DurationUnit, number> = { minute: 1, heure: 60, jour: 60 * 24 }
  const minutes = displayValue * toMinutes[displayUnit]
  const storage = minutes / toMinutes[storageUnit]
  return Math.max(0, Math.round(storage))
}

function fromStorageValue(storageValue: number, storageUnit: DurationUnit, displayUnit: DurationUnit): number {
  const toMinutes: Record<DurationUnit, number> = { minute: 1, heure: 60, jour: 60 * 24 }
  const minutes = storageValue * toMinutes[storageUnit]
  return Math.round(minutes / toMinutes[displayUnit])
}

type DurationFieldProps = {
  label: string
  description?: string
  onChange: (storageValue: number) => void
  storageUnit: 'heure' | 'jour'
} & ({ hours: number; days?: never } | { days: number; hours?: never })

function DurationField(props: DurationFieldProps) {
  const { label, description, onChange, storageUnit } = props
  const storageValue = 'hours' in props && typeof props.hours === 'number' ? props.hours : (props as { days: number }).days
  const units = availableUnits(storageUnit)
  const [unit, setUnit] = useState<DurationUnit>(() => pickInitialUnit(storageValue, storageUnit))
  const displayValue = fromStorageValue(storageValue, storageUnit, unit)

  const handleValueChange = (n: number) => {
    const safe = Math.max(0, isNaN(n) ? 0 : n)
    onChange(toStorageValue(safe, unit, storageUnit))
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-neutral-600">{label}</label>
      <div className="flex gap-1.5">
        <Input
          variant="subtle"
          type="number"
          value={displayValue}
          onChange={(e) => handleValueChange(parseInt(e.target.value, 10))}
          min={0}
          className="flex-1"
        />
        {units.length > 1 && (
          <div className="flex gap-0.5 rounded-md bg-neutral-100 p-1">
            {units.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-sm px-2 text-[11px] font-bold transition ${
                  unit === u
                    ? 'bg-neutral-0 text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {DURATION_UNIT_LABELS[u]}
              </button>
            ))}
          </div>
        )}
        {units.length === 1 && (
          <div className="flex items-center rounded-md bg-neutral-100 px-3 text-[11px] font-bold text-neutral-500">
            {DURATION_UNIT_LABELS[units[0]!]}
          </div>
        )}
      </div>
      {description && <p className="mt-1.5 text-[11px] text-neutral-500">{description}</p>}
    </div>
  )
}
