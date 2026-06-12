import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/** Conteneur 800px — miroir `.profile-shell` Astro. */
export function ProfileShell({ children }: Props) {
  return <article className="profile-shell">{children}</article>
}
