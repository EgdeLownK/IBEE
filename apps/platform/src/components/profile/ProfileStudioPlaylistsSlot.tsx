import { loadProfileStudioPlaylists } from '@/lib/profile-studio-data'
import { measureDashboardLoad } from '@/lib/dashboard-perf'
import { ProfileStudioPlaylistsHydrator } from './ProfileStudioDataContext'

export async function ProfileStudioPlaylistsSlot() {
  const playlists = await measureDashboardLoad('page:site-playlists', () =>
    loadProfileStudioPlaylists(),
  )
  if (!playlists) return null
  return <ProfileStudioPlaylistsHydrator playlists={playlists} />
}
