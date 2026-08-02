'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, MoreVertical, Pencil, Trash2 } from 'lucide-react'

type Props = {
  /** Nom de l'offre, pour le libelle accessible du bouton declencheur. */
  title: string
  /** Absent (en-tete de /dashboard/talent/[offerId]) = pas d'entree bascule
   * statut, menu limite a Modifier/Supprimer. */
  status?: 'active' | 'inactive'
  onEdit: () => void
  onToggleStatus?: () => void
  onDelete: () => void
  /** Desactive le declencheur pendant qu'une action serveur est en vol. */
  pending?: boolean
}

/**
 * Menu "trois points" (Modifier / bascule statut optionnelle / Supprimer)
 * d'une offre d'emploi. Extrait tel quel de JobOfferRow.tsx (cartes de
 * /dashboard/talent) pour etre reutilise par l'en-tete de
 * /dashboard/talent/[offerId] (JobOfferDetails.tsx) SANS dupliquer le motif
 * — memes classes CSS (job-row__admin, job-row__menu-trigger, widget-menu*,
 * packages/ui-react/src/profile/profile-styles.css), meme comportement
 * d'ouverture/fermeture (clic exterieur). `.job-row__admin` est en
 * `position: absolute` (top:10/right:10) : tout appelant doit fournir un
 * ancrage `position: relative` de taille adaptee — voir
 * `.talent-page__admin-menu-anchor` (talent-styles.css) pour l'usage hors
 * carte, ou `.job-row` lui-meme (deja position:relative) pour les cartes.
 */
export function JobOfferAdminMenu({
  title,
  status,
  onEdit,
  onToggleStatus,
  onDelete,
  pending,
}: Props) {
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
    <div className={`job-row__admin${menuOpen ? ' is-open' : ''}`} ref={menuRef}>
      <button
        type="button"
        className="job-row__menu-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Options pour ${title}`}
        disabled={pending}
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
              onEdit()
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span>Modifier</span>
          </button>
          {status && onToggleStatus && (
            <button
              type="button"
              className="widget-menu__item"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setMenuOpen(false)
                onToggleStatus()
              }}
            >
              {status === 'active' ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{status === 'active' ? 'Mettre hors ligne' : 'Mettre en ligne'}</span>
            </button>
          )}
          <button
            type="button"
            className="widget-menu__item widget-menu__item--danger"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen(false)
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Supprimer</span>
          </button>
        </div>
      )}
    </div>
  )
}
