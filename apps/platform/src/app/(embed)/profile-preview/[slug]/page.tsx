import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicProfilePage } from '@/components/public/PublicProfilePage'
import { loadPublicProfileBySlug } from '@/lib/load-public-profile'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await loadPublicProfileBySlug(slug)
  if (!data) return { title: 'Profil introuvable' }

  return {
    title: `${data.entity.display_name} — Aperçu`,
    robots: { index: false, follow: false },
  }
}

export default async function ProfilePreviewPage({ params }: PageProps) {
  const { slug } = await params
  if (!slug) notFound()

  const data = await loadPublicProfileBySlug(slug)
  if (!data) notFound()

  return (
    <div className="mx-auto max-w-[800px] md:py-6">
      <PublicProfilePage data={data} />
    </div>
  )
}
