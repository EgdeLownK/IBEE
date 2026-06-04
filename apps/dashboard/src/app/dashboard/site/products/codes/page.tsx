import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, listDiscountCodes, listProductsByEntity } from '@ibee/supabase'
import { DiscountCodesHome, type DiscountCodeRow, type ProductOption } from './DiscountCodesHome'

export default async function DiscountCodesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const [codes, products] = await Promise.all([
    listDiscountCodes(supabase, entity.id, { limit: 200 }),
    listProductsByEntity(supabase, entity.id, { limit: 200 }),
  ])

  const codeRows: DiscountCodeRow[] = codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    applies_to: c.applies_to,
    is_active: c.is_active,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    max_uses_total: c.max_uses_total,
    max_uses_per_user: c.max_uses_per_user,
    min_purchase_cents: c.min_purchase_cents,
    productIds: (c.discount_code_products ?? []).map((p) => p.product_id),
    categories: (c.discount_code_categories ?? []).map((cat) => cat.category),
  }))

  const productOptions: ProductOption[] = products.map((p) => ({ id: p.id, title: p.title }))

  return <DiscountCodesHome codes={codeRows} products={productOptions} />
}
