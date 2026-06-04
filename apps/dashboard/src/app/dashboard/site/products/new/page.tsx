import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@ibee/supabase'
import { ProductForm } from '../components/ProductForm'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <ProductForm userId={user.id} mode="create" />
    </div>
  )
}
