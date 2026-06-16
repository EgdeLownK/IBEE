import 'server-only'

import {
  getDrivePreviewKind,
  DRIVE_QUOTA_BYTES,
  DRIVE_QUOTA_GB,
} from '@/lib/drive-file-policy'
import {
  listEntityFiles,
  listEntityFileIdsLinkedToProducts,
  listAllEntityFolders,
  sumEntityFilesBytes,
  sumUserDriveBytes,
} from '@ibee/supabase'
import { buildAccountShellData } from '@/lib/account-shell-data'
import { getDashboardContext, type DashboardContext } from '@/lib/dashboard-context'
import type { DriveFileRow, DriveFolderRow, DrivePageData, DriveProfile, DriveUploadTarget } from '@/lib/drive-data'

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

function isDemoProfileId(id: string): boolean {
  return id.startsWith('demo-project-')
}

export async function loadDrivePageData(): Promise<DrivePageData | null> {
  const ctx = await getDashboardContext()
  if (!ctx) return null
  return loadDrivePageDataFromContext(ctx)
}

export async function loadDrivePageDataFromContext(ctx: DashboardContext): Promise<DrivePageData> {
  const shell = buildAccountShellData(ctx.user, ctx.entity)
  const { supabase, entity, user } = ctx

  const [files, foldersResult, linkedIds, accountUsedBytes] = await Promise.all([
    listEntityFiles(supabase, entity.id),
    listAllEntityFolders(supabase, entity.id).catch((err) => {
      const code =
        typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : null
      if (code === 'PGRST205') {
        console.warn('[drive] entity_folders table missing — apply migration 20260616120000_entity_folders.sql')
        return []
      }
      throw err
    }),
    listEntityFileIdsLinkedToProducts(supabase, entity.id),
    sumUserDriveBytes(supabase, user.id),
  ])
  const folders = foldersResult

  const profileColor =
    shell.projectAccounts.find((p) => p.id === entity.id)?.color ?? 'var(--color-accent)'

  const profiles: DriveProfile[] = await Promise.all(
    shell.projectAccounts.map(async (project) => {
      const isDemo = isDemoProfileId(project.id)
      const isPrimary = project.id === entity.id
      let usedBytes = 0
      let fileCount = 0

      if (!isDemo && isPrimary) {
        usedBytes = await sumEntityFilesBytes(supabase, project.id)
        fileCount = files.length
      }

      return {
        id: project.id,
        name: project.name,
        role: project.role,
        avatarUrl: project.avatarUrl,
        usedGb: usedBytes / 1_000_000_000,
        fileCount,
        color: project.color,
      }
    }),
  )

  const folderRows: DriveFolderRow[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parent_id,
    fileCount: files.filter((file) => file.folder_id === folder.id).length,
    subfolderCount: folders.filter((child) => child.parent_id === folder.id).length,
  }))

  const driveFiles: DriveFileRow[] = files.map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mime_type,
    previewKind: getDrivePreviewKind(file.mime_type, file.name),
    profileName: entity.display_name,
    profileColor,
    profileId: entity.id,
    folderId: file.folder_id,
    sizeLabel: formatFileSize(file.size_bytes),
    modifiedLabel: formatRelativeDate(file.created_at),
    linkedToProduct: linkedIds.has(file.id),
  }))

  const uploadTargets: DriveUploadTarget[] = shell.projectAccounts
    .filter((project) => !isDemoProfileId(project.id))
    .map((project) => ({
      entityId: project.id,
      name: project.name,
      isDemo: false,
    }))

  const totalUsedGb = accountUsedBytes / 1_000_000_000

  return {
    entityId: entity.id,
    profiles,
    folders: folderRows,
    files: driveFiles,
    uploadTargets,
    quotaGb: DRIVE_QUOTA_GB,
    totalUsedGb,
    quotaFull: accountUsedBytes >= DRIVE_QUOTA_BYTES,
  }
}
