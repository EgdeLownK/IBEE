import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookingPage } from '@/components/public/detail/BookingPage'
import { loadPublicBooking } from '@/lib/load-public-booking'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; serviceSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, serviceSlug } = await params
  const data = await loadPublicBooking(slug, serviceSlug)
  if (!data) return { title: 'Réservation introuvable' }

  return {
    title: `Réserver ${data.service.title} — ${data.entity.display_name} — IBEE`,
    robots: { index: false, follow: false },
  }
}

export default async function ServiceBookingRoute({ params }: PageProps) {
  const { slug, serviceSlug } = await params

  if (!slug || !serviceSlug || slug.startsWith('__')) notFound()

  const data = await loadPublicBooking(slug, serviceSlug)
  if (!data) notFound()

  return <BookingPage data={data} />
}
