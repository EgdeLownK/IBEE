import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, getClientsByEntity } from '@agora/supabase'
import { ClientsList } from './ClientsList'

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const clients = await getClientsByEntity(supabase, entity.id)

  return <ClientsList clients={clients} />
}
