'use client'

import { useState } from 'react'

interface Props {
  eventId: string
  statusAvailable: boolean
  initialName?: string
  initialEmail?: string
}

export function EventRegistrationWidget({
  eventId,
  statusAvailable,
  initialName = '',
  initialEmail = '',
}: Props) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!statusAvailable) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          message: message.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'inscription.')
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Erreur réseau. Réessayez.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <section className="event-register px-[22px] pb-6">
        <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-5 text-center">
          <p className="m-0 text-sm font-semibold text-success">Inscription enregistrée !</p>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            Vous recevrez un email de confirmation si l&apos;organisateur l&apos;a activé.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="inscription" className="event-register px-[22px] pb-6">
      <h2 className="m-0 mb-4 font-display text-[17px] font-semibold text-neutral-900">S&apos;inscrire</h2>
      <form
        onSubmit={handleSubmit}
        className="booking-panel space-y-3 rounded-2xl border border-border bg-surface p-[18px] md:p-[22px]"
      >
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
        {error && <p className="m-0 text-sm text-error">{error}</p>}
        <button type="submit" disabled={submitting} className="btn btn--accent btn--block w-full">
          {submitting ? 'Envoi...' : 'Confirmer mon inscription'}
        </button>
      </form>
    </section>
  )
}
