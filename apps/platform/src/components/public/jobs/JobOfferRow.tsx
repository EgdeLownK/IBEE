import Link from 'next/link'
import { Briefcase, MapPin } from 'lucide-react'
import type { HistoryBlock } from '@ibee/shared'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'

/**
 * Carte de liste d'une offre d'emploi, alignee sur EventListRow
 * (apps/platform/src/components/profile/ProfileStudioSections.tsx) : meme
 * grille .event-row (media/body/meta/excerpt/footer/cta), memes classes
 * reutilisees telles quelles. Seules deux pastilles sont propres au job
 * (contrat, statut) — voir profile-styles.css.
 * Utilise par PublicJobOffersList (visiteur ET apercu studio) et par
 * TalentDashboard (proprietaire, via la variante 'owner').
 */

type ContractType = 'cdi' | 'cdd' | 'mission'
type LocationType = 'remote' | 'onsite' | 'hybrid'

// Code court (ligne 1) + libelle secondaire (ligne 2) de la pastille contrat.
// VOLONTAIRE : le libelle secondaire n'a pas de colonne dediee en base (seul
// contract_type existe) — texte de presentation, pas une donnee verifiee.
const CONTRACT_PILL: Record<ContractType, { code: string; label: string }> = {
  cdi: { code: 'CDI', label: 'Temps plein' },
  cdd: { code: 'CDD', label: 'Durée déterminée' },
  mission: { code: 'FREE', label: 'Mission' },
}

const LOCATION_LABELS: Record<LocationType, string> = {
  remote: '100% Télétravail',
  onsite: 'Sur site',
  hybrid: 'Hybride',
}

function locationLabel(locationType: LocationType, locationText: string | null): string {
  if (locationType === 'remote') return LOCATION_LABELS.remote
  return locationText || LOCATION_LABELS[locationType] || LOCATION_LABELS.onsite
}

function formatPublishedDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

type JobOfferRowBaseProps = {
  href: string | null
  title: string
  contractType: ContractType
  locationType: LocationType
  locationText: string | null
  createdAt: string
  compensationLabel?: string | null
  /** Json brut de la colonne `blocks` (entity_job_offers) — HistoryBlock[] en pratique. */
  blocks?: unknown
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
    })

export function JobOfferRow(props: JobOfferRowProps) {
  const {
    href,
    title,
    contractType,
    locationType,
    locationText,
    createdAt,
    compensationLabel,
    blocks,
  } = props
  const pill = CONTRACT_PILL[contractType]
  const excerpt = blocks ? entityDetailExcerpt({ content_blocks: blocks as HistoryBlock[] }) : ''

  return (
    <article className="event-row">
      {href && <Link className="event-row__stretch" href={href} aria-label={title} />}

      <div className="event-row__contract" aria-hidden="true">
        <span className="event-row__contract-code">{pill.code}</span>
        <span className="event-row__contract-label">{pill.label}</span>
      </div>

      <div className="event-row__media">
        <Briefcase className="event-row__media-icon" aria-hidden="true" />
      </div>

      <div className="event-row__body">
        <h3 className="event-row__title">{title}</h3>
        <ul className="event-row__meta">
          <li>
            <MapPin className="event-row__meta-icon" aria-hidden="true" />
            <span>{locationLabel(locationType, locationText)}</span>
          </li>
          <li>
            <span>Publiée le {formatPublishedDate(createdAt)}</span>
          </li>
        </ul>
        {excerpt && <p className="event-row__excerpt">{excerpt}</p>}
        <div className="event-row__footer">
          <div className="event-row__footer-start flex items-center gap-2.5">
            {compensationLabel && <p className="event-row__price">{compensationLabel}</p>}
            {props.variant === 'owner' && (
              <>
                <span
                  className={`event-row__status event-row__status--${props.status === 'active' ? 'active' : 'inactive'}`}
                >
                  {props.status === 'active' ? 'En ligne' : 'Hors ligne'}
                </span>
                {props.applicationsCount != null && (
                  <span className="text-xs text-neutral-500">
                    {props.applicationsCount} candidature{props.applicationsCount > 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="event-row__footer-actions">
            {props.variant === 'visitor' ? (
              <Link className="event-row__cta" href={props.applyHref}>
                Postuler
              </Link>
            ) : (
              props.onEdit && (
                <button type="button" className="event-row__cta" onClick={props.onEdit}>
                  Modifier
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
