import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { EventDetailPage } from '@/components/public/detail/EventDetailPage'
import { EventSchemaJsonLd } from '@/components/public/detail/EventSchemaJsonLd'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import { loadPublicEvent } from '@/lib/load-public-event'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string; eventSlug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, eventSlug } = await params
  const data = await loadPublicEvent(slug, eventSlug)
  if (!data) return { title: 'Événement introuvable' }

  const title = `${data.event.title} — ${data.entity.display_name} — IBEE`

  return {
    title,
    description: data.description,
    openGraph: {
      title,
      description: data.description,
      url: data.eventUrl,
      type: 'website',
      images: data.coverImage
        ? [{ url: data.coverImage }]
        : data.entity.avatar_url
          ? [{ url: data.entity.avatar_url }]
          : undefined,
    },
    alternates: { canonical: data.eventUrl },
    robots: { index: true, follow: true },
  }
}

export default async function EventDetailRoute({ params, searchParams }: PageProps) {
  const { slug, eventSlug } = await params
  const { preview } = await searchParams

  if (!slug || !eventSlug || slug.startsWith('__')) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user || preview === '1') noStore()

  const data = await loadPublicEvent(slug, eventSlug)
  if (!data) notFound()

  return (
    <>
      <EventSchemaJsonLd data={data} />
      <EventDetailPage data={data} />
      <TrackPageView
        events={[
          {
            entity_id: data.entity.id,
            event_type: 'event_view',
            resource_id: data.event.id,
          },
        ]}
      />
    </>
  )
}
