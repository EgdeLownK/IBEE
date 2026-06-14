import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { PublicationArticleJsonLd } from '@/components/public/PublicationArticleJsonLd'
import { PublicationDetailPage } from '@/components/public/PublicationDetailPage'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import { loadPublicPublication } from '@/lib/load-public-publication'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string; publicationSlug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, publicationSlug } = await params
  const data = await loadPublicPublication(slug, publicationSlug)
  if (!data) return { title: 'Publication introuvable' }

  const title = `${data.publication.title} — ${data.entity.display_name} — IBEE`

  return {
    title,
    description: data.description,
    openGraph: {
      title,
      description: data.description,
      url: data.publicationUrl,
      type: 'article',
      images: data.ogImage ? [{ url: data.ogImage }] : undefined,
    },
    alternates: { canonical: data.publicationUrl },
    robots: { index: true, follow: true },
  }
}

export default async function PublicationDetailRoute({ params, searchParams }: PageProps) {
  const { slug, publicationSlug } = await params
  const { preview } = await searchParams

  if (!slug || !publicationSlug || slug.startsWith('__')) notFound()

  if (preview === '1') noStore()

  const data = await loadPublicPublication(slug, publicationSlug)
  if (!data) notFound()

  return (
    <>
      <PublicationArticleJsonLd
        publication={data.publication}
        entity={data.entity}
        comments={data.comments}
        publicationUrl={data.publicationUrl}
        profileUrl={data.profileUrl}
        siteUrl={data.siteUrl}
      />
      <PublicationDetailPage data={data} />
      <TrackPageView
        events={[
          {
            entity_id: data.entity.id,
            event_type: 'publication_view',
            resource_id: data.publication.id,
          },
        ]}
      />
    </>
  )
}
