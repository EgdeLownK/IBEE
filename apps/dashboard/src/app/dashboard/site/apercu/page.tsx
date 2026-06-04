import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@ibee/supabase'

export default async function ApercuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'
  const embedUrl = entity ? `${webUrl}/${entity.slug}?embed=true` : webUrl

  return (
    <div className="flex flex-1 flex-col h-full">
      <iframe
        src={embedUrl}
        className="flex-1 w-full border-0"
        title="Aperçu du site"
      />
    </div>
  )
}
