type Props = {
  columnCount?: number
  showStats?: boolean
}

export function AnalyseContentSkeleton({ columnCount = 7, showStats = false }: Props) {
  return (
    <>
      <div className="anal-kpis" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="anal-kpi anal-skeleton-kpi">
            <div className="anal-skeleton-line anal-skeleton-line--sm" />
            <div className="anal-skeleton-line anal-skeleton-line--lg" />
            <div className="anal-skeleton-line anal-skeleton-line--md" />
          </div>
        ))}
      </div>

      <div className="anal-chart anal-skeleton-chart" aria-hidden="true">
        <div className="anal-chart__top">
          <div className="anal-skeleton-line anal-skeleton-line--sm" />
          <div className="anal-skeleton-line anal-skeleton-line--period" />
        </div>
        <div className="anal-chart__nav">
          <div className="anal-skeleton-line anal-skeleton-line--nav" />
          <div className="anal-skeleton-line anal-skeleton-line--range" />
          <div className="anal-skeleton-line anal-skeleton-line--nav" />
        </div>
        <div
          className="anal-chart__bars anal-skeleton-chart__bars"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {Array.from({ length: columnCount }, (_, i) => (
            <div key={i} className="anal-skeleton-bar">
              <div className="anal-skeleton-line anal-skeleton-line--xs" />
              <div
                className="anal-skeleton-bar__fill"
                style={{ height: `${38 + ((i * 17) % 45)}%` }}
              />
              <div className="anal-skeleton-line anal-skeleton-line--xs" />
            </div>
          ))}
        </div>
        {showStats ? (
          <div className="anal-chart__stats">
            {[0, 1, 2].map((i) => (
              <div key={i} className="anal-stat">
                <div className="anal-skeleton-line anal-skeleton-line--sm" />
                <div className="anal-skeleton-line anal-skeleton-line--md" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="anal-bottom" aria-hidden="true">
        <div className="anal-card anal-skeleton-card">
          <div className="anal-skeleton-line anal-skeleton-line--title" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="anal-skeleton-ranking-row">
              <div className="anal-skeleton-line anal-skeleton-line--rank" />
              <div className="anal-skeleton-line anal-skeleton-line--rank-main" />
              <div className="anal-skeleton-line anal-skeleton-line--rank-side" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function AnalysePageSkeleton() {
  return (
    <main className="analyse-page" aria-busy="true" aria-label="Chargement de l'analyse">
      <div className="anal-head" aria-hidden="true">
        <div className="anal-skeleton-line anal-skeleton-line--page-title" />
        <div className="anal-skeleton-line anal-skeleton-line--export" />
      </div>
      <div className="anal-scope" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="anal-skeleton-scope-tab" />
        ))}
      </div>
      <AnalyseContentSkeleton />
    </main>
  )
}
