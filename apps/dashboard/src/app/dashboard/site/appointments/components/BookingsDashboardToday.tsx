'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Play,
  Timer,
  User,
  Video,
  X,
} from 'lucide-react'
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

const HOUR_START = 7
const HOUR_END = 21
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)
const HOUR_ROW_HEIGHT = 56

const LOCATION_META: Record<string, { label: string; Icon: typeof Video }> = {
  video: { label: 'Visio', Icon: Video },
  in_person: { label: 'Sur place', Icon: MapPin },
  phone: { label: 'Téléphone', Icon: Phone },
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function formatTodayLabel(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function hourFraction(date: Date) {
  return date.getHours() + date.getMinutes() / 60
}

export function BookingsDashboardToday({ upcoming, past }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const todayBookings = useMemo(() => {
    const all = [...upcoming, ...past]
    const byId = new Map<string, BookingWithType>()
    for (const b of all) byId.set(b.id, b)
    return Array.from(byId.values())
      .filter((b) => isSameDay(new Date(b.start_at), now))
      .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [upcoming, past, now])

  const cancelledToday = useMemo(() => {
    const all = [...upcoming, ...past]
    const byId = new Map<string, BookingWithType>()
    for (const b of all) byId.set(b.id, b)
    return Array.from(byId.values())
      .filter((b) => isSameDay(new Date(b.start_at), now))
      .filter((b) => b.status === 'cancelled' || b.status === 'no_show')
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [upcoming, past, now])

  const current = todayBookings.find((b) => {
    const start = new Date(b.start_at).getTime()
    const end = new Date(b.end_at).getTime()
    return start <= now.getTime() && now.getTime() < end
  })

  const future = todayBookings.filter(
    (b) => new Date(b.start_at).getTime() > now.getTime()
  )
  const next = future[0]
  const later = next ? future.slice(1) : future

  const past_today = todayBookings.filter(
    (b) => new Date(b.end_at).getTime() <= now.getTime()
  )

  const nowFraction = hourFraction(now)
  const nowVisible = nowFraction >= HOUR_START && nowFraction <= HOUR_END

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm font-bold text-neutral-900">
        <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
        <span className="capitalize">Aujourd’hui · {formatTodayLabel(now)}</span>
        {todayBookings.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-neutral-500">
            {todayBookings.length} rendez-vous
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <DayTimeline
          bookings={todayBookings}
          nowFraction={nowVisible ? nowFraction : null}
        />

        <div className="flex flex-col gap-6">
          {todayBookings.length === 0 ? (
            <EmptyToday />
          ) : (
            <>
              <BookingSection
                label="En cours"
                variant="live"
                bookings={current ? [current] : []}
                emptyHint={
                  past_today.length > 0
                    ? 'Aucun rendez-vous ne démarre en ce moment.'
                    : null
                }
              />
              <BookingSection label="Prochain" variant="next" bookings={next ? [next] : []} />
              <BookingSection
                label="À venir aujourd’hui"
                variant="default"
                bookings={later}
              />
              {past_today.length > 0 && (
                <BookingSection
                  label="Déjà passés"
                  variant="muted"
                  bookings={past_today}
                />
              )}
            </>
          )}

          {cancelledToday.length > 0 && (
            <div className="mt-2 rounded-xl border border-error/20 bg-error/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-error">
                <X className="h-3.5 w-3.5" />
                {cancelledToday.length} annulation{cancelledToday.length > 1 ? 's' : ''} aujourd’hui
              </p>
              <ul className="flex flex-col gap-1 text-[11px] text-neutral-600">
                {cancelledToday.map((b) => (
                  <li key={b.id}>
                    {formatTime(b.start_at)} — {b.booker_name} · {b.appointment_types?.title ?? 'Service supprimé'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DayTimeline({
  bookings,
  nowFraction,
}: {
  bookings: BookingWithType[]
  nowFraction: number | null
}) {
  const totalHours = HOUR_END - HOUR_START
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-0 p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        Journée
      </p>
      <div
        className="relative"
        style={{ height: totalHours * HOUR_ROW_HEIGHT + HOUR_ROW_HEIGHT / 2 }}
      >
        {HOURS.map((h, i) => (
          <div
            key={h}
            className="absolute inset-x-0 flex items-center gap-3"
            style={{ top: i * HOUR_ROW_HEIGHT }}
          >
            <span className="w-10 shrink-0 text-[11px] font-bold tabular-nums text-neutral-400">
              {String(h).padStart(2, '0')}:00
            </span>
            <div className="h-px flex-1 bg-neutral-100" />
          </div>
        ))}

        {bookings.map((b) => {
          const start = new Date(b.start_at)
          const end = new Date(b.end_at)
          const startFrac = hourFraction(start)
          const endFrac = hourFraction(end)
          if (endFrac <= HOUR_START || startFrac >= HOUR_END) return null
          const top = (Math.max(startFrac, HOUR_START) - HOUR_START) * HOUR_ROW_HEIGHT
          const height = Math.max(
            18,
            (Math.min(endFrac, HOUR_END) - Math.max(startFrac, HOUR_START)) * HOUR_ROW_HEIGHT - 4
          )
          const accentColor = b.appointment_types?.color ?? undefined
          return (
            <div
              key={b.id}
              className="absolute left-[52px] right-2 rounded-md border border-accent/25 bg-accent-soft p-2 shadow-sm"
              style={{
                top,
                height,
                borderLeftWidth: 3,
                borderLeftColor: accentColor ?? 'var(--color-accent, #C84417)',
              }}
              title={`${b.appointment_types?.title ?? 'Service'} · ${b.booker_name}`}
            >
              <p className="truncate text-[11px] font-bold text-accent">
                {formatTime(b.start_at)} · {b.booker_name}
              </p>
              {height > 28 && (
                <p className="truncate text-[10px] text-neutral-600">
                  {b.appointment_types?.title ?? 'Service'}
                </p>
              )}
            </div>
          )
        })}

        {nowFraction !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 flex items-center gap-2"
            style={{ top: (nowFraction - HOUR_START) * HOUR_ROW_HEIGHT }}
          >
            <span className="w-10 shrink-0 text-right text-[10px] font-bold text-accent">
              maintenant
            </span>
            <div className="h-px flex-1 bg-accent" />
          </div>
        )}
      </div>
    </div>
  )
}

type SectionVariant = 'live' | 'next' | 'default' | 'muted'

function BookingSection({
  label,
  variant,
  bookings,
  emptyHint,
}: {
  label: string
  variant: SectionVariant
  bookings: BookingWithType[]
  emptyHint?: string | null
}) {
  if (bookings.length === 0 && !emptyHint) return null

  const iconByVariant: Record<SectionVariant, React.ReactNode> = {
    live: <Play className="h-3.5 w-3.5 fill-success text-success" />,
    next: <Timer className="h-3.5 w-3.5 text-accent" />,
    default: <CalendarDays className="h-3.5 w-3.5 text-neutral-500" />,
    muted: <Clock className="h-3.5 w-3.5 text-neutral-400" />,
  }

  const labelColorByVariant: Record<SectionVariant, string> = {
    live: 'text-success',
    next: 'text-accent',
    default: 'text-neutral-700',
    muted: 'text-neutral-400',
  }

  return (
    <div>
      <div className={`mb-2.5 flex items-center gap-2 text-xs font-bold ${labelColorByVariant[variant]}`}>
        {iconByVariant[variant]}
        <span>{label}</span>
        {bookings.length > 1 && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
            {bookings.length}
          </span>
        )}
      </div>
      {bookings.length === 0 ? (
        <p className="text-xs italic text-neutral-400">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} variant={variant} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking,
  variant,
}: {
  booking: BookingWithType
  variant: SectionVariant
}) {
  const location = LOCATION_META[booking.appointment_types?.location_type ?? 'video'] ?? LOCATION_META.video!
  const LocationIcon = location.Icon
  const dim = variant === 'muted'

  const cardClass =
    variant === 'live'
      ? 'border-success/30 bg-success/5'
      : variant === 'next'
      ? 'border-accent/30 bg-accent-soft/40'
      : 'border-neutral-200 bg-neutral-0'

  const [cancelling, setCancelling] = useState(false)
  const cancellable = booking.status === 'pending' || booking.status === 'confirmed'

  const cancel = () => {
    if (!cancellable || cancelling) return
    if (!confirm('Annuler ce rendez-vous ? Le client ne sera pas automatiquement prévenu.')) return
    setCancelling(true)
    updateBookingStatusAction(booking.id, 'cancelled', 'owner').then(() => {
      window.location.reload()
    })
  }

  return (
    <article
      className={`group flex items-start gap-3 rounded-lg border p-3 transition ${cardClass} ${
        dim ? 'opacity-60' : ''
      }`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent"
        aria-hidden
      >
        {booking.booker_name.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {booking.client_id ? (
              <Link
                href={`/dashboard/site/clients/${booking.client_id}`}
                className="group/name truncate text-sm font-bold text-neutral-900 transition hover:text-accent"
              >
                {booking.booker_name}
                <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 transition group-hover/name:opacity-100" />
              </Link>
            ) : (
              <p className="truncate text-sm font-bold text-neutral-900">{booking.booker_name}</p>
            )}
          </div>
          <p className="shrink-0 text-xs font-bold tabular-nums text-neutral-600">
            {formatTime(booking.start_at)} – {formatTime(booking.end_at)}
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-600">
          {booking.appointment_types?.title ?? 'Service supprimé'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1 rounded-sm bg-neutral-100 px-2 py-0.5 font-semibold">
            <LocationIcon className="h-3 w-3" />
            {location.label}
          </span>
          {booking.booker_email && (
            <span className="truncate">{booking.booker_email}</span>
          )}
        </div>
      </div>
      {cancellable && (
        <button
          type="button"
          onClick={cancel}
          disabled={cancelling}
          aria-label="Annuler le rendez-vous"
          className="shrink-0 rounded-sm p-1.5 text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-error/10 hover:text-error disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </article>
  )
}

function EmptyToday() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-14 text-center">
      <CalendarDays className="h-10 w-10 text-neutral-300" aria-hidden />
      <p className="mt-4 text-sm font-bold text-neutral-600">Aucun rendez-vous aujourd’hui</p>
      <p className="mt-1 text-xs text-neutral-400">
        Les réservations du jour apparaîtront ici en temps réel.
      </p>
    </div>
  )
}
