import type { PublicEventData } from '@/lib/load-public-event'

interface Props {
  data: Pick<
    PublicEventData,
    | 'event'
    | 'entity'
    | 'eventUrl'
    | 'profileUrl'
    | 'coverImage'
    | 'description'
    | 'textContent'
    | 'isFull'
  >
}

export function EventSchemaJsonLd({ data }: Props) {
  const { event, entity, eventUrl, profileUrl, coverImage, description, isFull } = data

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(description && { description }),
    startDate: event.start_at,
    ...(event.end_at && { endDate: event.end_at }),
    eventAttendanceMode:
      event.location_type === 'online'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location:
      event.location_type === 'online'
        ? { '@type': 'VirtualLocation', url: eventUrl }
        : {
            '@type': 'Place',
            name: event.location_details ?? 'Sur place',
            address: event.location_details ?? undefined,
          },
    ...(coverImage && { image: [coverImage] }),
    organizer: {
      '@type': 'Person',
      name: entity.display_name,
      url: profileUrl,
    },
    offers: {
      '@type': 'Offer',
      price: ((event.price_cents ?? 0) / 100).toFixed(2),
      priceCurrency: event.currency,
      availability: isFull ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: eventUrl,
    },
    url: eventUrl,
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  )
}
