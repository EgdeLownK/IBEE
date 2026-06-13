import type { PublicPublicationData } from '@/lib/load-public-publication'

type Comment = PublicPublicationData['comments'][number]

interface Props {
  publication: PublicPublicationData['publication']
  entity: PublicPublicationData['entity']
  comments: Comment[]
  publicationUrl: string
  profileUrl: string
  siteUrl: string
}

export function PublicationArticleJsonLd({
  publication,
  entity,
  comments,
  publicationUrl,
  profileUrl,
  siteUrl,
}: Props) {
  const commentSchemas = comments.slice(0, 20).map((c) => ({
    '@type': 'Comment',
    author: {
      '@type': 'Person',
      name: c.author_display_name,
      url: `${siteUrl}/${c.author_slug}`,
    },
    text: c.content,
    dateCreated: c.created_at,
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${publicationUrl}#article`,
        headline: publication.title,
        ...(publication.content && { articleBody: publication.content }),
        datePublished: publication.published_at,
        dateModified: publication.updated_at,
        url: publicationUrl,
        commentCount: publication.comments_count,
        ...(commentSchemas.length > 0 && { comment: commentSchemas }),
        author: {
          '@type': 'Person',
          '@id': `${profileUrl}#person`,
          name: entity.display_name,
          url: profileUrl,
          ...(entity.avatar_url && { image: entity.avatar_url }),
        },
        publisher: {
          '@type': 'Organization',
          name: 'IBEE',
          url: siteUrl,
        },
        ...(publication.publication_media.length > 0 && {
          image: publication.publication_media.map((m: { url: string }) => m.url),
        }),
      },
    ],
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  )
}
