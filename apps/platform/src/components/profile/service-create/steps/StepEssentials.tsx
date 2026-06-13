'use client'

import type { ServiceCreateFormState } from '../types'

type Props = {
  form: ServiceCreateFormState
  onChange: (patch: Partial<ServiceCreateFormState>) => void
}

export function StepEssentials({ form, onChange }: Props) {
  function err(field: string) {
    return form.fieldErrors[field]
  }

  return (
    <section className="pco__stage">
      <div className="pco__field">
        <label className="pco__label" htmlFor="svc-title">
          Titre <span className="pco__req">*</span>
        </label>
        <input
          id="svc-title"
          type="text"
          maxLength={120}
          className="pco__input"
          placeholder="Ex : Séance de coaching individuel"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {err('title') ? <p className="pco__error">{err('title')}</p> : null}
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="svc-description">
          Description courte
        </label>
        <textarea
          id="svc-description"
          rows={3}
          maxLength={500}
          className="pco__input"
          placeholder="Ce que le client obtient en réservant ce service"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        {err('description') ? <p className="pco__error">{err('description')}</p> : null}
      </div>

      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-duration">
            Durée (minutes) <span className="pco__req">*</span>
          </label>
          <input
            id="svc-duration"
            type="number"
            min={5}
            max={480}
            step={5}
            className="pco__input"
            value={form.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value })}
          />
          {err('duration_minutes') ? <p className="pco__error">{err('duration_minutes')}</p> : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-location">
            Lieu <span className="pco__req">*</span>
          </label>
          <select
            id="svc-location"
            className="pco__input"
            value={form.locationType}
            onChange={(e) =>
              onChange({ locationType: e.target.value as ServiceCreateFormState['locationType'] })
            }
          >
            <option value="video">Visio</option>
            <option value="phone">Téléphone</option>
            <option value="in_person">En personne</option>
          </select>
          {err('location_type') ? <p className="pco__error">{err('location_type')}</p> : null}
        </div>
      </div>

      {form.locationType === 'in_person' ? (
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-location-details">
            Adresse / détails du lieu
          </label>
          <input
            id="svc-location-details"
            type="text"
            maxLength={200}
            className="pco__input"
            placeholder="Ex : 12 rue des Lilas, Nantes"
            value={form.locationDetails}
            onChange={(e) => onChange({ locationDetails: e.target.value })}
          />
          {err('location_details') ? <p className="pco__error">{err('location_details')}</p> : null}
        </div>
      ) : null}

      <div className="pco__field">
        <label className="pco__label" htmlFor="svc-price">
          Prix (€) <span className="pco__hint">(vide = gratuit)</span>
        </label>
        <input
          id="svc-price"
          type="number"
          min={0}
          step={0.01}
          className="pco__input"
          placeholder="0,00"
          value={form.price}
          onChange={(e) => onChange({ price: e.target.value })}
        />
        {err('price_cents') ? <p className="pco__error">{err('price_cents')}</p> : null}
      </div>

      <div className="pco__field">
        <label className="pco__check">
          <input
            type="checkbox"
            checked={form.promoEnabled}
            onChange={(e) => onChange({ promoEnabled: e.target.checked })}
          />
          Proposer un prix promo
        </label>
      </div>

      {form.promoEnabled ? (
        <div className="pco__field">
          <label className="pco__label" htmlFor="svc-promo">
            Prix promo (€) <span className="pco__req">*</span>
          </label>
          <input
            id="svc-promo"
            type="number"
            min={0}
            step={0.01}
            className="pco__input"
            value={form.promoPrice}
            onChange={(e) => onChange({ promoPrice: e.target.value })}
          />
          {err('promo_price_cents') ? <p className="pco__error">{err('promo_price_cents')}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
