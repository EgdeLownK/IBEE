'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingCancelView } from '@/lib/load-booking-cancel'

type Props = {
  data: BookingCancelView
}

export function BookingCancelForm({ data }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleCancel() {
    setState('loading')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.token }),
      })

      const body = (await response.json()) as { error?: string }

      if (!response.ok) {
        setState('error')
        setErrorMessage(body.error ?? 'Annulation impossible.')
        return
      }

      setState('done')
      router.refresh()
    } catch {
      setState('error')
      setErrorMessage('Erreur réseau. Réessaie dans un instant.')
    }
  }

  if (state === 'done') {
    return (
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Rendez-vous annulé</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Votre rendez-vous avec {data.entityName} a bien été annulé.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-neutral-900">Annuler le rendez-vous</h1>
      <p className="mt-3 text-sm text-neutral-600">
        Bonjour {data.bookerName}, confirmez l’annulation du rendez-vous ci-dessous.
      </p>

      <ul className="mt-5 space-y-2 text-sm text-neutral-700">
        <li>
          <strong>Prestation :</strong> {data.serviceTitle}
        </li>
        <li>
          <strong>Créneau :</strong> {data.slotLabel}
        </li>
        <li>
          <strong>Avec :</strong> {data.entityName}
        </li>
      </ul>

      {data.policyLabel ? (
        <p className="mt-4 text-xs text-neutral-500">{data.policyLabel}</p>
      ) : null}

      {data.canCancel ? (
        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={state === 'loading'}
          onClick={handleCancel}
        >
          {state === 'loading' ? 'Annulation…' : 'Confirmer l’annulation'}
        </button>
      ) : (
        <p className="mt-6 text-sm text-red-600">Ce rendez-vous ne peut pas être annulé.</p>
      )}

      {state === 'error' && errorMessage ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
