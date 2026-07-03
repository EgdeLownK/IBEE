'use client'

import { Search } from 'lucide-react'
import type { MessageThread } from '@ibee/supabase'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

type Props = {
  threads: MessageThread[]
  selectedThreadKey: string | null
  search: string
  onSearchChange: (value: string) => void
  onSelect: (threadKey: string) => void
}

export function MessagesContactList({
  threads,
  selectedThreadKey,
  search,
  onSearchChange,
  onSelect,
}: Props) {
  return (
    <aside className="messages-sidebar" aria-label="Contacts">
      <div className="messages-sidebar__search-row">
        <div className="messages-sidebar__search">
          <Search className="messages-sidebar__search-icon h-4 w-4" aria-hidden="true" />
          <input
            type="search"
            className="messages-sidebar__search-input"
            placeholder="Vous recherchez quelqu'un ?"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <ul className="messages-sidebar__list">
        {threads.length === 0 ? (
          <li className="messages-sidebar__empty">Aucune conversation pour le moment.</li>
        ) : (
          threads.map((thread) => {
            const active = thread.threadKey === selectedThreadKey
            return (
              <li key={thread.threadKey}>
                <button
                  type="button"
                  className={`messages-contact${active ? ' is-active' : ''}`}
                  onClick={() => onSelect(thread.threadKey)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="messages-contact__avatar" aria-hidden="true">
                    {initials(thread.contactName)}
                  </span>
                  <span className="messages-contact__body">
                    <span className="messages-contact__top">
                      <span className="messages-contact__name">{thread.contactName}</span>
                      {thread.isClient ? (
                        <span className="messages-contact__badge">Client</span>
                      ) : null}
                    </span>
                    <span className="messages-contact__preview">{thread.lastPreview}</span>
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </aside>
  )
}
