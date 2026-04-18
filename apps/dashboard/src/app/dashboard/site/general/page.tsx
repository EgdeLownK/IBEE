import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@agora/supabase'
import { ProfileEditor } from './ProfileEditor'

export default async function GeneralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const entity = await getEntityByUserId(supabase, user.id)

  if (!entity) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-neutral-600">
          Aucun profil trouvé. Contacte le support.
        </p>
      </div>
    )
  }

  return <ProfileEditor initialEntity={entity} />
}
