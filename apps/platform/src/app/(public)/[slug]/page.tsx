import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { ProfileJsonLd } from '@/components/public/ProfileJsonLd'
import { PublicProfilePage } from '@/components/public/PublicProfilePage'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import { loadPublicProfileBySlug } from '@/lib/load-public-profile'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await loadPublicProfileBySlug(slug)
  if (!data) return { title: 'Profil introuvable' }

  const title = `${data.entity.display_name} — IBEE`
  const description = data.entity.bio ?? `${data.entity.display_name} sur IBEE`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: data.profileUrl,
      type: 'profile',
    },
    alternates: { canonical: data.profileUrl },
    robots: { index: true, follow: true },
  }
}

export default async function PublicProfileRoute({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { preview } = await searchParams

  if (!slug || slug.startsWith('__')) notFound()

  const data = await loadPublicProfileBySlug(slug)
  if (!data) notFound()

  const isPreview = preview === '1'
  if (isPreview) noStore()

  return (
    <>
      <ProfileJsonLd
        entity={data.entity}
        siteUrl={data.siteUrl}
        profileUrl={data.profileUrl}
        faqItems={data.faqActive ? data.faqItems : []}
      />
      <PublicProfilePage data={data} />
      <TrackPageView events={[{ entity_id: data.entity.id, event_type: 'profile_view' }]} />
    </>
  )
}
