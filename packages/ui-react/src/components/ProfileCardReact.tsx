import { ReactNode } from 'react'

type ProfileCardReactProps = {
  children: ReactNode
}

export function ProfileCardReact({ children }: ProfileCardReactProps) {
  return (
    <article className="mx-auto max-w-[800px] overflow-hidden rounded-2xl bg-neutral-0 shadow-md">
      {children}
    </article>
  )
}
