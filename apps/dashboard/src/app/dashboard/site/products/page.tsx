import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, listProductsByEntity } from '@ibee/supabase'
import { ProductsHome } from './ProductsHome'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const products = await listProductsByEntity(supabase, entity.id, { limit: 200 })

  const params = await searchParams
  const toastMessage =
    params.toast === 'created'
      ? 'Produit créé avec succès.'
      : params.toast === 'updated'
      ? 'Produit mis à jour.'
      : params.toast === 'deleted'
      ? 'Produit supprimé.'
      : undefined

  return (
    <ProductsHome
      products={products.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        type: p.type,
        status: p.status,
        price_cents: p.price_cents,
        currency: p.currency,
        physical_stock_quantity: p.physical_stock_quantity,
        media: (p.product_media ?? [])
          .slice()
          .sort((a, b) => a.display_order - b.display_order)
          .map((m) => m.url),
      }))}
      toastMessage={toastMessage}
    />
  )
}
