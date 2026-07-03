import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound, permanentRedirect } from 'next/navigation'
import { ProductDetailCheckout } from '@/components/public/detail/ProductDetailCheckout'
import { ProductSchemaJsonLd } from '@/components/public/detail/ProductSchemaJsonLd'
import { TrackPageView } from '@/components/analytics/TrackPageView'
import { loadPublicProduct } from '@/lib/load-public-product'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>
  searchParams: Promise<{ rating?: string; sort?: string; preview?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params
  const { rating, sort } = await searchParams
  const result = await loadPublicProduct(slug, productSlug, { rating, sort })

  if (result.kind !== 'ok') {
    return { title: 'Produit introuvable' }
  }

  const { data } = result
  const title = `${data.metaTitle} — IBEE`

  return {
    title,
    description: data.metaDescription,
    openGraph: {
      title,
      description: data.metaDescription,
      url: data.productUrl,
      type: 'website',
      images: data.ogImage ? [{ url: data.ogImage }] : undefined,
    },
    alternates: { canonical: data.productUrl },
    robots: { index: true, follow: true },
  }
}

export default async function ProductDetailRoute({ params, searchParams }: PageProps) {
  const { slug, productSlug } = await params
  const { rating, sort, preview } = await searchParams

  if (!slug || !productSlug || slug.startsWith('__')) notFound()

  if (preview === '1') noStore()

  const result = await loadPublicProduct(slug, productSlug, { rating, sort })

  if (result.kind === 'redirect') {
    permanentRedirect(`/${slug}/shop/${result.newSlug}`)
  }
  if (result.kind === 'not_found') notFound()

  const data = result.data

  return (
    <>
      <ProductSchemaJsonLd data={data} />
      <ProductDetailCheckout data={data} />
      <TrackPageView
        events={[
          {
            entity_id: data.entity.id,
            event_type: 'product_view',
            resource_id: data.product.id,
          },
        ]}
      />
    </>
  )
}
