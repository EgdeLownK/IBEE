import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookingConfirmedPage } from '@/components/public/detail/BookingConfirmedPage'
import { loadBookingConfirmed } from '@/lib/load-booking-confirmed'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; serviceSlug: string }>
  searchParams: Promise<{ name?: string; date?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, serviceSlug } = await params
  const data = await loadBookingConfirmed(slug, serviceSlug)
  if (!data) return { title: 'Confirmation introuvable' }

  return {
    title: `Rendez-vous confirmé — ${data.entity.display_name} — IBEE`,
    robots: { index: false, follow: false },
  }
}

export default async function BookingConfirmedRoute({ params, searchParams }: PageProps) {
  const { slug, serviceSlug } = await params
  const { name, date } = await searchParams

  if (!slug || !serviceSlug || slug.startsWith('__')) notFound()

  const data = await loadBookingConfirmed(slug, serviceSlug)
  if (!data) notFound()

  return <BookingConfirmedPage data={data} bookerName={name ?? ''} dateRecap={date ?? ''} />
}
