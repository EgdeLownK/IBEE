'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

export type WidgetEditMode = 'config' | 'faq' | 'none'

type Props = {
  editMode?: WidgetEditMode
  placement?: 'header' | 'overlay' | 'card'
  triggerClassName?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function WidgetAdminMenu({
  editMode = 'config',
  placement = 'header',
  triggerClassName,
  onEdit,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const showEdit = editMode !== 'none'

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

  const shellClass =
    placement === 'card'
      ? `wfeat__admin-menu${menuOpen ? ' is-open' : ''}`
      : placement === 'overlay'
        ? `widget__overlay-menu${menuOpen ? ' is-open' : ''}`
        : 'relative'

  const defaultTrigger =
    placement === 'overlay' || placement === 'card'
      ? 'widget__menu-trigger widget__menu-trigger--overlay'
      : 'widget__menu-trigger'

  return (
    <div className={shellClass} ref={menuRef}>
      <button
        type="button"
        className={triggerClassName ?? defaultTrigger}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Options du widget"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      {menuOpen && (
        <div className="widget-menu" role="menu">
          {showEdit && (
            <button
              type="button"
              className="widget-menu__item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onEdit?.()
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              <span>{editMode === 'faq' ? 'Modifier le contenu' : 'Modifier'}</span>
            </button>
          )}
          <button
            type="button"
            className="widget-menu__item widget-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              onDelete?.()
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
