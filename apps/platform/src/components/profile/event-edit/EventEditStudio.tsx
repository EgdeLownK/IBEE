'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { getActivityModuleLabel } from '@/lib/activity-modules'
import {
  deleteEventActivityAction,
  deleteEventPromoCodeAction,
  deleteEventTicketTypeAction,
  saveEventActivityAction,
  saveEventPromoCodeAction,
  saveEventRegistrationSettingsAction,
  saveEventTicketTypeAction,
} from '@/app/dashboard/site/event-ticket-actions'
import type { EventEditData } from '@/lib/load-event-edit'
import type { EventRegistrationField, EventRegistrationFieldType } from '@/lib/event-registration-fields'

type ActivityRow = EventEditData['activities'][number]

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function ActivityEditRow({
  activity,
  eventId,
  pending,
  run,
  onDelete,
  onSaved,
}: {
  activity: ActivityRow
  eventId: string
  pending: boolean
  run: (action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) => void
  onDelete: () => void
  onSaved: (patch: Partial<ActivityRow>) => void
}) {
  const [title, setTitle] = useState(activity.title)
  const [startAt, setStartAt] = useState(toDatetimeLocalValue(activity.startAt))
  const [endAt, setEndAt] = useState(activity.endAt ? toDatetimeLocalValue(activity.endAt) : '')
  const [capacity, setCapacity] = useState(activity.capacity?.toString() ?? '')

  const isDirty =
    title !== activity.title ||
    startAt !== toDatetimeLocalValue(activity.startAt) ||
    endAt !== (activity.endAt ? toDatetimeLocalValue(activity.endAt) : '') ||
    capacity !== (activity.capacity?.toString() ?? '')

  function save() {
    if (!title.trim() || !startAt) return

    run(
      () =>
        saveEventActivityAction({
          eventId,
          activityId: activity.id,
          title,
          startAt,
          endAt: endAt || null,
          capacity: capacity || null,
        }),
      () =>
        onSaved({
          title: title.trim(),
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : null,
          capacity: capacity.trim() ? Number(capacity) : null,
        })
    )
  }

  return (
    <li className="event-activity-edit rounded-xl border border-border p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="field md:col-span-2"
          placeholder="Titre (ex. Foot, Basket)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="field"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <input
          className="field"
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
        />
        <div className="md:col-span-2">
          <label className="field-label" htmlFor={`activity-capacity-${activity.id}`}>
            Participants max <span className="text-neutral-500">(vide = illimité)</span>
          </label>
          <input
            id={`activity-capacity-${activity.id}`}
            className="field max-w-[200px]"
            type="number"
            min={1}
            step={1}
            placeholder="Ex. 25"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn--accent btn--sm"
          disabled={pending || !isDirty || !title.trim() || !startAt}
          onClick={save}
        >
          Enregistrer
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      </div>
    </li>
  )
}

type Props = {
  data: EventEditData
  publicEventHref: string
  embedded?: boolean
}

const FIELD_TYPES: { id: EventRegistrationFieldType; label: string }[] = [
  { id: 'text', label: 'Texte court' },
  { id: 'textarea', label: 'Texte long' },
  { id: 'select', label: 'Liste' },
  { id: 'checkbox', label: 'Case à cocher' },
]

