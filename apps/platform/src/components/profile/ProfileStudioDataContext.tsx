'use client'

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ProfileStudioPlaylistsData, ProfileStudioShellData } from '@/lib/profile-studio-data'

type ProfileStudioDataContextValue = {
  shell: ProfileStudioShellData
  playlists: ProfileStudioPlaylistsData | null
  setPlaylists: (playlists: ProfileStudioPlaylistsData) => void
}

const ProfileStudioDataContext = createContext<ProfileStudioDataContextValue | null>(null)

export function ProfileStudioDataProvider({
  shell,
  children,
}: {
  shell: ProfileStudioShellData
  children: ReactNode
}) {
  const [playlists, setPlaylists] = useState<ProfileStudioPlaylistsData | null>(null)
  const value = useMemo(() => ({ shell, playlists, setPlaylists }), [shell, playlists])

  return (
    <ProfileStudioDataContext.Provider value={value}>{children}</ProfileStudioDataContext.Provider>
  )
}

export function useProfileStudioData() {
  const ctx = useContext(ProfileStudioDataContext)
  if (!ctx) {
    throw new Error('useProfileStudioData must be used within ProfileStudioDataProvider')
  }
  return ctx
}

export function ProfileStudioPlaylistsHydrator({
  playlists,
}: {
  playlists: ProfileStudioPlaylistsData
}) {
  const { setPlaylists } = useProfileStudioData()

  useLayoutEffect(() => {
    setPlaylists(playlists)
  }, [playlists, setPlaylists])

  return null
}
