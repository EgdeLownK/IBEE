import { ProfileShell } from '@ibee/ui-react/profile'
import type { PublicProfileData } from '@/lib/load-public-profile'
import { PublicProfileHero } from './PublicProfileHero'
import { PublicProfileTabsController } from './PublicProfileTabsController'

interface Props {
  data: PublicProfileData
  embedMode?: boolean
}

export function PublicProfilePage({ data, embedMode = false }: Props) {
  return (
    <main className="profile-page">
      <ProfileShell>
        <PublicProfileHero
          displayName={data.entity.display_name}
          role={data.entity.role}
          bio={data.entity.bio}
          avatarUrl={data.entity.avatar_url}
          bannerUrl={data.entity.banner_url}
          entityId={data.entity.id}
          entitySlug={data.entity.slug}
          followersCount={data.entity.followers_count}
          isAuthenticated={data.isAuthenticated}
          isFollowing={data.isFollowing}
        />

        <PublicProfileTabsController data={data} embedMode={embedMode} />
      </ProfileShell>
    </main>
  )
}
