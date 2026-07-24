import { ArrowRight, CalendarDays, CheckCircle, Clock, MapPin, Phone, Video } from 'lucide-react'
import Link from 'next/link'
import { ProfileShell } from '@ibee/ui-react/profile'
import { RecommendedServices } from '@/components/public/detail/RecommendedServices'
import type { BookingConfirmedData } from '@/lib/load-booking-confirmed'

const LOCATION_ICONS = {
  video: Video,
  in_person: MapPin,
  phone: Phone,
} as const

interface Props {
  data: BookingConfirmedData
  bookerName: string
  dateRecap: string
}

export function BookingConfirmedPage({ data, bookerName, dateRecap }: Props) {
  const LocIcon = LOCATION_ICONS[data.service.location_type as keyof typeof LOCATION_ICONS] ?? Video

  return (
    <main className="profile-page">
      <ProfileShell>
        <div className="flex flex-col items-center px-6 pt-10 pb-2">
          {data.entity.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.entity.avatar_url}
              alt={data.entity.display_name}
              className="h-20 w-20 rounded-full border-4 border-neutral-0 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent">
              {data.entity.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="px-6 py-8 text-center sm:px-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" aria-hidden="true" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-neutral-900">
            {bookerName ? `Merci ${bookerName} !` : 'Rendez-vous demandé !'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Votre demande a bien été envoyée. {data.entity.display_name} reviendra vers vous pour
            confirmer le créneau.
          </p>

          <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-0 p-5 text-left">
            <h2 className="text-sm font-semibold text-neutral-900">{data.service.title}</h2>
            <div className="mt-3 space-y-2">
              {dateRecap && (
                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                  <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  {dateRecap}
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                <Clock className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {data.service.duration_minutes} minutes
              </div>
              <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                <LocIcon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                {data.locationLabel}
              </div>
            </div>
            {data.service.price_cents !== null && data.service.price_cents > 0 && (
              <div className="mt-3 border-t border-neutral-100 pt-3 text-right">
                <span className="text-base font-semibold text-neutral-900">{data.priceText}</span>
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-neutral-400">
            Un email de confirmation sera envoyé à l&apos;adresse indiquée.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={data.profileHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              Voir le profil
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={data.serviceHref}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Reprendre un rendez-vous
            </Link>
          </div>
        </div>

        {data.otherServices.length > 0 && (
          <div className="border-t border-neutral-200 px-6 py-6 sm:px-12">
            <RecommendedServices
              services={data.otherServices}
              entitySlug={data.entity.slug}
              title="Découvrir aussi"
            />
          </div>
        )}
      </ProfileShell>
    </main>
  )
}
