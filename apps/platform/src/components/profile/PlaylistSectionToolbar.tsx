'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export type PlaylistCategory = { id: string; label: string }

type Props = {
  categories: PlaylistCategory[]
  searchPlaceholder: string
  query: string
  onQueryChange: (query: string) => void
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function PlaylistSectionToolbar({
  categories,
  searchPlaceholder,
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const showCategories = categories.length >= 2
  const isSearchExpanded = searchOpen || !showCategories

  useEffect(() => {
    if (searchOpen && showCategories) inputRef.current?.focus()
  }, [searchOpen, showCategories])

  function handleClearOrClose() {
    onQueryChange('')
    if (showCategories) {
      setSearchOpen(false)
    }
  }

  const searchButton = (
    <button
      type="button"
      className={`playlist-search-btn${showCategories ? ' playlist-search-btn--trailing' : ''}`}
      aria-label="Rechercher"
      aria-expanded={searchOpen}
      onClick={() => setSearchOpen(true)}
    >
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  )

  return (
    <div className="playlist-toolbar">
      {isSearchExpanded ? (
        <div className="playlist-search">
          <Search className="h-[18px] w-[18px] shrink-0 text-neutral-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="playlist-search__input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {(query || showCategories) && (
            <button
              type="button"
              className="playlist-search__clear"
              aria-label={showCategories && !query ? 'Fermer la recherche' : 'Effacer la recherche'}
              onClick={handleClearOrClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="playlist-toolbar__row playlist-toolbar__row--with-cats">
          <div className="playlist-cats" role="tablist" aria-label="Catégories">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              className={`playlist-cat${activeCategory === 'all' ? ' is-active' : ''}`}
              onClick={() => onCategoryChange('all')}
            >
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`playlist-cat${activeCategory === cat.id ? ' is-active' : ''}`}
                onClick={() => onCategoryChange(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {searchButton}
        </div>
      )}
    </div>
  )
}
