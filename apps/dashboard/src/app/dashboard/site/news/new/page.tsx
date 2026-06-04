import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@ibee/supabase'
import { NewsEditor } from './NewsEditor'

export default async function NewNewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'

  return (
    <NewsEditor
      userId={user.id}
      webUrl={webUrl}
      entitySlug={entity.slug}
    />
  )
}
