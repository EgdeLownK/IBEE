import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventEntreePage } from '@/components/public/detail/EventEntreePage'
import { loadEventEntreePage } from '@/lib/load-event-entree'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; eventSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, eventSlug } = await params
  const data = await loadEventEntreePage(slug, eventSlug)
  if (!data) return { title: 'Entrée introuvable' }

  return {
    title: `Entrée — ${data.event.title}`,
    robots: { index: false, follow: false },
  }
}

export default async function EventEntreeRoute({ params }: PageProps) {
  const { slug, eventSlug } = await params
  if (!slug || !eventSlug || slug.startsWith('__')) notFound()

  const data = await loadEventEntreePage(slug, eventSlug)
  if (!data) notFound()

  return <EventEntreePage data={data} />
}
