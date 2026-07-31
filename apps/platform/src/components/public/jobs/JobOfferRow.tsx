import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Eye, EyeOff, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { HistoryBlock } from '@ibee/shared'
import type { JobContractType } from '@ibee/supabase'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import { contractPill } from './contract-labels'

/**
 * Carte de liste d'une offre d'emploi, alignee sur EventListRow
 * (apps/platform/src/components/profile/ProfileStudioSections.tsx) : meme
 * grille .event-row (media/body/meta/excerpt/footer/cta), memes classes
 * reutilisees telles quelles. Seules deux pastilles sont propres au job
 * (contrat, statut) — voir profile-styles.css.
 * Utilise par PublicJobOffersList (visiteur ET apercu studio) et par
 * TalentDashboard (proprietaire, via la variante 'owner').
 *
 * `adminMenu` (menu "trois points" Modifier/Bascule/Supprimer) est
 * volontairement independant de `variant` : le studio (ProfileStudio.tsx)
 * garde `variant="visitor"` pour conserver le CTA "Postuler" tel quel et
 * ajoute seulement ce menu par-dessus - meme motif (.event-row__admin /
 * .widget-menu, profile-styles.css) que le menu proprietaire des events
 * dans ProfileStudioSections.tsx. Absent (PublicJobOffersList visiteur,
 * TalentDashboard) = aucune trace dans le DOM.
 */

type LocationType = 'remote' | 'onsite' | 'hybrid'

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

export type JobOfferAdminMenu = {
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
  locationType: LocationType
  locationText: string | null
  createdAt: string
  compensationLabel?: string | null
  /** Json brut de la colonne `blocks` (entity_job_offers) — HistoryBlock[] en pratique. */
  blocks?: unknown
  adminMenu?: JobOfferAdminMenu
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
    adminMenu,
  } = props
  const pill = contractPill(contractType)
  const excerpt = blocks ? entityDetailExcerpt({ content_blocks: blocks as HistoryBlock[] }) : ''
  const displayStatus = props.variant === 'owner' ? props.status : adminMenu?.status

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  return (
    <article className="event-row">
      {href && <Link className="event-row__stretch" href={href} aria-label={title} />}

      {adminMenu && (
        <div className={`event-row__admin${menuOpen ? ' is-open' : ''}`} ref={menuRef}>
          <button
            type="button"
            className="event-row__menu-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Options pour ${title}`}
            disabled={adminMenu.pending}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="widget-menu" role="menu">
              <button
                type="button"
                className="widget-menu__item"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen(false)
                  adminMenu.onEdit()
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Modifier</span>
              </button>
              <button
                type="button"
                className="widget-menu__item"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen(false)
                  adminMenu.onToggleStatus()
                }}
              >
                {adminMenu.status === 'active' ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {adminMenu.status === 'active' ? 'Mettre hors ligne' : 'Mettre en ligne'}
                </span>
              </button>
              <button
                type="button"
                className="widget-menu__item widget-menu__item--danger"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen(false)
                  adminMenu.onDelete()
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Supprimer</span>
              </button>
            </div>
          )}
        </div>
      )}

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
            {displayStatus && (
              <span
                className={`event-row__status event-row__status--${displayStatus === 'active' ? 'active' : 'inactive'}`}
              >
                {displayStatus === 'active' ? 'En ligne' : 'Hors ligne'}
              </span>
            )}
            {props.variant === 'owner' && props.applicationsCount != null && (
              <span className="text-xs text-neutral-500">
                {props.applicationsCount} candidature{props.applicationsCount > 1 ? 's' : ''}
              </span>
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
