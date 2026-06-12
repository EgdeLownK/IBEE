import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntityBySlug } from '@ibee/supabase'

export default async function ProfilePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!slug) notFound()

  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) notFound()

  const initial = entity.display_name.charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-[800px] md:py-8">
      <article className="overflow-hidden bg-neutral-0 md:rounded-2xl md:shadow-md">
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
              {entity.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entity.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-accent">{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold text-neutral-900">
                {entity.display_name}
              </h1>
              {entity.role ? (
                <p className="truncate text-sm text-neutral-500">{entity.role}</p>
              ) : null}
              <p className="text-xs text-neutral-400">@{entity.slug}</p>
            </div>
          </div>
          {entity.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">{entity.bio}</p>
          ) : null}
        </div>
        <p className="px-6 py-4 text-xs text-neutral-400">
          Aperçu simplifié — profil complet disponible prochainement sur Next.js.
        </p>
      </article>
    </div>
  )
}
