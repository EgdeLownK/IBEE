import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import { formatDetailPrice } from '@/lib/detail-format'

type Service = {
  id: string
  title: string
  slug: string
  duration_minutes: number
  location_type: string
  price_cents: number | null
  promo_price_cents?: number | null
  currency: string
  gallery_images?: string[] | null
}

interface Props {
  services: Service[]
  entitySlug: string
  title?: string
}

const LOC_SHORT: Record<string, string> = {
  video: 'Visio',
  in_person: 'Sur place',
  phone: 'Tél.',
}

export function RecommendedServices({ services, entitySlug, title = 'Autres services' }: Props) {
  const visible = services.slice(0, 4)
  if (visible.length === 0) return null

  return (
    <div className="reco">
      <h2 className="reco__title">{title}</h2>
      <div className="flex flex-col gap-2">
        {visible.map((svc) => (
          <Link key={svc.id} href={`/${entitySlug}/services/${svc.slug}`} className="reco__row">
            <div className="reco__row-cover">
              {svc.gallery_images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={svc.gallery_images[0]} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold text-neutral-900">{svc.title}</p>
              <p className="m-0 mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {svc.duration_minutes} min
                <span>·</span>
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {LOC_SHORT[svc.location_type] ?? 'Visio'}
              </p>
            </div>
            <span className="reco__row-price">
              {formatDetailPrice(svc.promo_price_cents ?? svc.price_cents, svc.currency)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
