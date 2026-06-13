'use client'

import type { EventCreateFormState } from '../types'

type Props = {
  form: EventCreateFormState
  onChange: (patch: Partial<EventCreateFormState>) => void
}

export function StepEssentials({ form, onChange }: Props) {
  function err(field: string) {
    return form.fieldErrors[field]
  }

  const locationDetailsLabel =
    form.locationType === 'online'
      ? 'Lien visio'
      : 'Adresse / lieu'
  const locationDetailsPlaceholder =
    form.locationType === 'online' ? 'https://meet…' : 'Ex : 12 rue des Lilas, Nantes'

  return (
    <section className="pco__stage">
      <div className="pco__field">
        <label className="pco__label" htmlFor="ev-title">
          Titre <span className="pco__req">*</span>
        </label>
        <input
          id="ev-title"
          type="text"
          maxLength={120}
          className="pco__input"
          placeholder="Ex : Atelier branding en ligne"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {err('title') ? <p className="pco__error">{err('title')}</p> : null}
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="ev-description">
          Description courte
        </label>
        <textarea
          id="ev-description"
          rows={3}
          maxLength={500}
          className="pco__input"
          placeholder="Ce que les participants vont vivre / apprendre"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        {err('description') ? <p className="pco__error">{err('description')}</p> : null}
      </div>

      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="ev-start">
            Début <span className="pco__req">*</span>
          </label>
          <input
            id="ev-start"
            type="datetime-local"
            className="pco__input"
            value={form.startAt}
            onChange={(e) => onChange({ startAt: e.target.value })}
          />
          {err('start_at') ? <p className="pco__error">{err('start_at')}</p> : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="ev-end">
            Fin <span className="pco__hint">(optionnel)</span>
          </label>
          <input
            id="ev-end"
            type="datetime-local"
            className="pco__input"
            value={form.endAt}
            onChange={(e) => onChange({ endAt: e.target.value })}
          />
          {err('end_at') ? <p className="pco__error">{err('end_at')}</p> : null}
        </div>
      </div>

      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="ev-location">
            Lieu <span className="pco__req">*</span>
          </label>
          <select
            id="ev-location"
            className="pco__input"
            value={form.locationType}
            onChange={(e) =>
              onChange({ locationType: e.target.value as EventCreateFormState['locationType'] })
            }
          >
            <option value="online">En ligne</option>
            <option value="in_person">En personne</option>
          </select>
          {err('location_type') ? <p className="pco__error">{err('location_type')}</p> : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="ev-capacity">
            Places <span className="pco__hint">(vide = illimité)</span>
          </label>
          <input
            id="ev-capacity"
            type="number"
            min={1}
            step={1}
            className="pco__input"
            placeholder="Ex : 20"
            value={form.capacity}
            onChange={(e) => onChange({ capacity: e.target.value })}
          />
          {err('capacity') ? <p className="pco__error">{err('capacity')}</p> : null}
        </div>
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="ev-location-details">
          {locationDetailsLabel}{' '}
          <span className="pco__hint">(communiqué sur la page de l&apos;event)</span>
        </label>
        <input
          id="ev-location-details"
          type="text"
          maxLength={300}
          className="pco__input"
          placeholder={locationDetailsPlaceholder}
          value={form.locationDetails}
          onChange={(e) => onChange({ locationDetails: e.target.value })}
        />
        {err('location_details') ? <p className="pco__error">{err('location_details')}</p> : null}
      </div>

      <div className="pco__field">
        <label className="pco__label" htmlFor="ev-price">
          Prix (€) <span className="pco__hint">(vide = gratuit)</span>
        </label>
        <input
          id="ev-price"
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
    </section>
  )
}
