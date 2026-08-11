import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import type { HistoryBlock } from '@ibee/shared'
import type { JobContractType, JobOfferMedia } from '@ibee/supabase'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import { useExclusiveVideoPlayback } from '@/hooks/useExclusiveVideoPlayback'
import { contractLabel } from './contract-labels'
import { JobOfferAdminMenu } from './JobOfferAdminMenu'

/**
 * Carte de liste d'une offre d'emploi. Grille `.job-row` DEDIEE (packages/
 * ui-react/src/profile/profile-styles.css), distincte de `.event-row`
 * (reservee a EventListRow, apps/platform/src/components/profile/
 * ProfileStudioSections.tsx — evenements en production). Les deux grilles
 * partageaient `.event-row` a l'origine ; la carte offre a perdu sa colonne
 * pastille de contrat (remplacee par un tag dans la ligne de tags), ce qui
 * aurait exige de modifier une classe partagee avec un autre type de
 * contenu — d'ou cette grille propre, sur 3 zones nommees en display="full"
 * (media, body, comp — colonne remuneration separee par un filet vertical)
 * et une ligne flex unique en display="compact" (pas de zone comp).
 *
 * Utilise par PublicJobOffersList (visiteur ET apercu studio) et par
 * TalentDashboard (proprietaire, via la variante 'owner').
 *
 * `adminMenu` (menu "trois points" Modifier/Bascule/Supprimer) est
 * volontairement independant de `variant` : le studio (ProfileStudio.tsx)
 * garde `variant="visitor"` pour conserver le CTA "Rejoindre" tel quel et
 * ajoute seulement ce menu par-dessus. Absent (PublicJobOffersList
 * visiteur, TalentDashboard sans action) = aucune trace dans le DOM.
 *
 * `display` ('full' par defaut) est independant de `variant` : seul
 * TalentDashboard (Pilotage) passe 'compact' pour les offres hors ligne —
 * version simplifiee de la carte pleine (image + corps sur deux lignes —
 * titre puis SEUL le tag contrat, fond neutre — + remuneration sur une
 * seule ligne en petit + menu). Pas de date/description/pastille statut/
 * tags de lieu/Cadre (le titre de section "Hors ligne (N)" porte deja
 * l'info de statut). PublicJobOffersList ne l'utilise jamais, elle
 * n'affiche que des offres actives.
 */

export type LocationType = 'remote' | 'onsite' | 'hybrid'
export type CompensationType = 'fixed' | 'percentage'
export type CompensationFrequency = 'weekly' | 'monthly' | 'mission'

// Un tag par information de lieu (pas un libelle unique) : hybrid produit
// DEUX tags (ville puis "Hybride"), les autres types un seul. VOLONTAIRE :
// si la ville manque en hybrid, on n'invente pas de repli — seul onsite a un
// repli documente ("Sur site"), rien de tel n'a ete demande pour hybrid.
export function locationTags(locationType: LocationType, locationText: string | null): string[] {
  const city = locationText?.trim() || null
  if (locationType === 'remote') return ['Télétravail']
  if (locationType === 'hybrid') return city ? [city, 'Hybride'] : ['Hybride']
  return [city || 'Sur site']
}

// "1er" pour le premier du mois, sinon le quantieme brut — Intl.DateTimeFormat
// ne met jamais d'ordinal en francais (rendrait "1 aout" sans correction).
// Factorise avec formatEndDate/formatShortDate (JobOfferDetails.tsx reutilise
// le second pour "Date de fin"/"Publiee le", sans le prefixe "Jusqu'au").
function dayMonth(value: string): string {
  const date = new Date(value)
  const day = date.getDate()
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date)
  return `${day === 1 ? '1er' : day} ${month}`
}

export function formatEndDate(value: string): string {
  return `Jusqu'au ${dayMonth(value)}`
}

// Date courte sans prefixe (ex. "9 août") — JobOfferDetails.tsx (bloc
// caracteristiques : "Date de fin", "Publiée le"), ou le libelle du champ
// porte deja le sens, pas besoin de "Jusqu'au".
export function formatShortDate(value: string): string {
  return dayMonth(value)
}

// Montant + unite (%/€) de la remuneration — compensation_amount et
// compensation_type sont deux colonnes distinctes en base (entity_job_offers),
// jamais concatenees ici : le montant seul doit rester la plus grosse valeur
// affichee, formate independamment de la frequence (voir compensationUnitLabel).
export function formatCompensationAmount(amount: number, type: CompensationType): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(amount)
  return type === 'percentage' ? `${formatted}%` : `${formatted}€`
}

// Ligne "unite" sous le montant (ex. "par mois"). compensation_type
// 'percentage' peut n'avoir aucune compensation_frequency en base (ex. un
// pourcentage de commission sans cadence fixe) — retourne null dans ce cas,
// la ligne est alors simplement absente (pas de valeur inventee).
export function compensationUnitLabel(frequency: CompensationFrequency | null): string | null {
  if (frequency === 'weekly') return 'par semaine'
  if (frequency === 'monthly') return 'par mois'
  if (frequency === 'mission') return 'par mission'
  return null
}

