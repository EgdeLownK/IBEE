'use client'

import { useState, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@ibee/supabase'
import { toast } from 'sonner'
import { upsertUserProfileAction } from '@/app/(account)/mon-compte/account-actions'

interface Props {
  user: User
  profile: UserProfile | null
}

export function AccountPage({ user, profile }: Props) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await upsertUserProfileAction({
        first_name: firstName,
        last_name: lastName,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Profil mis à jour')
    })
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Mon compte</h1>

      <form
        onSubmit={handleSave}
        className="space-y-4 bg-white rounded-xl border border-neutral-200 p-5"
      >
        <h2 className="text-sm font-semibold text-neutral-900">Informations personnelles</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Prénom</label>
            <input
              type="text"
              value={firstName ?? ''}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Nom</label>
            <input
              type="text"
              value={lastName ?? ''}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="Nom"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 block mb-1">Email</label>
          <input
            type="email"
            value={user.email ?? ''}
            disabled
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
