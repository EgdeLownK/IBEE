'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export function EventCancelClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleCancel() {
    if (!token) return
    setStatus('loading')
    const res = await fetch('/api/events/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus('error')
      setMessage(data.error || 'Erreur lors de l’annulation.')
      return
    }
    setStatus('done')
    setMessage(
      data.refunded ? 'Inscription annulée et remboursement initié.' : 'Inscription annulée.',
    )
  }

  if (!token) {
    return <p className="m-0 text-sm text-error">Lien d’annulation invalide.</p>
  }

  if (status === 'done') {
    return <p className="m-0 text-sm text-success">{message}</p>
  }

  return (
    <div className="space-y-4 text-center">
      <p className="m-0 text-sm text-neutral-600">Confirmer l’annulation de votre inscription ?</p>
      {status === 'error' ? <p className="m-0 text-sm text-error">{message}</p> : null}
      <button
        type="button"
        className="btn btn--accent"
        disabled={status === 'loading'}
        onClick={handleCancel}
      >
        {status === 'loading' ? 'Annulation…' : 'Annuler mon inscription'}
      </button>
    </div>
  )
}
