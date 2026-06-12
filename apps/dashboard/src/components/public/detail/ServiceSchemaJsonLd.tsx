import type { PublicServiceData } from '@/lib/load-public-service'

interface Props {
  data: Pick<
    PublicServiceData,
    'service' | 'entity' | 'serviceUrl' | 'profileUrl' | 'textContent'
  >
}

export function ServiceSchemaJsonLd({ data }: Props) {
  const { service, entity, serviceUrl, profileUrl, textContent } = data

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${serviceUrl}#service`,
        name: service.title,
        ...(textContent && { description: textContent.slice(0, 500) }),
        url: serviceUrl,
        provider: {
          '@type': 'Person',
          '@id': `${profileUrl}#person`,
          name: entity.display_name,
          url: profileUrl,
          ...(entity.avatar_url && { image: entity.avatar_url }),
        },
        ...(service.price_cents !== null &&
          service.price_cents > 0 && {
            offers: {
              '@type': 'Offer',
              price: (service.price_cents / 100).toFixed(2),
              priceCurrency: service.currency,
              availability: 'https://schema.org/InStock',
            },
          }),
      },
    ],
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  )
}
