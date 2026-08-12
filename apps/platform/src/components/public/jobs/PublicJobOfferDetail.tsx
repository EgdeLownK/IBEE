'use client'

import { useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import type {
  JobOffer,
  JobOfferMedia,
  JobOfferWithMedia,
  JobOfferWithMediaAndEntity,
} from '@ibee/supabase'
import { parseHistoryBlocks } from '@ibee/shared'
import { MediaGalleryCarousel } from '@ibee/ui-react'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import { RelatedContent } from '../detail/RelatedContent'
import { ApplyBottomSheet } from './ApplyBottomSheet'
import { contractLabel } from './contract-labels'

const LOCATION_LABELS: Record<string, string> = {
  remote: '100% Télétravail',
  onsite: 'Sur site',
  hybrid: 'Hybride',
}

function compensationLabel(offer: JobOffer): string | null {
  if (!offer.compensation_type || !offer.compensation_amount) return null
  const unit = offer.compensation_type === 'percentage' ? '%' : '€'
  const freq =
    offer.compensation_frequency === 'monthly'
      ? ' / mois'
      : offer.compensation_frequency === 'weekly'
        ? ' / semaine'
        : offer.compensation_frequency === 'mission'
          ? ' / mission'
          : ''
  return `${offer.compensation_amount}${unit}${freq}`
}

function locationLabel(offer: JobOffer): string {
  if (offer.location_type === 'remote') return LOCATION_LABELS.remote!
  return offer.location_text || LOCATION_LABELS[offer.location_type] || 'Sur site'
}

// Premiere media (display_order le plus bas) pour la vignette RelatedContent
// -- trie cote appelant, meme convention que le reste du fichier (galerie,
// carte Pilotage).
function firstMediaUrl(mediaList: JobOfferMedia[] | undefined): string | null {
  if (!mediaList || mediaList.length === 0) return null
  return [...mediaList].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]!.url
}

interface Props {
  offer: JobOffer
  /** Triee par display_order par l'appelant (page.tsx). */
  media?: JobOfferMedia[]
  sectorLabel?: string | null
  entitySlug: string
  entityName: string
  entityAvatarUrl: string | null
  isAuthenticated: boolean
  userEmail: string
  userFirstName: string
  userLastName: string
  /** Autres offres actives du meme profil, offre courante deja exclue par l'appelant (page.tsx). */
  otherProfileOffers?: JobOfferWithMedia[]
  /** Offres actives du meme secteur chez d'autres entites, deja resolu vide si l'offre n'a pas de secteur. */
  similarOffers?: JobOfferWithMediaAndEntity[]
}

/**
 * Restructuration feat/lot2-detail-restructure (remplace la colonne
 * laterale sticky + portail #job-offer-buybox-portal de la refonte du 3
 * aout, devenue perimee) : ProfileShell (carte 800px unique) + DetailTopBar,
 * puis en-tete (avatar/titre agrandis) avant la galerie, stats "faits cles"
 * en ligne, galerie MediaGalleryCarousel repositionnee plus bas et
 * redimensionnee (media-gallery-carousel.css), CTA "Rejoindre" en barre
 * collante pleine largeur (identique desktop/mobile, plus de duplication
 * flux/sidebar). Sections maquette a donnee absente (equipe, prerequis,
 * carte du lieu, "poste en trois points", badge "Nouveau") deliberement
 * absentes -- lot 4. Pas de DetailEntityStrip : ce composant partage
 * (Event/Service/Booking) ne rend en realite ni avatar ni displayName
 * (props declarees, jamais utilisees dans son JSX) -- le reprendre aurait
 * fait disparaitre l'avatar, contraire a la consigne "reste affiche".
 */
