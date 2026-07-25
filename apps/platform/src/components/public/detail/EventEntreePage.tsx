'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import { Loader2 } from 'lucide-react'
import { buildParticipantEntreeUrl } from '@/lib/check-in-layout'
import type { EventEntreePageData } from '@/lib/load-event-entree'
import type { EventCheckInResult, EventEntreePublicStats } from '@ibee/supabase'

type Props = {
  data: EventEntreePageData
}

const STATS_POLL_MS = 10_000

function resultMessage(result: EventCheckInResult): string {
  switch (result.status) {
    case 'checked_in':
      return `Bienvenue ${result.attendeeName} — entrée validée.`
    case 'already_checked_in':
      return `${result.attendeeName}, votre entrée est déjà enregistrée.`
    case 'cancelled':
      return 'Ce billet a été annulé.'
    case 'not_open':
      return 'Les entrées ne sont pas encore ouvertes.'
    default:
      return 'Code billet introuvable.'
  }
}

export function EventEntreePage({ data }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<EventEntreePublicStats>(data.stats)
  const [ticketCode, setTicketCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const refreshStats = useCallback(async () => {
    const response = await fetch(
      `/api/events/entree-stats?eventId=${encodeURIComponent(data.event.id)}`,
    )
    if (!response.ok) return
    const payload = (await response.json()) as EventEntreePublicStats
    setStats(payload)
  }, [data.event.id])

  useEffect(() => {
    const url = buildParticipantEntreeUrl(data.entity.slug, data.event.slug, window.location.origin)
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: { dark: '#111827', light: '#ffffff' },
    }).then(setQrDataUrl)
  }, [data.entity.slug, data.event.slug])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshStats()
    }, STATS_POLL_MS)
    return () => window.clearInterval(intervalId)
  }, [refreshStats])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    const code = ticketCode.trim()
    if (!code) {
      setError('Saisis ton code billet.')
      return
    }

    startTransition(async () => {
      const response = await fetch('/api/events/self-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: data.event.id, ticketCode: code }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Validation impossible.')
        return
      }

      const result = payload.result as EventCheckInResult
      setMessage(resultMessage(result))
      setTicketCode('')
      if (result.status === 'checked_in') {
        void refreshStats()
      }
    })
  }

  return (
    <main className="profile-page">
      <div className="mx-auto max-w-md px-6 py-10">
        <p className="m-0 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Entrée événement
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-neutral-900">
          {data.event.title}
        </h1>
        <p className="mt-1 text-center text-sm text-neutral-500">{data.entity.displayName}</p>

        <section
          className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-0 px-6 py-5 text-center"
          aria-live="polite"
          aria-label="Compteur d'entrées"
        >
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Entrées validées
          </p>
          <p className="m-0 mt-2 text-4xl font-bold tabular-nums text-neutral-900">
            {stats.checkedInCount}
            <span className="text-2xl font-semibold text-neutral-400">
              {' '}
              / {stats.confirmedCount}
            </span>
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-0 p-6">
          <h2 className="m-0 text-center text-base font-semibold text-neutral-900">
            QR code d&apos;entrée
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Affiche ce QR à l&apos;entrée : les participants le scannent pour valider leur billet.
          </p>
          <div className="mt-5 flex justify-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR code pour valider l'entrée à l'événement"
                width={220}
                height={220}
                className="rounded-xl border border-neutral-200 bg-white p-2"
              />
            ) : (
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true" />
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-0 p-6">
          <h2 className="m-0 text-base font-semibold text-neutral-900">Valider mon entrée</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Saisis le code figurant sur ton billet (email de confirmation ou page billet).
          </p>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <div>
              <label className="field-label" htmlFor="entree-ticket-code">
                Code billet
              </label>
              <input
                id="entree-ticket-code"
                className="field font-mono uppercase"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                placeholder="EVT-XXXXXXXXXX"
                autoComplete="off"
              />
            </div>
            {error ? <p className="m-0 text-sm text-error">{error}</p> : null}
            {message ? <p className="m-0 text-sm font-medium text-success">{message}</p> : null}
            <button type="submit" className="btn btn--accent btn--block w-full" disabled={pending}>
              {pending ? 'Validation…' : 'Valider mon entrée'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
