'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createJobApplicationAction } from '@/app/(public)/[slug]/offres/[offerId]/apply-actions'

interface Props {
  open: boolean
  onClose: () => void
  offerId: string
  offerTitle: string
  entityName: string
  isAuthenticated: boolean
  userEmail: string
  userFirstName: string
  userLastName: string
}

export function ApplyBottomSheet({
  open,
  onClose,
  offerId,
  offerTitle,
  entityName,
  isAuthenticated,
  userEmail,
  userFirstName,
  userLastName,
}: Props) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(userFirstName)
  const [lastName, setLastName] = useState(userLastName)
  const [email, setEmail] = useState(userEmail)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setFirstName(userFirstName)
      setLastName(userLastName)
      setEmail(userEmail)
      setMessage('')
      setSubmitted(false)
      setError('')
    }
  }, [open, userFirstName, userLastName, userEmail])

  useEffect(() => {
    if (!open) return
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Prénom, nom et email sont requis.')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await createJobApplicationAction({
        offer_id: offerId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        message: message.trim() || undefined,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-neutral-500">{entityName}</p>
            <h2 className="text-base font-semibold text-neutral-900">{offerTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="font-semibold text-neutral-900">Candidature envoyée !</p>
            <p className="text-sm text-neutral-500 mt-1">
              Nous avons bien reçu votre candidature. Bonne chance !
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white"
            >
              Fermer
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div className="py-4 text-center">
            <p className="text-sm text-neutral-600 mb-6">
              Connectez-vous pour postuler et suivre vos candidatures.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`,
                )
              }
              className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white mb-3"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-700"
            >
              Plus tard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Prénom *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  placeholder="Prénom"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Nom *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  placeholder="Nom"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">
                Message (optionnel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                placeholder="Décrivez votre motivation en quelques lignes..."
              />
            </div>

            {error ? <p className="text-xs text-red-600 font-medium">{error}</p> : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi...
                </span>
              ) : (
                'Envoyer ma candidature'
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
