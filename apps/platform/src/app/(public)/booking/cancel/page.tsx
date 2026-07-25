import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BookingCancelForm } from '@/components/public/BookingCancelForm'
import { loadBookingCancel } from '@/lib/load-booking-cancel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Annuler un rendez-vous — IBEE',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ token?: string }>
}

function CancelCard({
  title,
  copy,
  variant = 'default',
  children,
}: {
  title: string
  copy?: string
  variant?: 'default' | 'error' | 'success'
  children?: ReactNode
}) {
  const border =
    variant === 'error'
      ? 'border-red-200'
      : variant === 'success'
        ? 'border-emerald-200'
        : 'border-neutral-200'

  return (
    <div className={`mx-auto w-full max-w-lg rounded-2xl border ${border} bg-white p-8 shadow-sm`}>
      <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      {copy ? <p className="mt-3 text-sm leading-relaxed text-neutral-600">{copy}</p> : null}
      {children}
    </div>
  )
}

export default async function BookingCancelPage({ searchParams }: PageProps) {
  const { token } = await searchParams
  const result = await loadBookingCancel(token)

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      {result.kind === 'invalid' ? (
        <CancelCard
          variant="error"
          title="Lien invalide"
          copy="Ce lien d’annulation est expiré ou incorrect. Contactez directement le prestataire si besoin."
        />
      ) : null}

      {result.kind === 'unavailable' ? (
        <CancelCard variant="error" title="Annulation impossible" copy={result.reason} />
      ) : null}

      {result.kind === 'ready' ? <BookingCancelForm data={result.data} /> : null}
    </main>
  )
}
