import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createPublicSupabaseClient } from '@/lib/site-url'
import { createClient } from '@/lib/supabase/server'
import { getEntityBySlug, getProjectJobOffer } from '@ibee/supabase'
import { PublicJobOfferDetail } from '@/components/public/jobs/PublicJobOfferDetail'

type Props = {
  params: Promise<{ slug: string; offerId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, offerId } = await params
  const supabase = createPublicSupabaseClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return { title: 'Offre introuvable' }
  try {
    const offer = await getProjectJobOffer(supabase, entity.id, offerId)
    return {
      title: `${offer.title} — ${entity.display_name}`,
      description: `Offre d'emploi chez ${entity.display_name}`,
    }
  } catch {
    return { title: 'Offre introuvable' }
  }
}

export default async function PublicJobOfferPage({ params }: Props) {
  const { slug, offerId } = await params
  const supabase = createPublicSupabaseClient()

  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) notFound()

  let offer
  try {
    offer = await getProjectJobOffer(supabase, entity.id, offerId)
  } catch {
    notFound()
  }

  if (offer.status !== 'active') notFound()

  // Récupérer l'utilisateur connecté (si auth)
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  return (
    <PublicJobOfferDetail
      offer={offer}
      entitySlug={slug}
      entityName={entity.display_name}
      entityAvatarUrl={entity.avatar_url}
      isAuthenticated={!!user}
      userEmail={user?.email ?? ''}
      userFirstName={''}
      userLastName={''}
    />
  )
}
