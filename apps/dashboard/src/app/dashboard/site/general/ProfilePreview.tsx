'use client'

import type { Database } from '@ibee/supabase'
import { ProfileCardReact, ProfileHeroReact } from '@ibee/ui-react'

type Entity = Database['public']['Tables']['entity']['Row']

type ProfilePreviewProps = {
  entity: Entity
  displayName: string
  role: string | null
  location: string | null
  bio: string | null
}

export function ProfilePreview({
  entity,
  displayName,
  role,
  location,
  bio,
}: ProfilePreviewProps) {
  return (
    <div className="p-6">
      <ProfileCardReact>
        <ProfileHeroReact
          displayName={displayName || 'Sans nom'}
          role={role}
          location={location}
          bio={bio}
          avatarUrl={entity.avatar_url}
          createdAt={entity.created_at}
        />
      </ProfileCardReact>
    </div>
  )
}
