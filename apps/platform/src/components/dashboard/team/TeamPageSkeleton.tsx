export function TeamPageSkeleton() {
  return (
    <main className="team-page" aria-busy="true" aria-label="Chargement de l'équipe">
      <div className="team-head" aria-hidden="true">
        <div className="zone-skeleton-line zone-skeleton-line--title" />
        <div className="team-head__actions">
          <div className="zone-skeleton-line zone-skeleton-line--btn" />
          <div className="zone-skeleton-line zone-skeleton-line--btn" />
        </div>
      </div>

      <div
        className="zone-skeleton-line zone-skeleton-line--sm"
        style={{ marginBottom: 22, maxWidth: 320 }}
        aria-hidden="true"
      />

      <section className="team-card" aria-hidden="true">
        <div className="team-card__head">
          <div className="zone-skeleton-line zone-skeleton-line--sm" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="team-skeleton-row">
            <div className="zone-skeleton-avatar" />
            <div className="team-skeleton-row__main">
              <div className="zone-skeleton-line zone-skeleton-line--md" />
              <div className="zone-skeleton-line zone-skeleton-line--sm" />
            </div>
            <div className="zone-skeleton-line zone-skeleton-line--chip" />
            <div className="zone-skeleton-line zone-skeleton-line--xs" />
          </div>
        ))}
      </section>

      <section className="team-card" aria-hidden="true">
        <div className="team-card__head">
          <div className="zone-skeleton-line zone-skeleton-line--sm" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="team-skeleton-row">
            <div className="zone-skeleton-avatar" />
            <div className="team-skeleton-row__main">
              <div className="zone-skeleton-line zone-skeleton-line--md" />
              <div className="zone-skeleton-line zone-skeleton-line--sm" />
            </div>
            <div className="zone-skeleton-line zone-skeleton-line--chip" />
            <div className="zone-skeleton-line zone-skeleton-line--xs" />
          </div>
        ))}
      </section>
    </main>
  )
}
