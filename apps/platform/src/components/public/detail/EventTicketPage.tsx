import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import Link from 'next/link'
import { ProfileShell } from '@ibee/ui-react/profile'
import { EventTicketQr } from '@/components/public/detail/EventTicketQr'
import type { EventTicketData } from '@/lib/load-event-ticket'

interface Props {
  data: EventTicketData
}

export function EventTicketPage({ data }: Props) {
  const isCancelled = data.registration.status === 'cancelled'

  return (
    <main className="profile-page">
      <ProfileShell>
        <div className="px-6 py-8 sm:px-12">
          <div className="mx-auto max-w-md">
            <p className="m-0 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Billet événement
            </p>
            <h1 className="mt-2 text-center text-2xl font-semibold text-neutral-900">
              {data.event.title}
            </h1>
            <p className="mt-1 text-center text-sm text-neutral-500">{data.entity.display_name}</p>

            <div
              className={`mt-8 rounded-2xl border p-6 ${
                isCancelled ? 'border-error/30 bg-error/5' : 'border-neutral-200 bg-neutral-0'
              }`}
            >
              {isCancelled ? (
                <p className="m-0 text-center text-sm font-medium text-error">
                  Ce billet a été annulé.
                </p>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4">
                    <EventTicketQr value={data.registration.ticketCode} />
                    <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-center">
                      <p className="m-0 text-xs text-neutral-500">Code billet</p>
                      <p className="m-0 mt-1 font-mono text-lg font-bold tracking-wider text-neutral-900">
                        {data.registration.ticketCode}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-neutral-500">Participant</dt>
                      <dd className="m-0 font-medium text-neutral-900">
                        {data.registration.attendeeName}
                      </dd>
                    </div>
                    {data.registration.ticketTypeTitle ? (
                      <div className="flex items-center gap-2 text-neutral-700">
                        <Ticket className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                        {data.registration.ticketTypeTitle} — {data.registration.priceText}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-neutral-700">
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-neutral-400"
                        aria-hidden="true"
                      />
                      {data.slotLabel}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <MapPin className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      {data.locationLabel}
                    </div>
                  </dl>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link href={data.eventHref} className="btn btn--ghost btn--block text-center">
                Voir l&apos;événement
              </Link>
              <Link href={data.profileHref} className="btn btn--ghost btn--block text-center">
                Profil de {data.entity.display_name}
              </Link>
            </div>
          </div>
        </div>
      </ProfileShell>
    </main>
  )
}
