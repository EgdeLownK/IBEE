'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarClock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Tag,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Client } from '@ibee/supabase'
import { Input } from '@ibee/ui-react'
import { deleteClientAction, updateClientAction } from '../actions'

type BookingRow = {
  id: string
  start_at: string
  end_at: string
  status: string
  appointment_types: {
    title: string
    duration_minutes: number
    location_type: string
    location_details: string | null
    color: string | null
    price_cents: number | null
    promo_price_cents: number | null
  } | null
}

type Props = {
  client: Client
  bookings: BookingRow[]
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-warning/10 text-warning' },
  confirmed: { label: 'Confirmé', className: 'bg-success/10 text-success' },
  completed: { label: 'Terminé', className: 'bg-neutral-100 text-neutral-600' },
  cancelled: { label: 'Annulé', className: 'bg-error/10 text-error' },
  no_show: { label: 'Absent', className: 'bg-error/10 text-error' },
}

const LOCATION_ICON: Record<string, typeof Video> = {
  video: Video,
  in_person: MapPin,
  phone: Phone,
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function formatEuros(cents: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(cents / 100))
}

export function ClientDetail({ client, bookings }: Props) {
  const router = useRouter()
  const [name, setName] = useState(client.name)
  const [phone, setPhone] = useState(client.phone ?? '')
  const [notes, setNotes] = useState(client.notes ?? '')
  const [tags, setTags] = useState<string[]>(client.tags)
  const [tagDraft, setTagDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: client.name,
        phone: client.phone ?? '',
        notes: client.notes ?? '',
        tags: client.tags,
      }),
    [client.name, client.phone, client.notes, client.tags]
  )
  const currentSnapshot = JSON.stringify({ name, phone, notes, tags })
  const dirty = currentSnapshot !== initialSnapshot

  const addTag = () => {
    const trimmed = tagDraft.trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= 20) return
    setTags([...tags, trimmed])
    setTagDraft('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await updateClientAction(client.id, {
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      tags,
    })
    setSaving(false)
    if (result.success) {
      toast.success('Client enregistré.')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleDelete = () => {
    if (!confirm('Supprimer ce client ? Les rendez-vous resteront dans l\'historique.')) return
    startTransition(async () => {
      const result = await deleteClientAction(client.id)
      if (result.success) {
        toast.success('Client supprimé.')
        router.push('/dashboard/site/clients')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="mx-auto max-w-[960px] px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/site/clients')}
          aria-label="Retour"
          className="flex rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-neutral-900">{client.name || client.email}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-neutral-900">Informations</h2>

            <div className="flex flex-col gap-5">
              <Field label="Nom">
                <Input
                  variant="subtle"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du client"
                  maxLength={200}
                />
              </Field>

              <Field label="Email">
                <div className="rounded-md bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500">
                  {client.email}
                </div>
                <p className="mt-1 text-[11px] text-neutral-400">
                  L’email est la clé d’identification — non modifiable.
                </p>
              </Field>

              <Field label="Téléphone">
                <Input
                  variant="subtle"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s().\-]/g, ''))}
                  placeholder="Ex : +33 6 12 34 56 78"
                  maxLength={50}
                />
              </Field>

              <Field label="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Retirer le tag ${tag}`}
                        className="ml-0.5 rounded-full p-0.5 text-accent/70 transition hover:bg-accent/10 hover:text-accent"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    variant="subtle"
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="Ex : VIP, récurrent, pro"
                    maxLength={40}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!tagDraft.trim() || tags.length >= 20}
                    className="flex items-center gap-1 rounded-md bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </button>
                </div>
              </Field>

              <Field label="Notes privées">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 5000))}
                  placeholder="Notes visibles uniquement par toi : préférences, contexte, etc."
                  rows={5}
                  maxLength={5000}
                  className="w-full resize-none rounded-md bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:bg-neutral-0 focus:ring-2 focus:ring-accent/15"
                />
                <p className="mt-1 text-[11px] text-neutral-400">
                  {notes.length}/5000 — jamais partagées avec le client.
                </p>
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-end gap-4 border-t border-neutral-100 pt-5">
              {dirty && !saving && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  Modifications non enregistrées
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
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
          </section>

          <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-neutral-900">
              <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
              Historique des rendez-vous
              <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
                {bookings.length}
              </span>
            </h2>

            {bookings.length === 0 ? (
              <p className="py-8 text-center text-xs italic text-neutral-400">
                Aucun rendez-vous pour ce client.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {bookings.map((b) => {
                  const status = STATUS_LABEL[b.status] ?? STATUS_LABEL.pending!
                  const LocIcon =
                    LOCATION_ICON[b.appointment_types?.location_type ?? 'video'] ?? Video
                  const price = b.appointment_types?.promo_price_cents ?? b.appointment_types?.price_cents ?? 0
                  return (
                    <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-neutral-900">
                          {b.appointment_types?.title ?? 'Service supprimé'}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <span>{formatDate(b.start_at)}</span>
                          <span className="text-neutral-300">·</span>
                          <span className="tabular-nums">
                            {formatTime(b.start_at)} – {formatTime(b.end_at)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-sm bg-neutral-100 px-1.5 py-0.5 font-semibold">
                            <LocIcon className="h-2.5 w-2.5" />
                            {b.appointment_types?.location_type === 'video'
                              ? 'Visio'
                              : b.appointment_types?.location_type === 'in_person'
                              ? 'Sur place'
                              : 'Téléphone'}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {price > 0 && (
                          <span className="text-xs font-bold text-neutral-900">
                            {formatEuros(price)}€
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Statistiques</p>
            <dl className="mt-4 flex flex-col gap-3">
              <StatRow label="RDV effectués" value={client.bookings_count.toString()} />
              <StatRow
                label="Revenu total"
                value={`${formatEuros(client.total_revenue_cents)} €`}
              />
              <StatRow
                label="Dernier RDV"
                value={client.last_booking_at ? formatDate(client.last_booking_at) : '—'}
              />
              <StatRow
                label="Client depuis"
                value={formatDate(client.created_at)}
              />
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Contact</p>
            <div className="mt-3 flex flex-col gap-2 text-xs text-neutral-600">
              <a
                href={`mailto:${client.email}`}
                className="inline-flex items-center gap-2 truncate rounded-md px-2 py-1.5 transition hover:bg-neutral-50 hover:text-accent"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{client.email}</span>
              </a>
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-2 truncate rounded-md px-2 py-1.5 transition hover:bg-neutral-50 hover:text-accent"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-error/20 bg-error/5 p-5">
            <p className="text-xs font-bold text-error">Zone de danger</p>
            <p className="mt-1 text-[11px] text-neutral-600">
              Supprimer la fiche n’efface pas les rendez-vous. Si le client réserve à nouveau, une
              nouvelle fiche sera créée automatiquement.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-error/30 bg-neutral-0 px-4 py-2 text-xs font-bold text-error transition hover:bg-error/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer la fiche
            </button>
          </div>

          <Link
            href="/dashboard/site/appointments"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-xs font-bold text-neutral-600 transition hover:bg-neutral-50"
          >
            Voir tous les rendez-vous
          </Link>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-neutral-600">{label}</label>
      {children}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11px] text-neutral-500">{label}</dt>
      <dd className="truncate text-sm font-bold text-neutral-900">{value}</dd>
    </div>
  )
}
