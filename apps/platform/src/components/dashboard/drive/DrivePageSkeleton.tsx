export function DrivePageSkeleton() {
  return (
    <main className="drive-page" aria-busy="true" aria-label="Chargement du drive">
      <div className="drive-toolbar" aria-hidden="true">
        <div className="drive-toolbar__main">
          <div className="zone-skeleton-line zone-skeleton-line--title" />
          <div className="drive-scope">
            <div className="zone-skeleton-line zone-skeleton-line--chip" />
            <div className="zone-skeleton-line zone-skeleton-line--sm" />
          </div>
        </div>
        <div className="drive-toolbar__actions">
          <div className="zone-skeleton-line zone-skeleton-line--btn" />
          <div className="zone-skeleton-line zone-skeleton-line--btn" />
        </div>
      </div>

      <div className="acct-storage zone-skeleton-block" aria-hidden="true">
        <div className="acct-storage__head">
          <div className="zone-skeleton-line zone-skeleton-line--sm" />
          <div className="zone-skeleton-line zone-skeleton-line--xs" />
        </div>
        <div className="zone-skeleton-line zone-skeleton-block" style={{ height: 12, width: '100%', marginTop: 12 }} />
      </div>

      <p className="drive-section-label zone-skeleton-line zone-skeleton-line--xs" aria-hidden="true" />
      <div className="acct-drive-grid" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="acct-drive-card zone-skeleton-block" style={{ minHeight: 168, padding: 20 }} />
        ))}
      </div>

      <p className="drive-section-label zone-skeleton-line zone-skeleton-line--xs" aria-hidden="true" />
      <div className="drive-files zone-skeleton-block" aria-hidden="true" style={{ padding: '12px 16px' }}>
        {[0, 1, 2, 4].map((i) => (
          <div key={i} className="drive-skeleton-row">
            <div className="zone-skeleton-line zone-skeleton-line--md" />
            <div className="zone-skeleton-line zone-skeleton-line--xs" />
            <div className="zone-skeleton-line zone-skeleton-line--xs" />
          </div>
        ))}
      </div>
    </main>
  )
}
