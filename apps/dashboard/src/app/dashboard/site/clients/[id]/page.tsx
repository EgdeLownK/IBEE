import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  getClientById,
  getClientBookings,
} from '@ibee/supabase'
import { ClientDetail } from './ClientDetail'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const { id } = await params
  const client = await getClientById(supabase, id)
  if (!client || client.entity_id !== entity.id) notFound()

  const bookings = await getClientBookings(supabase, id)

  return <ClientDetail client={client} bookings={bookings} />
}
