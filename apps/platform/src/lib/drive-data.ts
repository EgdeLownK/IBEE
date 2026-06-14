import type { SupabaseClient } from '@supabase/supabase-js'
import { getEntityByUserId, listEntityFiles } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'
import { loadAccountShellData, type ProjectAccount } from '@/lib/account-shell-data'

export type DriveProfile = {
  id: string
  name: string
  role: string | null
  avatarUrl: string | null
  usedGb: number
  fileCount: number
  color: string
}

export type DriveFileRow = {
  id: string
  name: string
  profileName: string
  profileColor: string
  sizeLabel: string
  modifiedLabel: string
}

export type DriveFolder = {
  name: string
  count: number
}

export type DrivePageData = {
  profiles: DriveProfile[]
  recentFiles: DriveFileRow[]
  folders: DriveFolder[]
  quotaGb: number
  totalUsedGb: number
}

const ACCOUNT_QUOTA_GB = 50

const MOCK_FOLDERS: DriveFolder[] = [
  { name: 'Photos clients', count: 142 },
  { name: 'Factures 2025', count: 38 },
  { name: 'Contrats', count: 12 },
  { name: 'Branding', count: 24 },
]


function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays <= 0) return "aujourd'hui"
  if (diffDays === 1) return 'il y a 1 j'
  if (diffDays < 7) return `il y a ${diffDays} j`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatGo(gb: number): string {
  return `${gb.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Go`
}

function profileInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function formatDriveGo(gb: number): string {
  return formatGo(gb)
}

export { profileInitials }

export async function loadDrivePageData(
  supabase: SupabaseClient<Database>
): Promise<DrivePageData | null> {
  const shell = await loadAccountShellData(supabase)
  if (!shell) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return null

  const files = await listEntityFiles(supabase, entity.id)
  const usedBytes = files.reduce((sum, file) => sum + file.size_bytes, 0)
  const usedGbReal = usedBytes / 1_000_000_000

  const profiles: DriveProfile[] = shell.projectAccounts.map((project, index) => {
    const isPrimary = project.id === entity.id
    const mockUsed = [8.4, 5.1, 3.2][index] ?? 2.4
    const mockFiles = [216, 132, 74][index] ?? 48
    return {
      id: project.id,
      name: project.name,
      role: project.role,
      avatarUrl: project.avatarUrl,
      usedGb: isPrimary && usedGbReal > 0 ? usedGbReal : mockUsed,
      fileCount: isPrimary ? files.length || mockFiles : mockFiles,
      color: project.color,
    }
  })

  const primaryProfile = profiles.find((p) => p.id === entity.id) ?? profiles[0]
  const profileColor = primaryProfile.color

  const realRecent: DriveFileRow[] = files.slice(0, 8).map((file) => ({
    id: file.id,
    name: file.name,
    profileName: entity.display_name,
    profileColor,
    sizeLabel: formatFileSize(file.size_bytes),
    modifiedLabel: formatRelativeDate(file.created_at),
  }))

  const crossProfileRecent = buildCrossProfileRecent(shell.projectAccounts, entity.display_name, realRecent)

  const folders = MOCK_FOLDERS.map((folder) => ({
    ...folder,
    count: files.length > 0 ? Math.max(1, Math.round(folder.count * 0.15)) : folder.count,
  }))

  const totalUsedGb = profiles.reduce((sum, profile) => sum + profile.usedGb, 0)

  return {
    profiles,
    recentFiles: crossProfileRecent,
    folders,
    quotaGb: ACCOUNT_QUOTA_GB,
    totalUsedGb,
  }
}

function buildCrossProfileRecent(
  projects: ProjectAccount[],
  primaryName: string,
  realRecent: DriveFileRow[]
): DriveFileRow[] {
  if (realRecent.length > 0) return realRecent

  const samples = [
    { name: 'Contrat bail studio.pdf', profileIndex: 0, sizeLabel: '2,4 Mo', modifiedLabel: 'il y a 1 j' },
    { name: 'Packaging cire mate.ai', profileIndex: 1, sizeLabel: '18 Mo', modifiedLabel: 'il y a 2 j' },
    { name: 'Support formation J1.pptx', profileIndex: 2, sizeLabel: '9,7 Mo', modifiedLabel: 'il y a 3 j' },
    { name: 'Photos campagne automne.zip', profileIndex: 1, sizeLabel: '240 Mo', modifiedLabel: 'il y a 5 j' },
    { name: 'Planning équipe.xlsx', profileIndex: 0, sizeLabel: '82 Ko', modifiedLabel: '21 oct.' },
  ]

  return samples.map((sample, index) => {
    const project = projects[sample.profileIndex] ?? projects[0]
    return {
      id: `mock-recent-${index}`,
      name: sample.name,
      profileName: project?.name ?? primaryName,
      profileColor: project?.color ?? 'var(--color-accent)',
      sizeLabel: sample.sizeLabel,
      modifiedLabel: sample.modifiedLabel,
    }
  })
}
