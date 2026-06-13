import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { ServiceDetailPage } from '@/components/public/detail/ServiceDetailPage'
import { ServiceSchemaJsonLd } from '@/components/public/detail/ServiceSchemaJsonLd'
import { loadPublicService } from '@/lib/load-public-service'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string; serviceSlug: string }>
  searchParams: Promise<{ rating?: string; sort?: string; preview?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, serviceSlug } = await params
  const { rating, sort } = await searchParams
  const data = await loadPublicService(slug, serviceSlug, { rating, sort })
  if (!data) return { title: 'Service introuvable' }

  const title = `${data.service.title} — ${data.entity.display_name} — IBEE`

  return {
    title,
    description: data.description,
    openGraph: {
      title,
      description: data.description,
      url: data.serviceUrl,
      type: 'website',
      images: data.entity.avatar_url ? [{ url: data.entity.avatar_url }] : undefined,
    },
    alternates: { canonical: data.serviceUrl },
    robots: { index: true, follow: true },
  }
}

export default async function ServiceDetailRoute({ params, searchParams }: PageProps) {
  const { slug, serviceSlug } = await params
  const { rating, sort, preview } = await searchParams

  if (!slug || !serviceSlug || slug.startsWith('__')) notFound()

  if (preview === '1') noStore()

  const data = await loadPublicService(slug, serviceSlug, { rating, sort })
  if (!data) notFound()

  return (
    <>
      <ServiceSchemaJsonLd data={data} />
      <ServiceDetailPage data={data} />
    </>
  )
}
