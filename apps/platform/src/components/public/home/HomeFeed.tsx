'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HomeFeedPage, HomeFeedPost, HomeFeedRow } from '@ibee/shared'
import { HomeFeedCard } from './HomeFeedCard'
import { HomeFeedNewsRow } from './HomeFeedNewsRow'
import { HomeFeedProfilesRow } from './HomeFeedProfilesRow'
import { HomeFeedPreviewPanel } from './HomeFeedPreviewPanel'

type Props = {
  initial: HomeFeedPage
}

function mergeRows(current: HomeFeedRow[], incoming: HomeFeedRow[]) {
  const posts = new Set(
    current
      .filter((row): row is Extract<HomeFeedRow, { type: 'post' }> => row.type === 'post')
      .map((row) => `${row.post.kind}:${row.post.id}`)
  )

  const next = [...current]
  for (const row of incoming) {
    if (row.type === 'post') {
      const key = `${row.post.kind}:${row.post.id}`
      if (posts.has(key)) continue
      posts.add(key)
      next.push(row)
      continue
    }
    next.push(row)
  }
  return next
}

function findFirstPost(rows: HomeFeedRow[]): HomeFeedPost | null {
  const row = rows.find((item): item is Extract<HomeFeedRow, { type: 'post' }> => item.type === 'post')
  return row?.post ?? null
}

function isSamePost(a: HomeFeedPost | null, b: HomeFeedPost | null) {
  if (!a || !b) return false
  return a.kind === b.kind && a.id === b.id
}

export function HomeFeed({ initial }: Props) {
  const [rows, setRows] = useState<HomeFeedRow[]>(initial.rows)
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [selectedPost, setSelectedPost] = useState<HomeFeedPost | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const previewSlotRef = useRef<HTMLDivElement | null>(null)
  const [previewFixedRect, setPreviewFixedRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  const syncPreviewRect = useCallback(() => {
    const slot = previewSlotRef.current
    if (!slot) {
      setPreviewFixedRect(null)
      return
    }
    const rect = slot.getBoundingClientRect()
    setPreviewFixedRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isDesktop) {
      setSelectedPost(null)
      return
    }
    const first = findFirstPost(rows)
    if (!first) {
      setSelectedPost(null)
      return
    }
    setSelectedPost((current) => {
      if (!current) return first
      const stillVisible = rows.some(
        (row) => row.type === 'post' && row.post.kind === current.kind && row.post.id === current.id
      )
      return stillVisible ? current : first
    })
  }, [isDesktop, rows])

  useEffect(() => {
    if (!isDesktop) {
      setPreviewFixedRect(null)
      return
    }

    syncPreviewRect()
    const slot = previewSlotRef.current
    if (!slot) return

    const observer = new ResizeObserver(() => syncPreviewRect())
    observer.observe(slot)

    window.addEventListener('resize', syncPreviewRect)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncPreviewRect)
    }
  }, [isDesktop, syncPreviewRect])

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/home-feed?cursor=${encodeURIComponent(cursor)}&limit=12`)
      if (!res.ok) throw new Error('fetch')
      const data = (await res.json()) as HomeFeedPage
      setRows((prev) => mergeRows(prev, data.rows))
      setCursor(data.nextCursor)
    } catch {
      setError('Impossible de charger la suite du feed.')
    } finally {
      setLoading(false)
    }
  }, [cursor, loading])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '240px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, loadMore])

  const hasPosts = rows.some((row) => row.type === 'post')

  const feedColumn = (
    <div className="home-feed-layout__feed">
      <div className="home-feed__inner">
        {!hasPosts ? (
          <div className="home-feed__empty">
            <p>Aucun contenu avec image pour le moment.</p>
            <p className="home-feed__empty-sub">
              Les produits, événements et services publiés apparaîtront ici.
            </p>
          </div>
        ) : (
          rows.map((row, index) => {
            if (row.type === 'post') {
              return (
                <HomeFeedCard
                  key={`${row.post.kind}-${row.post.id}`}
                  post={row.post}
                  isDesktop={isDesktop}
                  isSelected={isDesktop && isSamePost(selectedPost, row.post)}
                  onSelect={setSelectedPost}
                />
              )
            }
            if (row.type === 'news') {
              return <HomeFeedNewsRow key={`news-${index}`} items={row.items} />
            }
            return <HomeFeedProfilesRow key={`profiles-${index}`} items={row.items} />
          })
        )}

        {error ? <p className="home-feed__error">{error}</p> : null}
        {loading ? <p className="home-feed__loading">Chargement…</p> : null}
        <div ref={sentinelRef} className="home-feed__sentinel" aria-hidden="true" />
      </div>
    </div>
  )

  return (
    <main className="home-feed-layout">
      <div className="home-feed-layout__cluster">
        {feedColumn}
        {isDesktop ? (
          <div
            ref={previewSlotRef}
            className="home-feed-preview home-feed-preview--slot"
            aria-hidden="true"
          />
        ) : null}
      </div>
      {isDesktop && previewFixedRect ? (
        <HomeFeedPreviewPanel post={selectedPost} fixedRect={previewFixedRect} />
      ) : null}
    </main>
  )
}
