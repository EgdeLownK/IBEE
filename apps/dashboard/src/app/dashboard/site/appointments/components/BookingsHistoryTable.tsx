'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Filter, X, Check, AlertTriangle, Clock, CalendarClock } from 'lucide-react'
import { updateBookingStatusAction } from '../actions'

type BookingWithType = {
  id: string
  client_id: string | null
  booker_name: string
  booker_email: string
  booker_phone: string | null
  booker_message: string | null
  start_at: string
  end_at: string
  status: string
  notes: string | null
  appointment_types: {
    title: string
    duration_minutes: number
    location_type: string
    location_details: string | null
    color: string | null
  } | null
}

type Props = {
  upcoming: BookingWithType[]
  past: BookingWithType[]
}

const STATUS: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  pending: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    dot: 'bg-warning',
    label: 'En attente',
  },
  confirmed: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    dot: 'bg-success',
    label: 'Confirmé',
  },
  completed: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    border: 'border-neutral-200',
    dot: 'bg-neutral-400',
    label: 'Terminé',
  },
  cancelled: {
    bg: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/20',
    dot: 'bg-error',
    label: 'Annulé',
  },
  no_show: {
    bg: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/20',
    dot: 'bg-error',
    label: 'Absent',
  },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso)
  )
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function BookingsHistoryTable({ upcoming, past }: Props) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [cancelledOnly, setCancelledOnly] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const all = tab === 'upcoming' ? upcoming : past
  const rows = cancelledOnly ? all.filter((b) => b.status === 'cancelled' || b.status === 'no_show') : all

  const updateStatus = (id: string, next: 'confirmed' | 'cancelled' | 'completed' | 'no_show') => {
    setPendingId(id)
    startTransition(async () => {
      await updateBookingStatusAction(id, next, next === 'cancelled' ? 'owner' : undefined)
      window.location.reload()
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={`-mb-px border-b-2 pb-2 text-sm font-bold transition ${
              tab === 'upcoming'
                ? 'border-accent text-accent'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            À venir ({upcoming.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={`-mb-px border-b-2 pb-2 text-sm font-bold transition ${
              tab === 'past'
                ? 'border-accent text-accent'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Passés ({past.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCancelledOnly((v) => !v)}
          className={`flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold transition ${
            cancelledOnly
              ? 'border-error/20 bg-error/10 text-error'
              : 'border-neutral-200 bg-neutral-0 text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {cancelledOnly ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
          {cancelledOnly ? 'Effacer le filtre' : 'Annulés uniquement'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-16 text-center">
          <CalendarClock className="h-10 w-10 text-neutral-300" aria-hidden />
          <p className="mt-4 text-sm font-medium text-neutral-600">
            {tab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Les rendez-vous apparaîtront ici quand des clients réserveront.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50">
                <Th>Service</Th>
                <Th>Client</Th>
                <Th>Date</Th>
                <Th>Heure</Th>
                <Th>Statut</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const s = STATUS[b.status] ?? STATUS.pending!
                const canAct = b.status === 'pending' || b.status === 'confirmed'
                const isPending = pendingId === b.id
                return (
                  <tr
                    key={b.id}
                    className="border-t border-neutral-100 transition hover:bg-neutral-50"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">
                      {b.appointment_types?.title ?? 'Service supprimé'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                          {b.booker_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {b.client_id ? (
                            <Link
                              href={`/dashboard/site/clients/${b.client_id}`}
                              className="block truncate text-xs font-semibold text-neutral-900 transition hover:text-accent"
                            >
                              {b.booker_name}
                            </Link>
                          ) : (
                            <p className="truncate text-xs font-semibold text-neutral-900">{b.booker_name}</p>
                          )}
                          <p className="truncate text-[11px] text-neutral-400">{b.booker_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">{formatDate(b.start_at)}</td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {formatTime(b.start_at)} – {formatTime(b.end_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${s.bg} ${s.text} ${s.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {canAct ? (
                        <div className="flex gap-1.5">
                          {b.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => updateStatus(b.id, 'confirmed')}
                              title="Confirmer"
                              aria-label="Confirmer"
                              className="flex items-center gap-1 rounded-sm bg-success/10 px-2 py-1 text-[11px] font-semibold text-success transition hover:bg-success/20 disabled:opacity-40"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          {b.status === 'confirmed' && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => updateStatus(b.id, 'completed')}
                              title="Terminer"
                              aria-label="Terminer"
                              className="flex items-center gap-1 rounded-sm bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-200 disabled:opacity-40"
                            >
                              <Clock className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => updateStatus(b.id, 'cancelled')}
                            title="Annuler"
                            aria-label="Annuler"
                            className="flex items-center gap-1 rounded-sm bg-error/10 px-2 py-1 text-[11px] font-semibold text-error transition hover:bg-error/20 disabled:opacity-40"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {b.status === 'confirmed' && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => updateStatus(b.id, 'no_show')}
                              title="Absent"
                              aria-label="Absent"
                              className="flex items-center gap-1 rounded-sm bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning transition hover:bg-warning/20 disabled:opacity-40"
                            >
                              <AlertTriangle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-400">
      {children}
    </th>
  )
}
