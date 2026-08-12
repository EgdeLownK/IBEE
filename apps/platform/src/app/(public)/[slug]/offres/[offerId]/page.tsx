import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createPublicSupabaseClient } from '@/lib/site-url'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityBySlug,
  getProjectJobOffer,
  listOtherActiveJobOffersByEntity,
  listSimilarActiveJobOffersBySector,
} from '@ibee/supabase'
import { PublicJobOfferDetail } from '@/components/public/jobs/PublicJobOfferDetail'

// Nombre d'offres par section de contenus lies (memes profil / secteur) --
// A VALIDER PAR KILLIAN : repris par defaut de la limite boutique
// equivalente (load-public-product.ts, .slice(0, 4) pour profileRelated/
// similarRelated), faute de besoin metier connu specifique aux offres.
const RELATED_OFFERS_LIMIT = 4

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

  // Trie cote appelant, meme convention que product_media (pas d'ordre sur
  // relation embarquee cote requete, cf. project-talent.ts).
  const media = [...(offer.entity_job_offer_media ?? [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  )

  // Aptitudes demandees ("Demande dans l'offre") -- meme convention de tri
  // cote appelant que media ci-dessus. Reduit a {id, label} : PublicJobOfferDetail
  // n'a besoin de rien d'autre pour l'affichage (Lot 4 Mission 2).
  const skills = [...(offer.entity_job_offer_skills ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((s) => ({ id: s.skill_id, label: s.job_skills.label }))

  // Deux sections de contenus lies (mission feat/job-offer-related-content) :
  // dependent de `offer` (entity_id, sector_id) donc apres sa resolution,
  // mais paralleles entre elles (Promise.all). Offre sans secteur : pas de
  // section "similaires" (rapprochement impossible), resolue directement en
  // tableau vide sans requete.
  const [otherProfileOffers, similarOffers] = await Promise.all([
    listOtherActiveJobOffersByEntity(supabase, entity.id, offer.id, RELATED_OFFERS_LIMIT),
    offer.sector_id
      ? listSimilarActiveJobOffersBySector(
          supabase,
          offer.sector_id,
          entity.id,
          RELATED_OFFERS_LIMIT,
        )
      : Promise.resolve([]),
  ])

  return (
    <PublicJobOfferDetail
      offer={offer}
      media={media}
      sectorLabel={offer.job_sectors?.label ?? null}
      entitySlug={slug}
      entityName={entity.display_name}
      entityAvatarUrl={entity.avatar_url}
      isAuthenticated={!!user}
      userEmail={user?.email ?? ''}
      userFirstName={''}
      userLastName={''}
      otherProfileOffers={otherProfileOffers}
      similarOffers={similarOffers}
      skills={skills}
    />
  )
}