export function EventEditStudio({ data, publicEventHref, embedded = false }: Props) {
  const [activities, setActivities] = useState(data.activities)
  const [ticketTypes, setTicketTypes] = useState(data.ticketTypes)
  const [promoCodes, setPromoCodes] = useState(data.promoCodes)
  const [cancelMinHours, setCancelMinHours] = useState(String(data.event.cancelMinHours))
  const [fields, setFields] = useState<EventRegistrationField[]>(data.event.registrationFields)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  const [newTicket, setNewTicket] = useState({
    activityId: '',
    title: '',
    priceEuros: '',
    quota: '',
    salesStartAt: '',
    salesEndAt: '',
  })

  const [newActivity, setNewActivity] = useState({
    title: '',
    startAt: '',
    endAt: '',
    capacity: '',
  })

  const hasActivities = activities.length > 0

  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: '',
    maxUses: '',
    endsAt: '',
  })

  const sortedTicketTypes = useMemo(
    () => [...ticketTypes].sort((a, b) => a.title.localeCompare(b.title)),
    [ticketTypes]
  )

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    setMessage('')
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setMessage(result.error ?? 'Erreur.')
        return
      }
      setMessage('Enregistré.')
      onSuccess?.()
    })
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: 'Nouveau champ', type: 'text', required: false },
    ])
  }

  return (
    <div className={embedded ? 'px-1 py-2' : 'mx-auto max-w-3xl px-4 py-8'}>
      {!embedded ? (
        <Link href="/dashboard/site" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au studio
        </Link>
      ) : null}

      <header className={embedded ? 'mb-6' : 'mt-4 mb-8'}>
        {!embedded ? (
          <h1 className="m-0 text-2xl font-semibold text-neutral-900">{data.event.title}</h1>
        ) : null}
        <p className={`text-sm text-neutral-500${embedded ? '' : ' mt-1'}`}>
          {getActivityModuleLabel('events')}
          {!embedded ? (
            <>
              {' · '}
              <a href={publicEventHref} className="text-accent underline" target="_blank" rel="noopener noreferrer">
                Voir la page publique
              </a>
            </>
          ) : null}
        </p>
      </header>

      {message ? <p className="mb-4 text-sm text-neutral-700">{message}</p> : null}

      <section className="mb-10 rounded-2xl border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-semibold">Places</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Créneaux ou disciplines à l&apos;intérieur de l&apos;événement (foot, basket…). Les billets se
          rattachent ensuite à une place.
        </p>

        <ul className="mt-4 space-y-3">
          {activities.map((activity) => (
            <ActivityEditRow
              key={activity.id}
              activity={activity}
              eventId={data.event.id}
              pending={pending}
              run={run}
              onSaved={(patch) => {
                setActivities((prev) =>
                  prev.map((item) => (item.id === activity.id ? { ...item, ...patch } : item))
                )
              }}
              onDelete={() =>
                run(() => deleteEventActivityAction(data.event.id, activity.id), () =>
                  setActivities((prev) => prev.filter((item) => item.id !== activity.id))
                )
              }
            />
          ))}
        </ul>

        <p className="mt-4 text-sm font-medium text-neutral-800">Nouvelle place</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            className="field md:col-span-2"
            placeholder="Titre (ex. Foot, Basket)"
            value={newActivity.title}
            onChange={(e) => setNewActivity((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            className="field"
            type="datetime-local"
            value={newActivity.startAt}
            onChange={(e) => setNewActivity((p) => ({ ...p, startAt: e.target.value }))}
          />
          <input
            className="field"
            type="datetime-local"
            value={newActivity.endAt}
            onChange={(e) => setNewActivity((p) => ({ ...p, endAt: e.target.value }))}
          />
          <div className="md:col-span-2">
            <label className="field-label" htmlFor="new-activity-capacity">
              Participants max <span className="text-neutral-500">(vide = illimité)</span>
            </label>
            <input
              id="new-activity-capacity"
              className="field max-w-[200px]"
              type="number"
              min={1}
              step={1}
              placeholder="Ex. 25"
              value={newActivity.capacity}
              onChange={(e) => setNewActivity((p) => ({ ...p, capacity: e.target.value }))}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn btn--accent mt-3"
          disabled={pending || !newActivity.title.trim() || !newActivity.startAt}
          onClick={() =>
            run(
              () =>
                saveEventActivityAction({
                  eventId: data.event.id,
                  title: newActivity.title,
                  startAt: newActivity.startAt,
                  endAt: newActivity.endAt || null,
                  capacity: newActivity.capacity || null,
                }),
              () => {
                setNewActivity({ title: '', startAt: '', endAt: '', capacity: '' })
                window.location.reload()
              }
            )
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ajouter une place
        </button>
      </section>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-semibold">Types de billets</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {hasActivities
            ? 'Chaque billet est rattaché à une place.'
            : 'Tarifs, early-bird (dates de vente), quotas par type.'}
        </p>

        <ul className="mt-4 space-y-3">
          {sortedTicketTypes.map((ticket) => (
            <li key={ticket.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="m-0 font-medium">{ticket.title}</p>
                <p className="m-0 mt-1 text-sm text-neutral-600">
                  {(ticket.priceCents / 100).toFixed(2)} €
                  {ticket.activityId
                    ? ` · ${activities.find((a) => a.id === ticket.activityId)?.title ?? 'Place'}`
                    : ''}
                  {ticket.quota != null ? ` · quota ${ticket.quota}` : ''}
                  {!ticket.isActive ? ' · inactif' : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={pending}
                onClick={() =>
                  run(() => deleteEventTicketTypeAction(data.event.id, ticket.id), () =>
                    setTicketTypes((prev) => prev.filter((t) => t.id !== ticket.id))
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {hasActivities ? (
            <select
              className="field md:col-span-2"
              value={newTicket.activityId}
              onChange={(e) => setNewTicket((p) => ({ ...p, activityId: e.target.value }))}
            >
              <option value="">Choisir une place</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>
          ) : null}
          <input
            className="field"
            placeholder="Titre (ex. Early bird)"
            value={newTicket.title}
            onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            className="field"
            placeholder="Prix €"
            value={newTicket.priceEuros}
            onChange={(e) => setNewTicket((p) => ({ ...p, priceEuros: e.target.value }))}
          />
          <input
            className="field"
            placeholder="Quota (optionnel)"
            value={newTicket.quota}
            onChange={(e) => setNewTicket((p) => ({ ...p, quota: e.target.value }))}
          />
          <input
            className="field"
            type="datetime-local"
            value={newTicket.salesEndAt}
            onChange={(e) => setNewTicket((p) => ({ ...p, salesEndAt: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="btn btn--accent mt-3"
          disabled={
            pending ||
            !newTicket.title.trim() ||
            (hasActivities && !newTicket.activityId)
          }
          onClick={() =>
            run(
              () =>
                saveEventTicketTypeAction({
                  eventId: data.event.id,
                  activityId: hasActivities ? newTicket.activityId : null,
                  title: newTicket.title,
                  priceEuros: newTicket.priceEuros || '0',
                  quota: newTicket.quota || null,
                  salesEndAt: newTicket.salesEndAt || null,
                }),
              () => {
                setNewTicket({
                  activityId: '',
                  title: '',
                  priceEuros: '',
                  quota: '',
                  salesStartAt: '',
                  salesEndAt: '',
                })
                window.location.reload()
              }
            )
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ajouter un billet
        </button>
      </section>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-semibold">Formulaire d&apos;inscription</h2>
        <p className="mt-1 text-sm text-neutral-500">Champs collectés en plus du nom et de l&apos;email.</p>

        <div className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-4">
              <input
                className="field md:col-span-2"
                value={field.label}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, label: e.target.value } : f))
                  )
                }
              />
              <select
                className="field"
                value={field.type}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((f, i) =>
                      i === index ? { ...f, type: e.target.value as EventRegistrationFieldType } : f
                    )
                  )
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    setFields((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, required: e.target.checked } : f))
                    )
                  }
                />
                Obligatoire
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn--ghost" onClick={addField} disabled={fields.length >= 8}>
            Ajouter un champ
          </button>
          <button
            type="button"
            className="btn btn--accent"
            disabled={pending}
            onClick={() =>
              run(() =>
                saveEventRegistrationSettingsAction({
                  eventId: data.event.id,
                  cancelMinHours: Number(cancelMinHours) || 0,
                  registrationFields: fields,
                })
              )
            }
          >
            Enregistrer le formulaire
          </button>
        </div>

        <div className="mt-6">
          <label className="field-label" htmlFor="cancel-min-hours">
            Délai d&apos;annulation (heures)
          </label>
          <input
            id="cancel-min-hours"
            className="field max-w-[160px]"
            type="number"
            min={0}
            max={720}
            value={cancelMinHours}
            onChange={(e) => setCancelMinHours(e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-semibold">Codes promo</h2>
        <p className="mt-1 text-sm text-neutral-500">Réductions sur les billets payants de cet événement.</p>

        <ul className="mt-4 space-y-2">
          {promoCodes.map((promo) => (
            <li key={promo.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="font-mono text-sm font-semibold">{promo.code}</span>
              <span className="text-sm text-neutral-600">
                {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value} €`}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={pending}
                onClick={() =>
                  run(() => deleteEventPromoCodeAction(data.event.id, promo.id), () =>
                    setPromoCodes((prev) => prev.filter((p) => p.id !== promo.id))
                  )
                }
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="field"
            placeholder="CODE10"
            value={newPromo.code}
            onChange={(e) => setNewPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
          />
          <select
            className="field"
            value={newPromo.type}
            onChange={(e) =>
              setNewPromo((p) => ({ ...p, type: e.target.value as 'percentage' | 'fixed_amount' }))
            }
          >
            <option value="percentage">Pourcentage</option>
            <option value="fixed_amount">Montant fixe €</option>
          </select>
          <input
            className="field"
            placeholder="Valeur"
            value={newPromo.value}
            onChange={(e) => setNewPromo((p) => ({ ...p, value: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="btn btn--accent mt-3"
          disabled={pending || !newPromo.code.trim()}
          onClick={() =>
            run(
              () =>
                saveEventPromoCodeAction({
                  eventId: data.event.id,
                  code: newPromo.code,
                  type: newPromo.type,
                  value: newPromo.value,
                  maxUses: newPromo.maxUses || null,
                  endsAt: newPromo.endsAt || null,
                }),
              () => {
                setNewPromo({ code: '', type: 'percentage', value: '', maxUses: '', endsAt: '' })
                window.location.reload()
              }
            )
          }
        >
          Créer le code
        </button>
      </section>
    </div>
  )
}
