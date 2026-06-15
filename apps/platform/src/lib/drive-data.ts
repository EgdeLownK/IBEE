import type { DrivePreviewKind } from '@/lib/drive-file-policy'

export type DriveProfile = {
  id: string
  name: string
  role: string | null
  avatarUrl: string | null
  usedGb: number
  fileCount: number
  color: string
}

export type DriveFolderRow = {
  id: string
  name: string
  parentId: string | null
  fileCount: number
  subfolderCount: number
}

export type DriveUploadTarget = {
  entityId: string
  name: string
  isDemo: boolean
}

export type DriveFileRow = {
  id: string
  name: string
  mimeType: string | null
  previewKind: DrivePreviewKind
  profileName: string
  profileColor: string
  profileId: string
  folderId: string | null
  sizeLabel: string
  modifiedLabel: string
  linkedToProduct: boolean
}

export type DrivePageData = {
  entityId: string
  profiles: DriveProfile[]
  folders: DriveFolderRow[]
  files: DriveFileRow[]
  uploadTargets: DriveUploadTarget[]
  quotaGb: number
  totalUsedGb: number
  quotaFull: boolean
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
