'use client'

import { ChevronRight } from 'lucide-react'
import { WidgetAdminMenu, type WidgetEditMode } from './WidgetAdminMenu'

interface Props {
  title: string
  titleHref?: string
  filled?: boolean
  editMode?: WidgetEditMode
  /** Masque l'en-tête (titre + menu) — ex. carte mise en avant avec menu dans la card */
  headerVariant?: 'default' | 'hidden'
  onEdit?: () => void
  onDelete?: () => void
  children: React.ReactNode
}

export function WidgetCard({
  title,
  titleHref,
  filled = false,
  editMode = 'config',
  headerVariant = 'default',
  onEdit,
  onDelete,
  children,
}: Props) {
  const hidden = headerVariant === 'hidden'

  const menuProps = {
    editMode,
    onEdit,
    onDelete,
  }

  return (
    <div className="widget-sort-item">
      <article className={`widget${filled ? ' widget--filled' : ''}${hidden ? ' widget--header-hidden' : ''}`}>
        {!hidden && (
          <header className="widget__head">
            {titleHref ? (
              <a href={titleHref} className="widget__title widget__title--link widget__title--with-arrow">
                <span>{title}</span>
                <ChevronRight className="widget__title-arrow" aria-hidden="true" />
              </a>
            ) : (
              <h3 className="widget__title">{title}</h3>
            )}
            <WidgetAdminMenu {...menuProps} placement="header" />
          </header>
        )}
        <div className="widget__body">{children}</div>
      </article>
    </div>
  )
}
