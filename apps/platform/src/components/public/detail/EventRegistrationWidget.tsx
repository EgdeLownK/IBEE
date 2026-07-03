'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDetailPrice } from '@/lib/detail-format'
import type { EventRegistrationField } from '@/lib/event-registration-fields'

export type EventTicketTypeOption = {
  id: string
  activityId?: string | null
  title: string
  priceCents: number
  currency: string
  priceLabel: string
}

export type EventActivityOption = {
  id: string
  title: string
  slotLabel: string
  statusAvailable: boolean
  remaining: number | null
  ticketTypes: EventTicketTypeOption[]
}

interface Props {
  eventId: string
  entityId: string
  entitySlug: string
  eventSlug: string
  statusAvailable: boolean
  ticketTypes: EventTicketTypeOption[]
  activities?: EventActivityOption[]
  hasActivities?: boolean
  registrationFields: EventRegistrationField[]
  cancellationPolicyLabel?: string
  initialName?: string
  initialEmail?: string
}

export function EventRegistrationWidget({
  eventId,
  entityId,
  entitySlug,
  eventSlug,
  statusAvailable,
  ticketTypes,
  activities = [],
  hasActivities = false,
  registrationFields,
  cancellationPolicyLabel,
  initialName = '',
  initialEmail = '',
}: Props) {
  const availableActivities = useMemo(
    () => activities.filter((activity) => activity.statusAvailable && activity.ticketTypes.length > 0),
    [activities]
  )

  const [selectedActivityId, setSelectedActivityId] = useState(availableActivities[0]?.id ?? '')

  const visibleTicketTypes = useMemo(() => {
    if (!hasActivities) return ticketTypes
    return availableActivities.find((activity) => activity.id === selectedActivityId)?.ticketTypes ?? []
  }, [availableActivities, hasActivities, selectedActivityId, ticketTypes])

  const defaultTicketId = useMemo(() => {
    if (visibleTicketTypes.length === 0) return ''
    const free = visibleTicketTypes.find((t) => t.priceCents <= 0)
    return free?.id ?? visibleTicketTypes[0].id
  }, [visibleTicketTypes])

  const [selectedTicketId, setSelectedTicketId] = useState(defaultTicketId)

  useEffect(() => {
    setSelectedTicketId(defaultTicketId)
  }, [defaultTicketId, selectedActivityId])

  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ticketCode, setTicketCode] = useState('')
  const [error, setError] = useState('')

  const selectedTicket = visibleTicketTypes.find((t) => t.id === selectedTicketId) ?? null
  const needsPayment = selectedTicket != null && selectedTicket.priceCents > 0
  const showActivityPicker = hasActivities && availableActivities.length > 0
  const showTicketPicker = visibleTicketTypes.length > 1

  if (!statusAvailable) return null

  function buildFormAnswers(): Record<string, string | boolean> {
    const answers: Record<string, string | boolean> = {}
    for (const field of registrationFields) {
      answers[field.id] = customAnswers[field.id] ?? (field.type === 'checkbox' ? false : '')
    }
    return answers
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const formAnswers = buildFormAnswers()
    const payload = {
      eventId,
      activityId: hasActivities && selectedActivityId ? selectedActivityId : null,
      ticketTypeId: selectedTicketId || null,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      message: message.trim() || null,
      formAnswers,
    }

    try {
      if (needsPayment) {
        const res = await fetch('/api/checkout/create-event-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId,
            entitySlug,
            eventSlug,
            eventId,
            ticketTypeId: selectedTicketId,
            attendeeName: payload.name,
            attendeeEmail: payload.email,
            attendeePhone: payload.phone,
            attendeeMessage: payload.message,
            promoCode: promoCode.trim() || null,
            formAnswers,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Erreur lors du paiement.')
          setSubmitting(false)
          return
        }
        if (data.url) {
          window.location.href = data.url
          return
        }
        setError('Impossible de démarrer le paiement.')
        setSubmitting(false)
        return
      }

      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'inscription.')
        setSubmitting(false)
        return
      }
      setTicketCode(data.ticketCode ?? '')
      setSuccess(true)
    } catch {
      setError('Erreur réseau. Réessayez.')
      setSubmitting(false)
    }
  }

  if (success) {
    const billetHref =
      ticketCode && entitySlug && eventSlug
        ? `/${entitySlug}/events/${eventSlug}/billet?code=${encodeURIComponent(ticketCode)}`
        : null

    return (
      <section className="event-register px-[22px] pb-6">
        <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-5 text-center">
          <p className="m-0 text-sm font-semibold text-success">Inscription enregistrée !</p>
          {ticketCode ? (
            <p className="m-0 mt-2 text-sm text-neutral-700">
              Votre code billet : <strong>{ticketCode}</strong>
            </p>
          ) : null}
          {billetHref ? (
            <p className="m-0 mt-2">
              <a href={billetHref} className="text-sm font-medium text-accent underline">
                Voir mon billet
              </a>
            </p>
          ) : (
            <p className="m-0 mt-1 text-sm text-neutral-600">
              Vous recevrez un email de confirmation si l&apos;organisateur l&apos;a activé.
            </p>
          )}
        </div>
      </section>
    )
  }

  const ctaLabel = needsPayment
    ? `Payer ${selectedTicket ? formatDetailPrice(selectedTicket.priceCents, selectedTicket.currency) : ''}`
    : 'Confirmer mon inscription'

  return (
    <section id="inscription" className="event-register px-[22px] pb-6">
      <h2 className="m-0 mb-4 font-display text-[17px] font-semibold text-neutral-900">S&apos;inscrire</h2>
      <form
        onSubmit={handleSubmit}
        className="booking-panel space-y-3 rounded-2xl border border-border bg-surface p-[18px] md:p-[22px]"
      >
        {showActivityPicker ? (
          <div>
            <span className="field-label">Place *</span>
            <div className="mt-2 space-y-2">
              {availableActivities.map((activity) => (
                <label
                  key={activity.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    selectedActivityId === activity.id ? 'border-accent bg-accent/5' : 'border-border'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="event-activity"
                      value={activity.id}
                      checked={selectedActivityId === activity.id}
                      onChange={() => setSelectedActivityId(activity.id)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-neutral-900">{activity.title}</span>
                      <span className="block text-xs text-neutral-500">{activity.slotLabel}</span>
                    </span>
                  </span>
                  {activity.remaining != null ? (
                    <span className="text-xs text-neutral-500">
                      {activity.remaining > 0 ? `${activity.remaining} place${activity.remaining > 1 ? 's' : ''}` : 'Complet'}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {showTicketPicker ? (
          <div>
            <span className="field-label">Type de billet *</span>
            <div className="mt-2 space-y-2">
              {visibleTicketTypes.map((ticket) => (
                <label
                  key={ticket.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    selectedTicketId === ticket.id ? 'border-accent bg-accent/5' : 'border-border'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ticket-type"
                      value={ticket.id}
                      checked={selectedTicketId === ticket.id}
                      onChange={() => setSelectedTicketId(ticket.id)}
                    />
                    <span className="text-sm font-medium text-neutral-900">{ticket.title}</span>
                  </span>
                  <span className="text-sm font-semibold text-neutral-800">{ticket.priceLabel}</span>
                </label>
              ))}
            </div>
          </div>
        ) : selectedTicket && selectedTicket.priceCents > 0 ? (
          <p className="m-0 text-sm text-neutral-700">
            Tarif : <strong>{selectedTicket.priceLabel}</strong>
          </p>
        ) : null}

        {needsPayment ? (
          <div>
            <label className="field-label" htmlFor="event-reg-promo">
              Code promo
            </label>
            <input
              id="event-reg-promo"
              className="field"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="EARLYBIRD"
            />
          </div>
        ) : null}

        <div>
          <label className="field-label" htmlFor="event-reg-name">
            Nom complet *
          </label>
          <input
            id="event-reg-name"
            type="text"
            required
            maxLength={200}
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="event-reg-email">
            Email *
          </label>
          <input
            id="event-reg-email"
            type="email"
            required
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jean@exemple.com"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="event-reg-phone">
            Téléphone
          </label>
          <input
            id="event-reg-phone"
            type="tel"
            className="field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>

        {registrationFields.map((field) => (
          <div key={field.id}>
            {field.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(customAnswers[field.id])}
                  onChange={(e) =>
                    setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.checked }))
                  }
                />
                {field.label}
                {field.required ? ' *' : ''}
              </label>
            ) : field.type === 'textarea' ? (
              <>
                <label className="field-label" htmlFor={`field-${field.id}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                <textarea
                  id={`field-${field.id}`}
                  className="field resize-none"
                  rows={3}
                  required={field.required}
                  value={String(customAnswers[field.id] ?? '')}
                  onChange={(e) =>
                    setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              </>
            ) : field.type === 'select' ? (
              <>
                <label className="field-label" htmlFor={`field-${field.id}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                <select
                  id={`field-${field.id}`}
                  className="field"
                  required={field.required}
                  value={String(customAnswers[field.id] ?? '')}
                  onChange={(e) =>
                    setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                >
                  <option value="">Choisir…</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="field-label" htmlFor={`field-${field.id}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                <input
                  id={`field-${field.id}`}
                  className="field"
                  required={field.required}
                  value={String(customAnswers[field.id] ?? '')}
                  onChange={(e) =>
                    setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              </>
            )}
          </div>
        ))}

        <div>
          <label className="field-label" htmlFor="event-reg-message">
            Message
          </label>
          <textarea
            id="event-reg-message"
            rows={3}
            maxLength={2000}
            className="field resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Une question pour l'organisateur ?"
          />
        </div>

        {cancellationPolicyLabel ? (
          <p className="m-0 text-xs text-neutral-500">{cancellationPolicyLabel}</p>
        ) : null}

        {error && <p className="m-0 text-sm text-error">{error}</p>}
        <button type="submit" disabled={submitting} className="btn btn--accent btn--block w-full">
          {submitting ? 'Envoi...' : ctaLabel}
        </button>
      </form>
    </section>
  )
}
