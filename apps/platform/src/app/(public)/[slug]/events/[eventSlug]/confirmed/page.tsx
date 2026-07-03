import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventConfirmedPage } from '@/components/public/detail/EventConfirmedPage'
import { loadEventConfirmed } from '@/lib/load-event-confirmed'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; eventSlug: string }>
  searchParams: Promise<{ session_id?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, eventSlug } = await params
  const data = await loadEventConfirmed(slug, eventSlug, null)
  if (!data) return { title: 'Confirmation introuvable' }

  return {
    title: `Billet confirmé — ${data.entity.display_name} — IBEE`,
    robots: { index: false, follow: false },
  }
}

export default async function EventConfirmedRoute({ params, searchParams }: PageProps) {
  const { slug, eventSlug } = await params
  const { session_id: sessionId } = await searchParams

  if (!slug || !eventSlug || slug.startsWith('__')) notFound()

  const data = await loadEventConfirmed(slug, eventSlug, sessionId ?? null)
  if (!data) notFound()

  return <EventConfirmedPage data={data} />
}
