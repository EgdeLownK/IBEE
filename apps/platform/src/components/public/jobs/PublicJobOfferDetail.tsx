'use client'

import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
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

// Ne s'abonne a rien (jamais de re-render declenche) : useSyncExternalStore
// sert ici uniquement a distinguer serveur (snapshot false, document
// n'existe pas) de client apres hydratation (snapshot true) -- pattern
// recommande pour ce besoin precis, evite l'erreur eslint
// react-hooks/set-state-in-effect que declenche le motif classique
// useState+useEffect(() => setMounted(true)) (deja gelee pour ce meme motif
// dans ProductDetail.tsx via eslint-suppressions.json, mais uniquement pour
// ce fichier -- ne pas elargir cette liste).
function subscribeNever() {
  return () => {}
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
 * Refonte sur le modele de ProductDetail/ProductDetailPage (lu, jamais
 * modifie) : ProfileShell (carte 800px) + DetailTopBar, galerie en premier,
 * bloc "faits cles" bordé + bouton Postuler dupliques en flux (<1200px,
 * juste apres le titre) et via portail dans une colonne laterale sticky
 * (>=1200px) -- meme mecanisme que #buybox-portal (ProductDetail.tsx), sous
 * un id distinct (job-offer-buybox-portal) pour ne jamais partager de DOM
 * avec la page produit. Pas de DetailEntityStrip : ce composant partage
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
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )

  const blocks = offer.blocks ? parseHistoryBlocks(offer.blocks) : []
  const comp = compensationLabel(offer)

  // Faits cles : 2 a 4 items selon les champs renseignes (secteur/remuneration
  // optionnels) -- jamais de "Non renseigne" invente, l'item est simplement
  // absent (meme regle que le tag secteur des cartes, JobOfferRow.tsx). Ordre
  // fixe Contrat/Secteur/Lieu/Remuneration : avec la grille 2 colonnes
  // ci-dessous, ca produit exactement Contrat|Secteur // Lieu|Remuneration
  // quand les 4 sont presents (disposition demandee par Killian suite au
  // debordement de la version 4-colonnes-egales -- secteur/remuneration
  // peuvent etre des libelles longs, ex. "Marketing, Communication & Design").
  const facts = [
    { label: 'Contrat', value: contractLabel(offer.contract_type) },
    ...(sectorLabel ? [{ label: 'Secteur', value: sectorLabel }] : []),
    { label: 'Lieu', value: locationLabel(offer) },
    ...(comp ? [{ label: 'Rémunération', value: comp }] : []),
  ]
  // 2 colonnes fixes en toutes circonstances (pas de bascule par largeur,
  // decision Killian). grid-cols-2 (minmax(0,1fr) implicite) empeche tout
  // debordement horizontal -- un libelle long wrap plutot que deborder,
  // contrairement au flex precedent. Dernier item en nombre impair (3
  // faits, ex. pas de remuneration) : occupe les 2 colonnes plutot que de
  // laisser une cellule vide a cote. Bordures posees par position (pas de
  // divide-x/divide-y, inadaptes a une grille 2D) : verticale entre les 2
  // colonnes sauf sur la ligne qui span, horizontale entre les lignes sauf
  // la derniere -- meme hauteur de cellule automatique par ligne (CSS
  // Grid stretch), donc pas de desalignement si un libelle passe sur 2
  // lignes.
  const factRows = Math.ceil(facts.length / 2)

  const buyBoxContent = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-card border border-border bg-surface">
        {facts.map((fact, i) => {
          const isSpanningLast = facts.length % 2 === 1 && i === facts.length - 1
          const row = isSpanningLast ? factRows - 1 : Math.floor(i / 2)
          const isLastRow = row === factRows - 1
          const isRightCol = !isSpanningLast && i % 2 === 1
          return (
            <div
              key={fact.label}
              className={[
                'flex flex-col items-center justify-center gap-1 px-2 py-3 text-center',
                isSpanningLast ? 'col-span-2' : '',
                !isSpanningLast && !isRightCol ? 'border-r border-border' : '',
                !isLastRow ? 'border-b border-border' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {fact.label}
              </span>
              <span className="font-display text-[15px] font-bold text-neutral-900">
                {fact.value}
              </span>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={() => setApplyOpen(true)} className="btn btn--dark btn--block">
        Postuler à cette offre
      </button>
    </div>
  )

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
      <div className="flex justify-center items-start gap-8 mx-auto w-full max-w-[1152px] xl:px-8 lg:px-4">
        <ProfileShell>
          <DetailTopBar
            backHref={`/${entitySlug}#jobs`}
            title={`Voir le profil de ${entityName}`}
          />

          <MediaGalleryCarousel media={media} title={offer.title} />

          <div className="px-[22px] pt-4">
            <div className="flex items-center gap-2 mb-3">
              {entityAvatarUrl ? (
                <img
                  src={entityAvatarUrl}
                  alt={entityName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : null}
              <span className="text-sm text-neutral-500">{entityName}</span>
            </div>
            <h1 className="font-display text-[28px] font-bold text-neutral-900">{offer.title}</h1>
          </div>

          <div className="lg:hidden px-[22px] mt-5">{buyBoxContent}</div>

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

        <aside
          id="job-offer-buybox-portal"
          className="hidden lg:block w-[320px] shrink-0 sticky top-8 bg-surface border border-border shadow-shell rounded-card p-6"
        />

        {mounted && document.getElementById('job-offer-buybox-portal')
          ? createPortal(buyBoxContent, document.getElementById('job-offer-buybox-portal')!)
          : null}
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
