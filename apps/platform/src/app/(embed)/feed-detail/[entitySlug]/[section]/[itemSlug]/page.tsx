import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { ProductDetailCheckout } from '@/components/public/detail/ProductDetailCheckout'
import { EventDetailPage } from '@/components/public/detail/EventDetailPage'
import { ServiceDetailPage } from '@/components/public/detail/ServiceDetailPage'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import { loadPublicProduct } from '@/lib/load-public-product'
import { loadPublicEvent } from '@/lib/load-public-event'
import { loadPublicService } from '@/lib/load-public-service'
import {
  mapEventDataForEmbed,
  mapProductDataForEmbed,
  mapServiceDataForEmbed,
} from '@/lib/embed-public-urls'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ entitySlug: string; section: string; itemSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entitySlug, section, itemSlug } = await params
  const title = await resolveTitle(entitySlug, section, itemSlug)
  return {
    title: title ?? 'Aperçu',
    robots: { index: false, follow: false },
  }
}

async function resolveTitle(entitySlug: string, section: string, itemSlug: string) {
  if (section === 'shop') {
    const result = await loadPublicProduct(entitySlug, itemSlug)
    if (result.kind === 'ok') return result.data.product.title
  }
  if (section === 'events') {
    const data = await loadPublicEvent(entitySlug, itemSlug)
    if (data) return data.event.title
  }
  if (section === 'services') {
    const data = await loadPublicService(entitySlug, itemSlug)
    if (data) return data.service.title
  }
  return null
}

export default async function FeedDetailPreviewPage({ params }: PageProps) {
  const { entitySlug, section, itemSlug } = await params

  if (!entitySlug || !itemSlug || entitySlug.startsWith('__')) notFound()

  if (section === 'shop') {
    const result = await loadPublicProduct(entitySlug, itemSlug)
    if (result.kind === 'redirect') {
      permanentRedirect(`/feed-detail/${entitySlug}/shop/${result.newSlug}`)
    }
    if (result.kind === 'not_found') notFound()

    const data = mapProductDataForEmbed(result.data)
    return (
      <div className="mx-auto max-w-[800px] md:py-4">
        <ProductDetailCheckout data={data} embedMode />
        <TrackPageView
          events={[
            {
              entity_id: data.entity.id,
              event_type: 'product_view',
              resource_id: data.product.id,
            },
          ]}
        />
      </div>
    )
  }

  if (section === 'events') {
    const raw = await loadPublicEvent(entitySlug, itemSlug)
    if (!raw) notFound()

    const data = mapEventDataForEmbed(raw)
    return (
      <div className="mx-auto max-w-[800px] md:py-4">
        <EventDetailPage data={data} embedMode />
        <TrackPageView
          events={[
            {
              entity_id: data.entity.id,
              event_type: 'event_view',
              resource_id: data.event.id,
            },
          ]}
        />
      </div>
    )
  }

  if (section === 'services') {
    const raw = await loadPublicService(entitySlug, itemSlug)
    if (!raw) notFound()

    const data = mapServiceDataForEmbed(raw)
    return (
      <div className="mx-auto max-w-[800px] md:py-4">
        <ServiceDetailPage data={data} embedMode />
        <TrackPageView
          events={[
            {
              entity_id: data.entity.id,
              event_type: 'service_view',
              resource_id: data.service.id,
            },
          ]}
        />
      </div>
    )
  }

  notFound()
}
