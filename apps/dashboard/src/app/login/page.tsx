'use client'

import { useState } from 'react'
import { login, signup } from './actions'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    const action = mode === 'login' ? login : signup
    const result = await action(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl bg-neutral-0 p-8 shadow-md">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-neutral-900">
          IBEE
        </h1>

        <div className="mt-6 flex rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null) }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-neutral-0 text-neutral-900 shadow-sm'
                : 'text-neutral-600'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null) }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-neutral-0 text-neutral-900 shadow-sm'
                : 'text-neutral-600'
            }`}
          >
            S&apos;inscrire
          </button>
        </div>

        <form action={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-600">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-600">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-cta-primary px-4 py-2 text-sm font-medium text-neutral-0 transition duration-200 hover:bg-cta-primary-hover disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </main>
  )
}
