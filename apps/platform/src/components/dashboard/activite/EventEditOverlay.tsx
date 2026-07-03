'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { loadEventEditDataAction } from '@/app/dashboard/site/event-ticket-actions'
import { EventEditStudio } from '@/components/profile/event-edit/EventEditStudio'
import type { EventEditData } from '@/lib/load-event-edit'

type Props = {
  eventId: string | null
  open: boolean
  onClose: () => void
}

export function EventEditOverlay({ eventId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<{
    data: EventEditData
    publicEventHref: string
  } | null>(null)

  useEffect(() => {
    if (!open || !eventId) {
      setPayload(null)
      setError('')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setPayload(null)

    void loadEventEditDataAction(eventId).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error ?? 'Impossible de charger l’événement.')
        return
      }
      setPayload({ data: result.data, publicEventHref: result.publicEventHref })
    })

    return () => {
      cancelled = true
    }
  }, [eventId, open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const title = payload?.data.event.title ?? 'Gérer l’événement'

  return createPortal(
    <div className="pco-root" role="presentation">
      <button type="button" className="pco-root__backdrop" aria-label="Fermer" onClick={onClose} />
      <div
        className="pco__panel pco__panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-edit-overlay-title"
      >
        <header className="pco__header">
          <h2 id="event-edit-overlay-title" className="pco__title">
            {title}
          </h2>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="pco__scroll">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Chargement…
            </p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-neutral-600">{error}</p>
          ) : payload ? (
            <EventEditStudio
              embedded
              data={payload.data}
              publicEventHref={payload.publicEventHref}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
