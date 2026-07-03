'use client'

import { useState } from 'react'

const MAX_LENGTH = 150

type Props = {
  content: string
}

export function PublicationCardText({ content }: Props) {
  const [expanded, setExpanded] = useState(false)
  const trimmed = content.trim()
  const isLong = trimmed.length > MAX_LENGTH
  const displayed =
    expanded || !isLong ? trimmed : `${trimmed.slice(0, MAX_LENGTH).trimEnd()}…`

  return (
    <div className="pub-card__text-wrap">
      <p className="pub-card__text">
        {displayed}
        {isLong && (
          <>
            {' '}
            <button
              type="button"
              className="pub-card__text-toggle"
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
            >
              {expanded ? 'Afficher moins' : 'Afficher plus'}
            </button>
          </>
        )}
      </p>
    </div>
  )
}
