import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ManualRegContactPage } from '@/components/public/detail/ManualRegContactPage'
import { loadManualRegContactPage } from '@/lib/load-manual-reg-contact-page'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; eventSlug: string; token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await loadManualRegContactPage(token)
  if (!data) return { title: 'Lien introuvable' }

  return {
    title: `Inscription — ${data.eventTitle}`,
    robots: { index: false, follow: false },
  }
}

export default async function ManualRegContactRoute({ params }: PageProps) {
  const { slug, eventSlug, token } = await params
  if (!slug || !eventSlug || !token || slug.startsWith('__')) notFound()

  const data = await loadManualRegContactPage(token)
  if (!data) notFound()

  return <ManualRegContactPage data={data} />
}
