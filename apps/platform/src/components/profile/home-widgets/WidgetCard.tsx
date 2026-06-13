'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from 'lucide-react'

type WidgetEditMode = 'config' | 'faq' | 'none'

interface Props {
  title: string
  filled?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  editMode?: WidgetEditMode
  onMoveUp?: () => void
  onMoveDown?: () => void
  onEdit?: () => void
  onDelete?: () => void
  children: React.ReactNode
}

export function WidgetCard({
  title,
  filled = false,
  canMoveUp = false,
  canMoveDown = false,
  editMode = 'config',
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  children,
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

  const showEdit = editMode !== 'none'

  return (
    <div className="widget-sort-item">
      <article className={`widget${filled ? ' widget--filled' : ''}`}>
        <header className="widget__head">
          <h3 className="widget__title">{title}</h3>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="widget__menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Options du widget"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="widget-menu" role="menu">
                <button
                  type="button"
                  className="widget-menu__item"
                  role="menuitem"
                  disabled={!canMoveUp}
                  onClick={() => {
                    setMenuOpen(false)
                    onMoveUp?.()
                  }}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  <span>Monter</span>
                </button>
                <button
                  type="button"
                  className="widget-menu__item"
                  role="menuitem"
                  disabled={!canMoveDown}
                  onClick={() => {
                    setMenuOpen(false)
                    onMoveDown?.()
                  }}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  <span>Descendre</span>
                </button>
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
        </header>
        <div className="widget__body">{children}</div>
      </article>
    </div>
  )
}
