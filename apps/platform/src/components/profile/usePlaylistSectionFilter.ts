'use client'

import { useMemo, useState } from 'react'
import type { PlaylistCategory } from './PlaylistSectionToolbar'

type Options<T> = {
  items: T[]
  categories: PlaylistCategory[]
  getCategoryId: (item: T) => string | null | undefined
  getSearchText: (item: T) => string
}

export function usePlaylistSectionFilter<T extends { id: string }>({
  items,
  categories,
  getCategoryId,
  getSearchText,
}: Options<T>) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const showCategories = categories.length >= 2
  const normalizedQuery = query.trim().toLowerCase()

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !normalizedQuery || getSearchText(item).toLowerCase().includes(normalizedQuery)
      const matchesCategory =
        !showCategories || activeCategory === 'all' || getCategoryId(item) === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [items, normalizedQuery, showCategories, activeCategory, getCategoryId, getSearchText])

  return {
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    filteredItems,
    playlistCategories: categories,
  }
}
