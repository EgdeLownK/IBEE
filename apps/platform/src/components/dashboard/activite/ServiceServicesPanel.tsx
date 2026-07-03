'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import type { ServiceCatalogLine } from '@/lib/service-catalog-view'
import { ActiviteCatalogThumb } from './ActiviteCatalogThumb'

type Props = {
  services: ServiceCatalogLine[]
}

function ServiceRow({ service }: { service: ServiceCatalogLine }) {
  return (
    <li className="boutique-product-row">
      <ActiviteCatalogThumb imageUrl={service.imageUrl} alt="" />

      <div className="boutique-product-row__main">
        <p className="boutique-product-row__name" title={service.title}>
          {service.title}
        </p>
        <p className="boutique-product-row__type">
          {service.durationMinutes} min · {service.locationLabel}
          {service.priceLabel ? ` · ${service.priceLabel}` : ''}
        </p>
      </div>

      <Link href="/dashboard/site" className="boutique-product-row__link">
        Gérer
      </Link>
    </li>
  )
}

export function ServiceServicesPanel({ services }: Props) {
  return (
    <div className="boutique-side-products">
      <header className="boutique-side-products__head">
        <p className="boutique-side-products__subtitle">
          {services.length > 0
            ? `${services.length} prestation${services.length > 1 ? 's' : ''} active${services.length > 1 ? 's' : ''}`
            : 'Aucune prestation active'}
        </p>
      </header>

      <div className="boutique-side-products__body">
        {services.length === 0 ? (
          <div className="boutique-side-products__empty">
            <CalendarClock className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Publiez une prestation pour la voir ici.</p>
          </div>
        ) : (
          <ul className="boutique-product-list">
            {services.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
