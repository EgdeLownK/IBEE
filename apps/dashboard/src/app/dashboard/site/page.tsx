import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityByUserId } from '@agora/supabase'
import { ExternalLink, Newspaper } from 'lucide-react'

export default async function SiteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'
  const profileUrl = entity ? `${webUrl}/${entity.slug}` : undefined

  return (
    <div className="mx-auto max-w-[800px] p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Bienvenue sur le dashboard de ton site
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Gère ton identité, tes contenus et ton engagement depuis ici.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-0 p-6 transition hover:border-accent hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 group-hover:text-accent transition-colors">Voir mon site</p>
              <p className="mt-0.5 text-xs text-neutral-400">Ouvrir ton profil public dans un nouvel onglet</p>
            </div>
          </a>
        )}

        <a
          href="/dashboard/site/news/new"
          className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-0 p-6 transition hover:border-accent hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 group-hover:text-accent transition-colors">Créer une publication</p>
            <p className="mt-0.5 text-xs text-neutral-400">Publie une news pour ta communauté</p>
          </div>
        </a>
      </div>
    </div>
  )
}
