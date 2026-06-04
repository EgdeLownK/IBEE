import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, getProductById, listProductVariants } from '@ibee/supabase'
import { ProductForm, type ProductFormInitial } from '../../components/ProductForm'
import type { VariantDraft } from '../../components/VariantsEditor'

function attributesLabel(attributes: unknown): string {
  if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
    const entries = Object.entries(attributes as Record<string, unknown>)
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')
    }
  }
  return 'Variante'
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const { id } = await params
  const product = await getProductById(supabase, id)
  if (!product) notFound()

  const variants = await listProductVariants(supabase, id, { activeOnly: false })

  const variantDrafts: VariantDraft[] = variants.map((v) => ({
    id: v.id,
    attributesLabel: attributesLabel(v.attributes),
    sku: v.sku,
    price_cents_override: v.price_cents_override,
    stock_quantity: v.stock_quantity,
    is_active: v.is_active,
  }))

  const initial: ProductFormInitial = {
    id: product.id,
    type: product.type,
    title: product.title,
    slug: product.slug,
    description_short: product.description_short,
    description_long: product.description_long ?? '',
    priceInput: (product.price_cents / 100).toString().replace('.', ','),
    currency: product.currency,
    category: product.category ?? '',
    tags: product.tags ?? [],
    status: product.status,
    digital_file_url: product.digital_file_url ?? '',
    digital_file_format: product.digital_file_format ?? 'pdf',
    digital_license: product.digital_license ?? 'personal',
    physical_condition: product.physical_condition ?? 'new',
    physical_pickup_location: product.physical_pickup_location ?? '',
    stock_quantity: (product.physical_stock_quantity ?? 0).toString(),
    media: (product.product_media ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((m) => ({ url: m.url })),
    variants: variantDrafts,
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductForm userId={user.id} mode="edit" initial={initial} />
    </div>
  )
}
