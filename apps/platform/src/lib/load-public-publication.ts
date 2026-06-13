import { createClient } from '@/lib/supabase/server'
import { formatFullDateFr, formatRelativeDateFr } from '@/lib/format-date-fr'
import {
  getCommentsByPublication,
  getEntityBySlug,
  getPublicationByEntityAndSlug,
} from '@ibee/supabase'

export async function loadPublicPublication(slug: string, publicationSlug: string) {
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = !!(user && entity.user_id && user.id === entity.user_id)

  let publication = await getPublicationByEntityAndSlug(supabase, entity.id, publicationSlug)
  if (!publication) return null

  const isPublished =
    publication.status === 'published' &&
    publication.published_at &&
    new Date(publication.published_at) <= new Date()

  if (!isOwner && !isPublished) return null

  const comments = await getCommentsByPublication(supabase, publication.id, { limit: 50 })

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const profileUrl = `${siteUrl}/${entity.slug}`
  const publicationUrl = `${siteUrl}/${entity.slug}/news/${publication.slug}`

  const publishedAt = publication.published_at ?? publication.created_at
  const description = publication.content
    ? publication.content.slice(0, 160) + (publication.content.length > 160 ? '…' : '')
    : `Publication par ${entity.display_name} sur IBEE`

  const ogImage = publication.publication_media?.[0]?.url ?? entity.avatar_url ?? undefined

  return {
    entity: {
      id: entity.id,
      user_id: entity.user_id,
      slug: entity.slug,
      display_name: entity.display_name,
      avatar_url: entity.avatar_url,
    },
    publication: {
      id: publication.id,
      title: publication.title,
      slug: publication.slug,
      content: publication.content,
      status: publication.status,
      published_at: publication.published_at,
      updated_at: publication.updated_at,
      comments_count: publication.comments_count ?? 0,
      publication_media: publication.publication_media ?? [],
    },
    comments,
    isOwner,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    siteUrl,
    profileUrl,
    publicationUrl,
    backHref: `/${entity.slug}#news`,
    profileHref: `/${entity.slug}`,
    relativeDate: formatRelativeDateFr(publishedAt),
    fullDate: formatFullDateFr(publishedAt),
    publishedAt,
    description,
    ogImage,
  }
}

export type PublicPublicationData = NonNullable<Awaited<ReturnType<typeof loadPublicPublication>>>
