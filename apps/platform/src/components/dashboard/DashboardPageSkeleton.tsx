export function DashboardPageSkeleton() {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Chargement">
      <div className="dash-skeleton__head" />
      <div className="dash-skeleton__row">
        <div className="dash-skeleton__chip" />
        <div className="dash-skeleton__chip" />
        <div className="dash-skeleton__chip" />
      </div>
      <div className="dash-skeleton__cards">
        <div className="dash-skeleton__card" />
        <div className="dash-skeleton__card" />
        <div className="dash-skeleton__card" />
      </div>
      <div className="dash-skeleton__panel" />
    </div>
  )
}
