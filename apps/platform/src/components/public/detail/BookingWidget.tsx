'use client'

import { CalendarDays, ChevronLeft, Clock, MapPin, Phone, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PublicBookingData } from '@/lib/load-public-booking'

type Slot = { start: string; end: string }

type Props = Pick<
  PublicBookingData,
  | 'entity'
  | 'service'
  | 'bookerName'
  | 'bookerEmail'
  | 'priceText'
  | 'chargeLabel'
  | 'needsPayment'
  | 'cancellationPolicyLabel'
  | 'locationLabel'
  | 'confirmedBaseHref'
>

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

const LOCATION_ICONS = {
  video: Video,
  in_person: MapPin,
  phone: Phone,
} as const

export function BookingWidget({
  entity,
  service,
  bookerName: initialName,
  bookerEmail: initialEmail,
  priceText,
  chargeLabel,
  needsPayment,
  cancellationPolicyLabel,
  locationLabel: locLabel,
  confirmedBaseHref,
}: Props) {
  const [step, setStep] = useState<'calendar' | 'recap'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [availableDays, setAvailableDays] = useState<Record<string, boolean>>({})
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [recapDatetime, setRecapDatetime] = useState('')
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const LocIcon = LOCATION_ICONS[service.location_type as keyof typeof LOCATION_ICONS] ?? Video

  const loadSlots = useCallback(
    async (date: string) => {
      setSlotsLoading(true)
      setSlotsError(false)
      try {
        const res = await fetch(
          `/api/bookings/slots?entityId=${entity.id}&typeId=${service.id}&date=${date}`
        )
        const data = await res.json()
        setSlots(data.slots ?? [])
      } catch {
        setSlots([])
        setSlotsError(true)
      } finally {
        setSlotsLoading(false)
      }
    },
    [entity.id, service.id]
  )

  const loadAvailableDays = useCallback(async () => {
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
    try {
      const res = await fetch(
        `/api/bookings/available-days?entityId=${entity.id}&typeId=${service.id}&month=${monthStr}`
      )
      const data = await res.json()
      const daysMap: Record<string, boolean> = {}
      ;(data.days ?? []).forEach((d: string) => {
        daysMap[d] = true
      })
      setAvailableDays(daysMap)
      const sorted = (data.days ?? []).sort()
      if (sorted.length > 0) {
        setSelectedDate(sorted[0])
        void loadSlots(sorted[0])
      } else {
        setSelectedDate('')
        setSlots([])
      }
    } catch {
      setAvailableDays({})
    }
  }, [currentMonth, entity.id, service.id, loadSlots])

  useEffect(() => {
    void loadAvailableDays()
  }, [loadAvailableDays])

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr)
    void loadSlots(dateStr)
  }

  function selectSlot(slot: Slot) {
    setSelectedStart(slot.start)
    setSelectedEnd(slot.end)
    const dateF = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: tz,
    }).format(new Date(slot.start))
    const t1 = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    }).format(new Date(slot.start))
    const t2 = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    }).format(new Date(slot.end))
    setRecapDatetime(`${dateF.charAt(0).toUpperCase() + dateF.slice(1)}, ${t1} — ${t2}`)
    setStep('recap')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName || !trimmedEmail) {
      window.alert('Nom et email sont obligatoires.')
      return
    }
    if (!selectedStart || !selectedEnd) {
      window.alert('Veuillez choisir un créneau.')
      return
    }

    setSubmitting(true)
    try {
      if (needsPayment) {
        const res = await fetch('/api/checkout/create-booking-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: entity.id,
            entitySlug: entity.slug,
            serviceSlug: service.slug,
            appointmentTypeId: service.id,
            bookerName: trimmedName,
            bookerEmail: trimmedEmail,
            bookerPhone: phone.trim() || null,
            startAt: selectedStart,
            endAt: selectedEnd,
          }),
        })
        const data = await res.json()
        if (data.error || !data.url) {
          window.alert(data.error ?? 'Impossible de démarrer le paiement.')
          setSubmitting(false)
          return
        }
        window.location.href = data.url
        return
      }

      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_type_id: service.id,
          entity_id: entity.id,
          booker_name: trimmedName,
          booker_email: trimmedEmail,
          booker_phone: phone.trim() || null,
          booker_message: null,
          start_at: selectedStart,
          end_at: selectedEnd,
        }),
      })
      const data = await res.json()
      if (data.error) {
        window.alert(data.error)
        setSubmitting(false)
        return
      }
      const params = new URLSearchParams({
        name: trimmedName,
        date: recapDatetime,
      })
      window.location.href = `${confirmedBaseHref}?${params.toString()}`
    } catch {
      window.alert('Erreur.')
      setSubmitting(false)
    }
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <>
      <section className="booking-hero px-[22px] pt-[18px] pb-3">
        <h1 className="m-0 font-display text-[26px] font-semibold leading-[1.15] tracking-tight text-neutral-900">
          {service.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="pill">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {service.duration_minutes} min
          </span>
          <span className="pill">
            <LocIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {locLabel}
          </span>
          <span className="pill pill--accent font-semibold">{priceText}</span>
        </div>
      </section>

      <section id="booking-panel" className="sec booking-panel scroll-mt-20" style={{ marginTop: 22 }}>
        {step === 'calendar' ? (
          <div id="step-calendar">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-7" />
              <h2 className="text-base font-semibold text-neutral-900">Choisir un créneau</h2>
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-accent" />
                <span className="flex h-2 w-2 rounded-full bg-neutral-200" />
              </div>
            </div>

            <div id="booking-calendar">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                  onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  aria-label="Mois précédent"
                >
                  ←
                </button>
                <span className="text-sm font-semibold text-neutral-900">
                  {MONTH_NAMES[month]} {year}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                  onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  aria-label="Mois suivant"
                >
                  →
                </button>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-400">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                  <div key={i} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1
                  const dateObj = new Date(year, month, d)
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const isPast = dateObj < today
                  const isAvailable = !!availableDays[dateStr]
                  const isDisabled = isPast || !isAvailable
                  const isSelected = dateStr === selectedDate

                  if (isDisabled) {
                    return (
                      <div
                        key={dateStr}
                        className="flex h-9 w-full items-center justify-center rounded-lg text-sm text-neutral-200"
                      >
                        {d}
                      </div>
                    )
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => selectDate(dateStr)}
                      className={
                        isSelected
                          ? 'flex h-9 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white'
                          : 'flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium text-neutral-900 transition hover:bg-accent/10'
                      }
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Créneaux</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slotsLoading ? (
                  <p className="col-span-full text-sm text-neutral-400">Chargement...</p>
                ) : slotsError ? (
                  <p className="col-span-full text-sm text-error">Erreur de chargement.</p>
                ) : slots.length === 0 ? (
                  <p className="col-span-full text-sm text-neutral-400">Aucun créneau ce jour.</p>
                ) : (
                  slots.map((slot) => {
                    const time = new Intl.DateTimeFormat('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: tz,
                    }).format(new Date(slot.start))
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => selectSlot(slot)}
                        className="rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-900 transition hover:border-accent hover:text-accent"
                      >
                        {time}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div id="step-recap">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                id="back-calendar"
                className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                onClick={() => setStep('calendar')}
                aria-label="Retour au calendrier"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <h2 className="text-base font-semibold text-neutral-900">Confirmer</h2>
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-accent" />
                <span className="flex h-2 w-2 rounded-full bg-accent" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900">{service.title}</p>
                {recapDatetime && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <CalendarDays className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                    <span>{recapDatetime}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                  {service.duration_minutes} min — {locLabel}
                </div>
                {service.price_cents !== null && service.price_cents > 0 && (
                  <p className="pt-1 text-sm font-semibold text-neutral-900">
                    {needsPayment && chargeLabel ? `À payer : ${chargeLabel}` : priceText}
                  </p>
                )}
              </div>

              {cancellationPolicyLabel ? (
                <p className="text-xs leading-relaxed text-neutral-500">{cancellationPolicyLabel}</p>
              ) : null}

              <div className="space-y-3">
                <div>
                  <label className="field-label" htmlFor="id-name">
                    Nom complet *
                  </label>
                  <input
                    id="id-name"
                    type="text"
                    required
                    autoComplete="name"
                    className="field"
                    placeholder="Jean Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="id-email">
                    Email *
                  </label>
                  <input
                    id="id-email"
                    type="email"
                    required
                    autoComplete="email"
                    className="field"
                    placeholder="jean@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="id-phone">
                    Téléphone
                  </label>
                  <input
                    id="id-phone"
                    type="tel"
                    autoComplete="tel"
                    className="field"
                    placeholder="06 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn--accent btn--block w-full"
                >
                  {submitting
                    ? 'Envoi...'
                    : needsPayment
                      ? `Payer ${chargeLabel ?? ''}`.trim()
                      : 'Confirmer le rendez-vous'}
                </button>
                <p className="mt-2 text-center text-xs text-neutral-400">
                  {needsPayment
                    ? 'Paiement sécurisé par Stripe. Vous recevrez un email de confirmation.'
                    : 'Vous recevrez un email de confirmation.'}
                </p>
              </form>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
