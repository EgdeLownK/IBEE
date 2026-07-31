import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Eye, EyeOff, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { HistoryBlock } from '@ibee/shared'
import type { JobContractType } from '@ibee/supabase'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import { contractLabel } from './contract-labels'

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
 * garde `variant="visitor"` pour conserver le CTA "Postuler" tel quel et
 * ajoute seulement ce menu par-dessus. Absent (PublicJobOffersList
 * visiteur, TalentDashboard sans action) = aucune trace dans le DOM.
 *
 * `display` ('full' par defaut) est independant de `variant` : seul
 * TalentDashboard (Pilotage) passe 'compact' pour les offres hors ligne
 * (image + titre + tag contrat + menu, hauteur reduite, pas de date/
 * description/lieu/remuneration). PublicJobOffersList ne l'utilise jamais,
 * elle n'affiche que des offres actives.
 */

type LocationType = 'remote' | 'onsite' | 'hybrid'
type CompensationType = 'fixed' | 'percentage'
type CompensationFrequency = 'weekly' | 'monthly' | 'mission'

// Un tag par information de lieu (pas un libelle unique) : hybrid produit
// DEUX tags (ville puis "Hybride"), les autres types un seul. VOLONTAIRE :
// si la ville manque en hybrid, on n'invente pas de repli — seul onsite a un
// repli documente ("Sur site"), rien de tel n'a ete demande pour hybrid.
function locationTags(locationType: LocationType, locationText: string | null): string[] {
  const city = locationText?.trim() || null
  if (locationType === 'remote') return ['Télétravail']
  if (locationType === 'hybrid') return city ? [city, 'Hybride'] : ['Hybride']
  return [city || 'Sur site']
}

// "1er" pour le premier du mois, sinon le quantieme brut — Intl.DateTimeFormat
// ne met jamais d'ordinal en francais (rendrait "1 aout" sans correction).
function formatEndDate(value: string): string {
  const date = new Date(value)
  const day = date.getDate()
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date)
  return `Jusqu'au ${day === 1 ? '1er' : day} ${month}`
}

// Montant + unite (%/€) de la remuneration — compensation_amount et
// compensation_type sont deux colonnes distinctes en base (entity_job_offers),
// jamais concatenees ici : le montant seul doit rester la plus grosse valeur
// affichee, formate independamment de la frequence (voir compensationUnitLabel).
function formatCompensationAmount(amount: number, type: CompensationType): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(amount)
  return type === 'percentage' ? `${formatted}%` : `${formatted}€`
}

// Ligne "unite" sous le montant (ex. "par mois"). compensation_type
// 'percentage' peut n'avoir aucune compensation_frequency en base (ex. un
// pourcentage de commission sans cadence fixe) — retourne null dans ce cas,
// la ligne est alors simplement absente (pas de valeur inventee).
function compensationUnitLabel(frequency: CompensationFrequency | null): string | null {
  if (frequency === 'weekly') return 'par semaine'
  if (frequency === 'monthly') return 'par mois'
  if (frequency === 'mission') return 'par mission'
  return null
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
  endDate: string | null
  isCadre: boolean | null
  compensationAmount?: number | null
  compensationType?: CompensationType | null
  compensationFrequency?: CompensationFrequency | null
  /** Json brut de la colonne `blocks` (entity_job_offers) — HistoryBlock[] en pratique. */
  blocks?: unknown
  adminMenu?: JobOfferAdminMenu
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
    })

export function JobOfferRow(props: JobOfferRowProps) {
  const {
    href,
    title,
    contractType,
    locationType,
    locationText,
    endDate,
    isCadre,
    compensationAmount,
    compensationType,
    compensationFrequency,
    blocks,
    adminMenu,
    display = 'full',
  } = props
  const contractName = contractLabel(contractType)
  const tags = [
    contractName,
    ...locationTags(locationType, locationText),
    ...(isCadre ? ['Cadre'] : []),
  ]
  const compensationAmountLabel =
    compensationAmount && compensationType
      ? formatCompensationAmount(compensationAmount, compensationType)
      : null
  const compensationUnit = compensationUnitLabel(compensationFrequency ?? null)
  const excerpt = blocks ? entityDetailExcerpt({ content_blocks: blocks as HistoryBlock[] }) : ''
  // La pastille statut a disparu du profil (seules les offres actives y sont
  // listees, elle n'informerait de rien) mais reste affichee sur la carte
  // reduite de Pilotage — seule surface qui liste aussi les offres hors ligne.
  const compactStatus =
    props.variant === 'owner' && display === 'compact' ? props.status : undefined

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

  const adminMenuNode = adminMenu && (
    <div className={`job-row__admin${menuOpen ? ' is-open' : ''}`} ref={menuRef}>
      <button
        type="button"
        className="job-row__menu-trigger"
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
            <span>{adminMenu.status === 'active' ? 'Mettre hors ligne' : 'Mettre en ligne'}</span>
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
  )

  if (display === 'compact') {
    return (
      <article className="job-row job-row--compact">
        {href && <Link className="job-row__stretch" href={href} aria-label={title} />}
        {adminMenuNode}
        <div className="job-row__media">
          <Briefcase className="job-row__media-icon" aria-hidden="true" />
        </div>
        <div className="job-row__body">
          <h3 className="job-row__title">{title}</h3>
          <div className="job-row__tags">
            {/* Carte reduite : tag contrat en fond neutre, PAS le fond sombre
                de la carte pleine (variante 2e validee, cf. rapport phase 0). */}
            <span className="job-row__tag">{contractName}</span>
            {compactStatus && (
              <span className={`event-row__status event-row__status--${compactStatus}`}>
                {compactStatus === 'active' ? 'En ligne' : 'Hors ligne'}
              </span>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="job-row">
      {href && <Link className="job-row__stretch" href={href} aria-label={title} />}
      {adminMenuNode}
      <div className="job-row__media">
        <Briefcase className="job-row__media-icon" aria-hidden="true" />
      </div>
      <div className="job-row__body">
        <h3 className="job-row__title">{title}</h3>
        {endDate && <p className="job-row__end-date">{formatEndDate(endDate)}</p>}
        {excerpt && <p className="job-row__excerpt">{excerpt}</p>}
        <div className="job-row__tags">
          {tags.map((tag, i) => (
            <span key={i} className={`job-row__tag${i === 0 ? ' job-row__tag--contract' : ''}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="job-row__comp">
        <div className="job-row__comp-info">
          {compensationAmountLabel && (
            <>
              <p className="job-row__comp-amount">{compensationAmountLabel}</p>
              {compensationUnit && <p className="job-row__comp-unit">{compensationUnit}</p>}
            </>
          )}
          {props.variant === 'owner' && props.applicationsCount != null && (
            <span className="job-row__comp-meta">
              {props.applicationsCount} candidature{props.applicationsCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="job-row__comp-actions">
          {props.variant === 'visitor' ? (
            <Link className="job-row__cta" href={props.applyHref}>
              Postuler
            </Link>
          ) : (
            props.onEdit && (
              <button type="button" className="job-row__cta" onClick={props.onEdit}>
                Modifier
              </button>
            )
          )}
        </div>
      </div>
    </article>
  )
}
