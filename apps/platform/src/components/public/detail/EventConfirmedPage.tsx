import { CalendarDays, CheckCircle, MapPin, Ticket } from 'lucide-react'
import Link from 'next/link'
import { ProfileShell } from '@ibee/ui-react/profile'
import type { EventConfirmedData } from '@/lib/load-event-confirmed'

interface Props {
  data: EventConfirmedData
}

export function EventConfirmedPage({ data }: Props) {
  return (
    <main className="profile-page">
      <ProfileShell>
        <div className="px-6 py-8 text-center sm:px-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" aria-hidden="true" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-neutral-900">
            Paiement confirmé{data.registration.attendeeName ? `, ${data.registration.attendeeName}` : ''} !
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Votre billet pour {data.event.title} est prêt.
          </p>

          <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-0 p-5 text-left">
            <h2 className="text-sm font-semibold text-neutral-900">{data.event.title}</h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {data.slotLabel}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                <MapPin className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {data.locationLabel}
              </div>
              {data.registration.ticketTypeTitle ? (
                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                  <Ticket className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  {data.registration.ticketTypeTitle} — {data.registration.priceText}
                </div>
              ) : null}
              <p className="m-0 pt-2 text-sm">
                Code billet : <strong>{data.registration.ticketCode}</strong>
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={data.ticketHref} className="btn btn--accent">
              Voir mon billet
            </Link>
            <Link href={data.eventHref} className="btn btn--ghost">
              Retour à l&apos;événement
            </Link>
          </div>
        </div>
      </ProfileShell>
    </main>
  )
}
