'use client'

import type { ServiceCreateFormState } from '../types'

type Props = {
  form: ServiceCreateFormState
  onChange: (patch: Partial<ServiceCreateFormState>) => void
}

export function StepBooking({ form, onChange }: Props) {
  function err(field: string) {
    return form.fieldErrors[field]
  }

  return (
    <section className="pco__stage">
      <div className="pco__field pco__publish">
        <label className="pco__switch">
          <input
            type="checkbox"
            checked={form.autoAcceptBookings}
            onChange={(e) => onChange({ autoAcceptBookings: e.target.checked })}
          />
          <span className="pco__switch-track" aria-hidden="true">
            <span className="pco__switch-thumb" />
          </span>
          <span className="pco__switch-label">
            Accepter automatiquement les réservations{' '}
            <span className="pco__switch-hint">(sinon tu valides chaque demande)</span>
          </span>
        </label>
      </div>

      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-notice">
            Préavis minimum (heures)
          </label>
          <input
            id="svc-notice"
            type="number"
            min={0}
            max={720}
            step={1}
            className="pco__input"
            value={form.minNoticeHours}
            onChange={(e) => onChange({ minNoticeHours: e.target.value })}
          />
          <p className="pco__hint-block">Délai minimum entre la réservation et le rendez-vous.</p>
          {err('min_notice_hours') ? <p className="pco__error">{err('min_notice_hours')}</p> : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-advance">
            Réservation max à l&apos;avance (jours)
          </label>
          <input
            id="svc-advance"
            type="number"
            min={1}
            max={365}
            step={1}
            className="pco__input"
            value={form.maxAdvanceDays}
            onChange={(e) => onChange({ maxAdvanceDays: e.target.value })}
          />
          <p className="pco__hint-block">Au-delà, aucun créneau n&apos;est proposé.</p>
          {err('max_advance_days') ? <p className="pco__error">{err('max_advance_days')}</p> : null}
        </div>
      </div>

      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-buffer-before">
            Battement avant (minutes)
          </label>
          <input
            id="svc-buffer-before"
            type="number"
            min={0}
            max={480}
            step={5}
            className="pco__input"
            value={form.bufferBeforeMinutes}
            onChange={(e) => onChange({ bufferBeforeMinutes: e.target.value })}
          />
          {err('buffer_before_minutes') ? (
            <p className="pco__error">{err('buffer_before_minutes')}</p>
          ) : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-buffer-after">
            Battement après (minutes)
          </label>
          <input
            id="svc-buffer-after"
            type="number"
            min={0}
            max={480}
            step={5}
            className="pco__input"
            value={form.bufferAfterMinutes}
            onChange={(e) => onChange({ bufferAfterMinutes: e.target.value })}
          />
          {err('buffer_after_minutes') ? (
            <p className="pco__error">{err('buffer_after_minutes')}</p>
          ) : null}
        </div>
      </div>
      <p className="pco__hint-block">
        Le battement bloque du temps avant/après chaque rendez-vous (préparation, déplacement…).
      </p>

      <div className="pco__field pco__publish">
        <label className="pco__switch">
          <input
            type="checkbox"
            checked={form.paymentRequired}
            onChange={(e) => onChange({ paymentRequired: e.target.checked })}
          />
          <span className="pco__switch-track" aria-hidden="true">
            <span className="pco__switch-thumb" />
          </span>
          <span className="pco__switch-label">
            Paiement en ligne obligatoire{' '}
            <span className="pco__switch-hint">(si un prix est défini à l’étape 1)</span>
          </span>
        </label>
      </div>

      {form.paymentRequired ? (
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-deposit">
            Montant exigé à la réservation
          </label>
          <select
            id="svc-deposit"
            className="pco__input"
            value={form.depositPercent}
            onChange={(e) => onChange({ depositPercent: e.target.value })}
          >
            <option value="100">100 % — paiement total</option>
            <option value="50">50 % — acompte</option>
            <option value="30">30 % — acompte</option>
          </select>
          {err('deposit_percent') ? <p className="pco__error">{err('deposit_percent')}</p> : null}
        </div>
      ) : null}

      <div className="pco__field">
        <label className="pco__label" htmlFor="svc-cancel-min">
          Délai d’annulation minimum (heures)
        </label>
        <input
          id="svc-cancel-min"
          type="number"
          min={0}
          max={720}
          step={1}
          className="pco__input"
          value={form.cancelMinHours}
          onChange={(e) => onChange({ cancelMinHours: e.target.value })}
        />
        <p className="pco__hint-block">
          Le client ne peut plus annuler en deçà de ce délai avant le créneau. 0 = jusqu’au début.
        </p>
        {err('cancel_min_hours') ? <p className="pco__error">{err('cancel_min_hours')}</p> : null}
      </div>
    </section>
  )
}