// Nom "Config" (pas "JobOfferAdminMenu") : evite la collision avec le
// composant du meme nom fonctionnel extrait dans ./JobOfferAdminMenu.tsx.
export type JobOfferAdminMenuConfig = {
  status: 'active' | 'inactive'
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
  /** Desactive le declencheur pendant qu'une action serveur est en vol. */
  pending?: boolean
}

type JobOfferRowBaseProps = {
  href: string | null
  title: string
  contractType: JobContractType
  /** Libelle du secteur (job_sectors.label), deja resolu par l'appelant via le join entity_job_offers -> job_sectors. Absent/null = pas de tag secteur (aucun "Non renseigne"). */
  sectorLabel?: string | null
  locationType: LocationType
  locationText: string | null
  endDate: string | null
  isCadre: boolean | null
  compensationAmount?: number | null
  compensationType?: CompensationType | null
  compensationFrequency?: CompensationFrequency | null
  /** Json brut de la colonne `blocks` (entity_job_offers) — HistoryBlock[] en pratique. */
  blocks?: unknown
  /** Premier média (display_order le plus bas) de entity_job_offer_media, deja resolu par l'appelant. Absent/null = repli icone Briefcase. */
  media?: JobOfferMedia | null
  adminMenu?: JobOfferAdminMenuConfig
  /** 'compact' reserve a TalentDashboard (offre hors ligne) — voir en-tete de fichier. */
  display?: 'full' | 'compact'
}

type JobOfferRowProps =
  | (JobOfferRowBaseProps & {
      variant: 'visitor'
      applyHref: string
    })
  | (JobOfferRowBaseProps & {
      variant: 'owner'
      status: 'active' | 'inactive'
      /** Absente = non chargee par l'appelant : ne jamais afficher "0 candidature". */
      applicationsCount?: number
      onEdit?: () => void
      /** Libelle du CTA carte pleine (proprietaire) — 'Modifier' par defaut.
       * /dashboard/talent passe 'Ouvrir' : n'affecte que ce bouton, pas
       * l'entree "Modifier" du menu trois points (adminMenu.onEdit). */
      ctaLabel?: string
    })

