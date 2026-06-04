import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId, getPublicationById } from '@ibee/supabase'
import { EditNewsEditor } from './EditNewsEditor'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const publication = await getPublicationById(supabase, id)
  if (!publication || publication.entity_id !== entity.id) {
    redirect('/dashboard/site/news')
  }

  return (
    <EditNewsEditor
      userId={user.id}
      publication={publication}
    />
  )
}