export function PublicJobOfferDetail({
  offer,
  media = [],
  sectorLabel,
  entitySlug,
  entityName,
  entityAvatarUrl,
  isAuthenticated,
  userEmail,
  userFirstName,
  userLastName,
  otherProfileOffers = [],
  similarOffers = [],
}: Props) {
  const [applyOpen, setApplyOpen] = useState(false)

  const blocks = offer.blocks ? parseHistoryBlocks(offer.blocks) : []
  const comp = compensationLabel(offer)

  // Faits cles : 2 a 4 items selon les champs renseignes (secteur/remuneration
  // optionnels) -- jamais de "Non renseigne" invente, l'item est simplement
  // absent (meme regle que le tag secteur des cartes, JobOfferRow.tsx). Ordre
  // fixe Contrat/Secteur/Lieu/Remuneration. La maquette montre Contrat/
  // Horaires/Duree en ligne : Horaires et Duree n'existent pas en base
  // (aucune colonne heures hebdomadaires / duree de contrat sur
  // entity_job_offers) -- on garde la disposition en ligne demandee mais
  // avec les donnees reelles disponibles, jamais une case vide (rapport
  // phase 0, feat/lot2-detail-restructure).
  const facts = [
    { label: 'Contrat', value: contractLabel(offer.contract_type) },
    ...(sectorLabel ? [{ label: 'Secteur', value: sectorLabel }] : []),
    { label: 'Lieu', value: locationLabel(offer) },
    ...(comp ? [{ label: 'Rémunération', value: comp }] : []),
  ]

  // RelatedContent (detail/RelatedContent.tsx, lu, jamais modifie) : son
  // type Kind ('service'|'product'|'event') n'inclut pas 'job', mais
  // KIND_LABEL associe n'est de toute facon jamais rendu dans son JSX (import
  // mort deja present avant cette mission) -- kind: 'service' est une valeur
  // arbitraire non affichee, sans consequence visuelle.
  const otherProfileItems = otherProfileOffers.map((o) => ({
    kind: 'service' as const,
    title: o.title,
    meta: `${contractLabel(o.contract_type)} · ${locationLabel(o)}`,
    href: `/${entitySlug}/offres/${o.id}`,
    cover_url: firstMediaUrl(o.entity_job_offer_media),
  }))

  // "Offres similaires" : chaque offre appartient a une AUTRE entite -- le
  // nom de l'entite remplace le lieu dans le meta (contexte plus utile ici
  // que la localisation) et l'URL utilise le slug de CETTE entite, pas
  // entitySlug (page courante).
  const similarItems = similarOffers.map((o) => ({
    kind: 'service' as const,
    title: o.title,
    meta: o.entity
      ? `${contractLabel(o.contract_type)} · ${o.entity.display_name}`
      : contractLabel(o.contract_type),
    href: o.entity ? `/${o.entity.slug}/offres/${o.id}` : undefined,
    cover_url: firstMediaUrl(o.entity_job_offer_media),
  }))

  return (
    <main className="profile-page">
      <div className="mx-auto w-full max-w-[800px] xl:px-8 lg:px-4">
        <ProfileShell>
          <DetailTopBar
            backHref={`/${entitySlug}#jobs`}
            title={`Voir le profil de ${entityName}`}
          />

          <div className="flex items-start gap-5 px-[22px] pt-5">
            {entityAvatarUrl ? (
              <img
                src={entityAvatarUrl}
                alt={entityName}
                className="h-[100px] w-[100px] shrink-0 rounded-tile object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <span className="mb-2 block text-sm text-neutral-500">{entityName}</span>
              <h1 className="font-display text-[44px] font-bold leading-tight text-neutral-900">
                {offer.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto px-[22px] pt-5">
            {facts.map((fact, i) => (
              <div
                key={fact.label}
                className={`flex min-w-0 shrink-0 flex-col gap-1 ${i > 0 ? 'border-l border-border pl-5' : ''}`}
              >
                <span className="whitespace-nowrap font-display text-base font-semibold text-neutral-900">
                  {fact.value}
                </span>
                <span className="whitespace-nowrap text-xs text-neutral-400">{fact.label}</span>
              </div>
            ))}
          </div>

          <MediaGalleryCarousel media={media} title={offer.title} />

          <div className="px-[22px] py-6 space-y-4 text-sm text-neutral-700">
            {blocks.map((block, i) => {
              if (block.type === 'text') {
                return (
                  <p key={i} className="whitespace-pre-wrap leading-relaxed">
                    {block.content}
                  </p>
                )
              }
              if (block.type === 'list') {
                return (
                  <ul key={i} className="list-disc pl-5 space-y-1">
                    {block.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )
              }
              if (block.type === 'image' && block.images?.[0]) {
                return (
                  <img
                    key={i}
                    src={block.images[0].url}
                    alt={block.title ?? ''}
                    className="rounded-lg w-full"
                  />
                )
              }
              return null
            })}
          </div>

          {otherProfileItems.length > 0 && (
            <div className="pb-2">
              <RelatedContent
                title="Autres offres de ce profil"
                items={otherProfileItems}
                moreHref={`/${entitySlug}#jobs`}
              />
            </div>
          )}

          {similarItems.length > 0 && (
            <div className="pb-6">
              <RelatedContent title="Offres similaires" items={similarItems} />
            </div>
          )}
        </ProfileShell>
      </div>

      {/* Barre collante : ancree a bottom: var(--app-navpill-clearance)
          (pas bottom:0 comme la maquette) pour ne jamais passer sous la nav
          pill flottante (navpill.css, position:fixed;bottom:24px -- rapport
          phase 0, feat/lot2-detail-restructure). Identique desktop/mobile,
          remplace la colonne laterale + portail ci-dessus. */}
      <div className="sticky bottom-[var(--app-navpill-clearance)] z-10 px-4">
        <div className="mx-auto flex w-full max-w-[800px] items-center gap-4 rounded-pill bg-ink px-3 py-3 pl-6 text-white shadow-pop">
          <p className="min-w-0 flex-1 truncate font-display text-base font-medium">
            {offer.title}
          </p>
          <button
            type="button"
            onClick={() => setApplyOpen(true)}
            className="btn btn--accent shrink-0"
          >
            Rejoindre
          </button>
        </div>
      </div>

      <ApplyBottomSheet
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        offerId={offer.id}
        offerTitle={offer.title}
        entityName={entityName}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </main>
  )
}
