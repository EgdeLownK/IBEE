'use client'

import { logout } from '@/app/login/actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md bg-cta-primary px-4 py-2 text-sm font-medium text-neutral-0 transition duration-200 hover:bg-cta-primary-hover"
      >
        Se déconnecter
      </button>
    </form>
  )
}
