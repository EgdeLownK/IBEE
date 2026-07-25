'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { ManualRegContactPageData } from '@/lib/load-manual-reg-contact-page'

type Props = {
  data: ManualRegContactPageData
}

export function ManualRegContactPage({ data }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(data.alreadyFilled)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const response = await fetch('/api/events/manual-reg-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          name,
          email,
          phone: phone || null,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Envoi impossible.')
        return
      }

      setSubmitted(true)
    })
  }

  return (
    <main className="profile-page">
      <div className="mx-auto max-w-md px-6 py-10">
        <p className="m-0 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Inscription événement
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-neutral-900">
          {data.eventTitle}
        </h1>
        <p className="mt-1 text-center text-sm text-neutral-500">{data.entityName}</p>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-0 p-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
              <h2 className="m-0 text-base font-semibold text-neutral-900">Coordonnées envoyées</h2>
              <p className="m-0 text-sm text-neutral-600">
                L&apos;organisateur peut finaliser ton inscription. Tu peux fermer cette page.
              </p>
            </div>
          ) : (
            <>
              <h2 className="m-0 text-base font-semibold text-neutral-900">Tes coordonnées</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Renseigne tes informations pour que l&apos;organisateur puisse t&apos;inscrire à
                l&apos;événement.
              </p>
              <form className="mt-4 space-y-3" onSubmit={submit}>
                <div>
                  <label className="field-label" htmlFor="manual-reg-public-name">
                    Nom complet *
                  </label>
                  <input
                    id="manual-reg-public-name"
                    className="field"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="manual-reg-public-email">
                    Email *
                  </label>
                  <input
                    id="manual-reg-public-email"
                    type="email"
                    className="field"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="manual-reg-public-phone">
                    Téléphone
                  </label>
                  <input
                    id="manual-reg-public-phone"
                    type="tel"
                    className="field"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                {error ? <p className="m-0 text-sm text-error">{error}</p> : null}
                <button
                  type="submit"
                  className="btn btn--accent btn--block w-full"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Envoi…
                    </>
                  ) : (
                    'Envoyer mes coordonnées'
                  )}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
