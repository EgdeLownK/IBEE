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

function formatGo(gb: number): string {
  return `${gb.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Go`
}

export function formatDriveGo(gb: number): string {
  return formatGo(gb)
}

export function profileInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
