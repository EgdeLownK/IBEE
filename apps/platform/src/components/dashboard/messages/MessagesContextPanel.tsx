'use client'

import { CalendarClock, FileText, ShoppingBag, X } from 'lucide-react'
import type { MessageThread } from '@ibee/supabase'

type Props = {
  thread: MessageThread | null
  compact?: boolean
  open?: boolean
  onClose?: () => void
}

function ContextBody({ thread }: { thread: MessageThread | null }) {
  if (!thread) {
    return (
      <p className="messages-context__empty">
        Sélectionne une conversation pour voir le document.
      </p>
    )
  }

  return (
    <>
      <section className="messages-context__section">
        <h3 className="messages-context__label">Contact</h3>
        <p className="messages-context__value">{thread.contactEmail}</p>
      </section>

      <section className="messages-context__section">
        <h3 className="messages-context__label">Activité récente</h3>
        <ul className="messages-context__timeline">
          <li className="messages-context__timeline-item is-placeholder">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <div>
              <p className="messages-context__timeline-title">Commandes</p>
              <p className="messages-context__timeline-meta">Bientôt disponible</p>
            </div>
          </li>
          <li className="messages-context__timeline-item is-placeholder">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            <div>
              <p className="messages-context__timeline-title">Rendez-vous</p>
              <p className="messages-context__timeline-meta">Bientôt disponible</p>
            </div>
          </li>
        </ul>
      </section>
    </>
  )
}

export function MessagesContextPanel({
  thread,
  compact = false,
  open = false,
  onClose,
}: Props) {
  const head = (
    <header className="messages-context__head">
      <h2 className="messages-context__title">
        <FileText className="h-4 w-4" aria-hidden="true" />
        Document
      </h2>
      {compact ? (
        <button
          type="button"
          className="messages-context__close"
          onClick={onClose}
          aria-label="Fermer le document"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </header>
  )

  if (compact) {
    return (
      <div
        className={`messages-context-overlay${open ? ' is-open' : ''}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="messages-context-overlay__backdrop"
          onClick={onClose}
          aria-label="Fermer le document"
          tabIndex={open ? 0 : -1}
        />
        <aside
          className="messages-context messages-context--sheet"
          aria-label="Document"
          role="dialog"
          aria-modal="true"
        >
          {head}
          <div className="messages-context__body">
            <ContextBody thread={thread} />
          </div>
        </aside>
      </div>
    )
  }

  return (
    <aside className="messages-context" aria-label="Document">
      {head}
      <div className="messages-context__body">
        <ContextBody thread={thread} />
      </div>
    </aside>
  )
}
