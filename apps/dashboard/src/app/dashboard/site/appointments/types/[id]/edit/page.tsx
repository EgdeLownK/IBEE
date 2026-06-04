import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, getAppointmentTypeById } from '@ibee/supabase'
import { AppointmentTypeEditorFull } from '../../AppointmentTypeEditorFull'

export default async function EditAppointmentTypePage({
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
  const type = await getAppointmentTypeById(supabase, id)
  if (!type || type.entity_id !== entity.id) notFound()

  return <AppointmentTypeEditorFull editData={type} />
}
