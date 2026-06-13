'use client'

import { useCallback, useEffect, useState } from 'react'
import { Compass, Globe, Search, SearchX } from 'lucide-react'

type SearchResult = {
  slug: string
  display_name: string
  role: string | null
  location: string | null
  avatar_url: string | null
}

type ExploreState = 'initial' | 'empty' | 'loading' | 'results'

export function ExploreClient() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<ExploreState>('initial')
  const [results, setResults] = useState<SearchResult[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [previewItem, setPreviewItem] = useState<SearchResult | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const doSearch = useCallback(async (append: boolean, searchQuery: string, fromOffset: number) => {
    if (!searchQuery) {
      setState('initial')
      setResults([])
      setSelectedSlug('')
      setPreviewItem(null)
      setHasMore(false)
      setOffset(0)
      return
    }

    if (!append) {
      setState('loading')
      setOffset(0)
      setResults([])
    }

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&offset=${append ? fromOffset : 0}`
      )
      const data = (await res.json()) as { results: SearchResult[]; hasMore: boolean }

      setResults((prev) => {
        const next = append ? [...prev, ...data.results] : data.results
        if (next.length === 0) {
          setState('empty')
          setHasMore(false)
          setOffset(0)
          return []
        }
        setState('results')
        setHasMore(data.hasMore)
        setOffset(next.length)
        return next
      })
    } catch {
      setState('empty')
      setResults([])
      setHasMore(false)
      setOffset(0)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void doSearch(false, query.trim(), 0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, doSearch])

  function handleSelect(item: SearchResult) {
    if (!isDesktop) {
      window.location.href = `/${item.slug}`
      return
    }
    setSelectedSlug(item.slug)
    setPreviewItem(item)
  }

  return (
    <main className="flex h-[calc(100dvh-var(--app-header-height))] overflow-hidden">
      <div className="flex w-full flex-col border-r border-neutral-200 bg-neutral-0 md:w-[35%]">
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un profil…"
              className="field w-full pl-9 pr-9"
              aria-label="Rechercher un profil"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-panel"
              >
                Effacer
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {state === 'initial' ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <Compass className="mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
              <p className="text-sm text-neutral-500">Tape un nom, un métier ou une ville pour explorer.</p>
            </div>
          ) : null}

          {state === 'empty' ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <SearchX className="mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
              <p className="text-sm text-neutral-500">Aucun profil trouvé.</p>
            </div>
          ) : null}

          {state === 'loading' ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 rounded-md px-4 py-3">
                  <div className="h-10 w-10 rounded-full bg-panel-2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-panel-2" />
                    <div className="h-2 w-1/3 rounded bg-panel-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {state === 'results' ? (
            <div role="list" className="p-2">
              {results.map((r) => {
                const initial = r.display_name?.charAt(0).toUpperCase() ?? '?'
                const selected = r.slug === selectedSlug
                return (
                  <div
                    key={r.slug}
                    role="listitem"
                    onClick={() => handleSelect(r)}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-4 py-3 transition ${
                      selected ? 'bg-background' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
                      {r.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-accent">{initial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{r.display_name}</p>
                      <p className="text-xs text-neutral-500">@{r.slug}</p>
                      {r.role ? <span className="text-xs text-neutral-600">{r.role}</span> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {state === 'results' && hasMore ? (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => void doSearch(true, query.trim(), offset)}
                className="w-full rounded-lg bg-neutral-100 px-4 py-2 text-center text-sm font-medium text-neutral-600 transition hover:bg-neutral-200"
              >
                Charger plus
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden flex-1 overflow-y-auto bg-background md:block">
        {!previewItem ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Globe className="mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="text-sm text-neutral-500">Sélectionne un profil pour l&apos;aperçu.</p>
          </div>
        ) : (
          <iframe
            key={previewItem.slug}
            src={`/profile-preview/${previewItem.slug}`}
            title={`Aperçu de ${previewItem.display_name}`}
            className="h-full w-full border-0 bg-neutral-50"
          />
        )}
      </div>
    </main>
  )
}