export function JobOfferRow(props: JobOfferRowProps) {
  const {
    href,
    title,
    contractType,
    sectorLabel,
    locationType,
    locationText,
    endDate,
    isCadre,
    compensationAmount,
    compensationType,
    compensationFrequency,
    blocks,
    media,
    adminMenu,
    display = 'full',
  } = props
  const { videoRef, cardRef, onMouseEnter, onMouseLeave } = useExclusiveVideoPlayback()
  const contractName = contractLabel(contractType)
  // Ordre valide par Killian (rapport phase 0, mission feat/job-offer-sector-ui) :
  // contrat, puis secteur (absent = aucun tag, jamais "Non renseigne"), puis
  // lieu, puis Cadre en dernier. VOLONTAIRE : le style special du 1er tag
  // (.job-row__tag--contract, ci-dessous) cible l'INDEX 0, pas la nature du
  // tag - toute reorganisation future de cet ordre qui ne garderait pas le
  // contrat en tete casserait ce style sans erreur de compilation.
  const tags = [
    contractName,
    ...(sectorLabel ? [sectorLabel] : []),
    ...locationTags(locationType, locationText),
    ...(isCadre ? ['Cadre'] : []),
  ]
  // Index du tag Cadre calcule par position (toujours en dernier quand present),
  // pas par comparaison de texte : locationText est une saisie libre (onsite/
  // hybrid) qui pourrait theoriquement contenir la chaine "Cadre".
  const cadreTagIndex = isCadre ? tags.length - 1 : -1
  const compensationAmountLabel =
    compensationAmount && compensationType
      ? formatCompensationAmount(compensationAmount, compensationType)
      : null
  const compensationUnit = compensationUnitLabel(compensationFrequency ?? null)
  // Seuil carte pleine (colonne remuneration a largeur fixe, ~150px) :
  // au-dela de 7 caracteres (ex. "454 231€"), .job-row__comp-amount--long
  // bascule sur une taille plus petite pour rester dans la largeur
  // disponible. La carte reduite n'utilise plus ces classes (remuneration
  // en petit sur une seule ligne, voir .job-row__compact-comp).
  const isLongCompensationAmount = (compensationAmountLabel?.length ?? 0) > 7
  const excerpt = blocks ? entityDetailExcerpt({ content_blocks: blocks as HistoryBlock[] }) : ''

  // Vignette .job-row__media : premier media de la galerie offre (deja
  // resolu par l'appelant), repli icone Briefcase si aucun. Video : muette,
  // lecture exclusive toute-page (voir useExclusiveVideoPlayback).
  const mediaNode = !media ? (
    <Briefcase className="job-row__media-icon" aria-hidden="true" />
  ) : media.media_type === 'video' ? (
    <video
      ref={videoRef}
      src={media.url}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  ) : (
    <img src={media.url} alt={media.alt_text ?? ''} />
  )

  const adminMenuNode = adminMenu && (
    <JobOfferAdminMenu
      title={title}
      status={adminMenu.status}
      pending={adminMenu.pending}
      onEdit={adminMenu.onEdit}
      onToggleStatus={adminMenu.onToggleStatus}
      onDelete={adminMenu.onDelete}
    />
  )

  if (display === 'compact') {
    return (
      <article
        className="job-row job-row--compact"
        ref={cardRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {href && <Link className="job-row__stretch" href={href} aria-label={title} />}
        {adminMenuNode}
        <div className="job-row__media">{mediaNode}</div>
        <div className="job-row__body">
          <h3 className="job-row__title">{title}</h3>
          <div className="job-row__tags">
            {/* Carte reduite simplifiee : seul le tag contrat (pas de lieu,
                pas de Cadre). Fond neutre, pas le fond sombre de la carte
                pleine (variante 2e validee, cf. rapport phase 0). */}
            <span className="job-row__tag">{contractName}</span>
          </div>
        </div>
        {/* Bouton "Ouvrir" ajoute par la maquette Claude Design (voir rapport
            phase 0) : contredit sciemment une decision precedente (carte
            reduite sans bouton) — applique sur demande explicite de Killian,
            qui a tranche apres avoir vu la maquette. Le salaire reste a sa
            place (pas repris tel quel de la maquette, qui le deplacait en
            petit a cote du tag). position:relative + z-index:2 necessaires
            pour passer au-dessus de .job-row__stretch (voir job-row__comp-actions
            plus haut dans ce fichier, meme motif). */}
        {(compensationAmountLabel || props.variant === 'owner') && (
          <div className="job-row__compact-actions">
            {compensationAmountLabel && (
              <p className="job-row__compact-comp">
                {compensationAmountLabel}
                {compensationUnit ? ` ${compensationUnit}` : ''}
              </p>
            )}
            {props.variant === 'owner' && props.onEdit && (
              <button type="button" className="job-row__compact-open" onClick={props.onEdit}>
                {props.ctaLabel ?? 'Ouvrir'}
              </button>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <article
      className="job-row"
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {href && <Link className="job-row__stretch" href={href} aria-label={title} />}
      {adminMenuNode}
      <div className="job-row__media">{mediaNode}</div>
      <div className="job-row__body">
        <h3 className={`job-row__title${adminMenu ? ' job-row__title--with-menu' : ''}`}>
          {title}
        </h3>
        {/* Ligne meta (date · candidatures) : emplacement et style repris de
            la maquette Claude Design (voir rapport phase 0), mais le nombre
            de candidatures n'est pas cable (donnee non disponible aujourd'hui,
            applicationsCount jamais fourni par TalentDashboard) — seule la
            date s'affiche tant que cette donnee n'existe pas. Sujet suivi
            separement, ne pas cabler ici. */}
        {(endDate || (props.variant === 'owner' && props.applicationsCount != null)) && (
          <div className="job-row__meta">
            {endDate && <span>{formatEndDate(endDate)}</span>}
            {props.variant === 'owner' && props.applicationsCount != null && (
              <>
                {endDate && <span className="job-row__meta-sep">·</span>}
                <span className="job-row__meta-count">
                  {props.applicationsCount} candidature{props.applicationsCount > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        )}
        {excerpt && <p className="job-row__excerpt">{excerpt}</p>}
        <div className="job-row__tags">
          {tags.map((tag, i) => (
            <span
              key={i}
              className={`job-row__tag${i === 0 ? ' job-row__tag--contract' : ''}${i === cadreTagIndex ? ' job-row__tag--outline' : ''}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="job-row__comp">
        <div className="job-row__comp-info">
          {compensationAmountLabel && (
            <>
              <p
                className={`job-row__comp-amount${isLongCompensationAmount ? ' job-row__comp-amount--long' : ''}`}
              >
                {compensationAmountLabel}
              </p>
              {compensationUnit && <p className="job-row__comp-unit">{compensationUnit}</p>}
            </>
          )}
        </div>
        <div className="job-row__comp-actions">
          {props.variant === 'visitor' ? (
            <Link className="job-row__cta" href={props.applyHref}>
              Rejoindre
            </Link>
          ) : (
            props.onEdit && (
              <button type="button" className="job-row__cta" onClick={props.onEdit}>
                {props.ctaLabel ?? 'Modifier'}
              </button>
            )
          )}
        </div>
      </div>
    </article>
  )
}
