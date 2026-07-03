import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EventCancelClient } from '@/components/public/EventCancelClient'

export const metadata: Metadata = {
  title: 'Annuler inscription — IBEE',
  robots: { index: false, follow: false },
}

export default function EventCancelPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-neutral-500">Chargement…</p>}>
        <EventCancelClient />
      </Suspense>
    </main>
  )
}
