import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@ibee/supabase'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const entity = await getEntityByUserId(supabase, user.id)

  if (!entity) {
    // Cas anormal (le trigger handle_new_user garantit une entity par user).
    // signOut obligatoire avant /login : le middleware renvoie les connectés
    // de /login vers / — sans déconnexion, redirect('/login') bouclerait.
    console.error(`[page /] Entity introuvable pour user_id=${user.id}`)
    await supabase.auth.signOut()
    redirect('/login')
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'
  redirect(`${webUrl}/${entity.slug}`)
}
