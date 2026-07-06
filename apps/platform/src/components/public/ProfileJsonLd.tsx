interface FaqItem {
  question: string
  answer: string
}

interface Props {
  entity: {
    slug: string
    display_name: string
    avatar_url: string | null
    role: string | null
    bio: string | null
    location: string | null
    created_at: string
    updated_at: string
  }
  siteUrl: string
  faqItems?: FaqItem[]
  profileUrl?: string
}

export function ProfileJsonLd({ entity, siteUrl, faqItems, profileUrl }: Props) {
  const url = profileUrl ?? `${siteUrl}/${entity.slug}`

  const organization = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'IBEE',
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
  }

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: entity.display_name,
    url,
    memberOf: { '@id': `${siteUrl}/#organization` },
  }

  if (entity.avatar_url) person.image = entity.avatar_url
  if (entity.role) person.jobTitle = entity.role
  if (entity.bio) person.description = entity.bio
  if (entity.location) {
    person.homeLocation = {
      '@type': 'Place',
      name: entity.location,
    }
  }
  person.sameAs = []

  const profilePage = {
    '@type': 'ProfilePage',
    '@id': `${url}#profilepage`,
    url,
    mainEntity: { '@id': `${url}#person` },
    dateCreated: entity.created_at,
    dateModified: entity.updated_at,
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Profils',
        item: `${siteUrl}/explore`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: entity.display_name,
        item: url,
      },
    ],
  }

  const graph: Record<string, unknown>[] = [organization, person, profilePage, breadcrumb]

  if (faqItems && faqItems.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    })
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graph,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
