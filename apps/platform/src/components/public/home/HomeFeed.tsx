'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HomeFeedPage, HomeFeedRow } from '@ibee/shared'
import { HomeFeedCard } from './HomeFeedCard'
import { HomeFeedNewsRow } from './HomeFeedNewsRow'
import { HomeFeedProfilesRow } from './HomeFeedProfilesRow'

type Props = {
  initial: HomeFeedPage
}

function mergeRows(current: HomeFeedRow[], incoming: HomeFeedRow[]) {
  const posts = new Set(
    current
      .filter((row): row is Extract<HomeFeedRow, { type: 'post' }> => row.type === 'post')
      .map((row) => `${row.post.kind}:${row.post.id}`),
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

export function HomeFeed({ initial }: Props) {
  const [rows, setRows] = useState<HomeFeedRow[]>(initial.rows)
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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
      { rootMargin: '240px 0px' },
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
              // VOLONTAIRE — pas de isDesktop/isSelected/onSelect : le panneau
              // d'aperçu desktop en iframe (HomeFeedPreviewPanel) est abandonné
              // (décision Killian, mission enveloppe accueil). HomeFeedCard
              // n'est pas modifié (hors scope) — ses props par défaut
              // (isDesktop=false) suffisent à retrouver le comportement de la
              // maquette : clic = navigation directe vers l'offre, identique
              // mobile/desktop, sans état de sélection.
              return <HomeFeedCard key={`${row.post.kind}-${row.post.id}`} post={row.post} />
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
      {/* .home-feed-layout__cluster : SIGNALÉ, pas supprimé — enveloppait
          jusqu'ici {feedColumn} + le slot du panneau d'aperçu iframe
          (abandonné, décision Killian). Ne wrappe plus qu'un seul enfant,
          devenue une coquille sans rôle de mise en page à 2 colonnes ; son
          CSS (packages/ui-react/src/home-feed.css) n'est pas retiré non
          plus, même remarque. Retrait formel = décision produit distincte,
          pas prise ici. */}
      <div className="home-feed-layout__cluster">{feedColumn}</div>
    </main>
  )
}
