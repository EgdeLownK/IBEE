export function StudioPlaylistsSkeleton() {
  return (
    <div className="dash-skeleton studio-playlists-skeleton" aria-busy="true" aria-label="Chargement du contenu">
      <div className="dash-skeleton__row">
        <div className="dash-skeleton__chip" />
        <div className="dash-skeleton__chip" />
        <div className="dash-skeleton__chip" />
      </div>
      <div className="dash-skeleton__cards">
        <div className="dash-skeleton__card" />
        <div className="dash-skeleton__card" />
        <div className="dash-skeleton__card" />
        <div className="dash-skeleton__card" />
      </div>
      <div className="dash-skeleton__panel" />
    </div>
  )
}
