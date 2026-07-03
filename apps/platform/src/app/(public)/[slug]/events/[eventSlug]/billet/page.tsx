import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventTicketPage } from '@/components/public/detail/EventTicketPage'
import { loadEventTicket } from '@/lib/load-event-ticket'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; eventSlug: string }>
  searchParams: Promise<{ code?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, eventSlug } = await params
  const { code } = await searchParams
  const data = await loadEventTicket(slug, eventSlug, code ?? null)
  if (!data) return { title: 'Billet introuvable' }

  return {
    title: `Mon billet — ${data.event.title} — IBEE`,
    robots: { index: false, follow: false },
  }
}

export default async function EventTicketRoute({ params, searchParams }: PageProps) {
  const { slug, eventSlug } = await params
  const { code } = await searchParams

  if (!slug || !eventSlug || slug.startsWith('__')) notFound()

  const data = await loadEventTicket(slug, eventSlug, code ?? null)
  if (!data) notFound()

  return <EventTicketPage data={data} />
}
