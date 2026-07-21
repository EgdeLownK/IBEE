'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Loader2, Ticket, User, UserPlus, X } from 'lucide-react'
import {
  createManualRegistrationAction,
  loadManualParticipantFormAction,
} from '@/app/dashboard/billetterie-actions'
import { ManualRegContactPanel } from '@/components/dashboard/activite/ManualRegContactPanel'

type FormData = {
  event: { id: string; title: string; slug: string }
  entitySlug: string
  places: Array<{ id: string; title: string }>
  ticketTypes: Array<{ id: string; title: string; activityId: string | null; priceCents: number }>
}

type Props = {
  eventId: string | null
  open: boolean
  onClose: () => void
}

export function EventAddParticipantOverlay({ eventId, open, onClose }: Props) {
  const [formData, setFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastTicketCode, setLastTicketCode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [activityId, setActivityId] = useState('')
  const [ticketTypeId, setTicketTypeId] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !eventId) {
      setFormData(null)
      setError('')
      setShowSuccess(false)
      setLastTicketCode(null)
      setName('')
      setEmail('')
      setPhone('')
      setActivityId('')
      setTicketTypeId('')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setShowSuccess(false)
    setLastTicketCode(null)

    void loadManualParticipantFormAction(eventId).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error ?? 'Impossible de charger le formulaire.')
        return
      }
      setFormData({
        event: result.event,
        entitySlug: result.entitySlug,
        places: result.places,
        ticketTypes: result.ticketTypes,
      })
      if (result.places.length === 1) {
        setActivityId(result.places[0].id)
      }
    })

    return () => {
      cancelled = true
    }
  }, [eventId, open])

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

  const visibleTicketTypes =
    formData?.ticketTypes.filter((ticket) => {
      if (!activityId) return true
      return !ticket.activityId || ticket.activityId === activityId
    }) ?? []

  const showBilletterieSection =
    (formData?.places.length ?? 0) > 0 || visibleTicketTypes.length > 0

  function resetFormFields() {
    setName('')
    setEmail('')
    setPhone('')
    setTicketTypeId('')
    setError('')
    setShowSuccess(false)
    setLastTicketCode(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!eventId) return

    setError('')
    setShowSuccess(false)
    setLastTicketCode(null)

    startTransition(async () => {
      const result = await createManualRegistrationAction({
        eventId,
        name,
        email,
        phone: phone || null,
        activityId: activityId || null,
        ticketTypeId: ticketTypeId || null,
      })

      if (!result.ok) {
        setError(result.error ?? 'Impossible d’ajouter ce participant.')
        return
      }

      setShowSuccess(true)
      setLastTicketCode(result.ticketCode ?? null)
      setName('')
      setEmail('')
      setPhone('')
      setTicketTypeId('')
    })
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="pco-root" role="presentation">
      <button type="button" className="pco-root__backdrop" aria-label="Fermer" onClick={onClose} />
      <div
        className="pco__panel event-manual-reg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-participant-title"
      >
        <header className="pco__header event-manual-reg__header">
          <div className="event-manual-reg__header-text">
            <p className="event-manual-reg__eyebrow">
              <UserPlus className="event-manual-reg__eyebrow-icon" aria-hidden="true" />
              Inscription manuelle
            </p>
            <h2 id="add-participant-title" className="pco__title">
              {formData?.event.title ?? 'Ajouter un participant'}
            </h2>
          </div>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading ? (
          <div className="event-manual-reg__state">
            <Loader2 className="event-manual-reg__state-icon animate-spin" aria-hidden="true" />
            <p>Chargement du formulaire…</p>
          </div>
        ) : error && !formData ? (
          <div className="event-manual-reg__state">
            <p className="event-manual-reg__state-error">{error}</p>
            <button type="button" className="pco__btn pco__btn--ghost" onClick={onClose}>
              Fermer
            </button>
          </div>
        ) : showSuccess ? (
          <>
            <div className="pco__scroll">
              <div className="event-manual-reg__success">
                <div className="event-manual-reg__success-icon" aria-hidden="true">
                  <CheckCircle2 />
                </div>
                <h3 className="event-manual-reg__success-title">Participant inscrit</h3>
                <p className="event-manual-reg__success-text">
                  L’inscription est enregistrée sans paiement en ligne. Communiquez ce code au participant
                  pour le check-in.
                </p>
                {lastTicketCode ? (
                  <div className="event-manual-reg__ticket">
                    <span className="event-manual-reg__ticket-label">Code billet</span>
                    <code className="event-manual-reg__ticket-code">{lastTicketCode}</code>
                  </div>
                ) : null}
              </div>
            </div>
            <footer className="pco__actions">
              <div className="pco__actions-start">
                <button type="button" className="pco__btn pco__btn--ghost" onClick={resetFormFields}>
                  Ajouter un autre
                </button>
              </div>
              <div className="pco__actions-end">
                <button type="button" className="pco__btn pco__btn--primary" onClick={onClose}>
                  Terminer
                </button>
              </div>
            </footer>
          </>
        ) : (
          <form className="pco__form" onSubmit={submit} noValidate>
            <div className="pco__scroll">
              <div className="pco__stage">
                <p className="event-manual-reg__info">
                  Créez une inscription hors billetterie en ligne. Un code billet unique est généré
                  automatiquement.
                </p>

                <section className="event-manual-reg__section" aria-labelledby="manual-reg-contact">
                  <div className="event-manual-reg__section-head">
                    <h3 id="manual-reg-contact" className="event-manual-reg__section-title">
                      <User className="event-manual-reg__section-icon" aria-hidden="true" />
                      Contact
                    </h3>
                  </div>

                  {formData ? (
                    <ManualRegContactPanel
                      eventId={formData.event.id}
                      entitySlug={formData.entitySlug}
                      eventSlug={formData.event.slug}
                      onContactFilled={(contact) => {
                        setName(contact.name)
                        setEmail(contact.email)
                        setPhone(contact.phone)
                        setError('')
                      }}
                    />
                  ) : null}

                  <div className="event-manual-reg__section-body">
                    <div className="pco__field">
                      <label className="pco__label" htmlFor="manual-participant-name">
                        Nom complet <span className="pco__req">*</span>
                      </label>
                      <input
                        id="manual-participant-name"
                        className="pco__input"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jean Dupont"
                      />
                    </div>

                    <div className="pco__row">
                      <div className="pco__field">
                        <label className="pco__label" htmlFor="manual-participant-email">
                          Email <span className="pco__req">*</span>
                        </label>
                        <input
                          id="manual-participant-email"
                          type="email"
                          className="pco__input"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jean@exemple.com"
                        />
                      </div>

                      <div className="pco__field">
                        <label className="pco__label" htmlFor="manual-participant-phone">
                          Téléphone
                        </label>
                        <input
                          id="manual-participant-phone"
                          type="tel"
                          className="pco__input"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="06 12 34 56 78"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {showBilletterieSection ? (
                  <section className="event-manual-reg__section" aria-labelledby="manual-reg-ticket">
                    <h3 id="manual-reg-ticket" className="event-manual-reg__section-title">
                      <Ticket className="event-manual-reg__section-icon" aria-hidden="true" />
                      Billetterie
                    </h3>
                    <div className="event-manual-reg__section-body">
                      {formData && formData.places.length === 1 ? (
                        <div className="event-manual-reg__place-chip">
                          <span className="event-manual-reg__place-chip-label">Place</span>
                          <span>{formData.places[0].title}</span>
                        </div>
                      ) : null}

                      {formData && formData.places.length > 1 ? (
                        <div className="pco__field">
                          <label className="pco__label" htmlFor="manual-participant-place">
                            Place <span className="pco__req">*</span>
                          </label>
                          <select
                            id="manual-participant-place"
                            className="pco__input"
                            required
                            value={activityId}
                            onChange={(e) => {
                              setActivityId(e.target.value)
                              setTicketTypeId('')
                            }}
                          >
                            <option value="">Choisir une place…</option>
                            {formData.places.map((place) => (
                              <option key={place.id} value={place.id}>
                                {place.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {visibleTicketTypes.length > 0 ? (
                        <div className="pco__field">
                          <label className="pco__label" htmlFor="manual-participant-ticket">
                            Type de billet
                          </label>
                          <select
                            id="manual-participant-ticket"
                            className="pco__input"
                            value={ticketTypeId}
                            onChange={(e) => setTicketTypeId(e.target.value)}
                          >
                            <option value="">Par défaut</option>
                            {visibleTicketTypes.map((ticket) => (
                              <option key={ticket.id} value={ticket.id}>
                                {ticket.title}
                                {ticket.priceCents > 0 ? ' (offert)' : ''}
                              </option>
                            ))}
                          </select>
                          <p className="pco__hint-block">
                            L’inscription manuelle ne déclenche pas de paiement.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {error ? (
                  <p className="pco__error" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <footer className="pco__actions">
              <div className="pco__actions-start">
                <button type="button" className="pco__btn pco__btn--ghost" onClick={onClose}>
                  Annuler
                </button>
              </div>
              <div className="pco__actions-end">
                <button type="submit" className="pco__btn pco__btn--primary" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  <span>{pending ? 'Ajout…' : 'Ajouter le participant'}</span>
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
