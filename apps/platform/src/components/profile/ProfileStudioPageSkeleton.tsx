import { StudioPlaylistsSkeleton } from '@/components/profile/StudioPlaylistsSkeleton'

export function ProfileStudioPageSkeleton() {
  return (
    <div className="profile-page" aria-busy="true" aria-label="Chargement du profil web">
      <div className="profile-shell">
        <div className="zone-skeleton-banner" aria-hidden="true" />

        <div className="profile-hero-skeleton" aria-hidden="true">
          <div className="zone-skeleton-circle" />
          <div className="profile-hero-skeleton__text">
            <div className="zone-skeleton-line zone-skeleton-line--lg" />
            <div className="zone-skeleton-line zone-skeleton-line--sm" />
            <div className="zone-skeleton-line zone-skeleton-line--btn" />
          </div>
        </div>

        <div className="profile-tabs-skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="zone-skeleton-line zone-skeleton-line--chip" />
          ))}
        </div>

        <StudioPlaylistsSkeleton />
      </div>
    </div>
  )
}
