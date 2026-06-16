'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAccountContext } from '@/components/dashboard/AccountContext'
import { deleteEntityFileAction } from '@/lib/entity-file-actions'
import { getEntityFileSignedUrl } from '@/lib/entity-file-client'
import { createDriveFolderAction, deleteDriveFolderAction } from '@/lib/drive-folder-actions'
import {
  canPreviewInBrowser,
  driveUploadHint,
  type DrivePreviewKind,
} from '@/lib/drive-file-policy'
import { uploadDriveFile } from '@/lib/drive-upload-client'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  LayoutGrid,
  Loader2,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react'
import {
  formatDriveGo,
  profileInitials,
  type DriveFileRow,
  type DriveFolderRow,
  type DrivePageData,
  type DriveProfile,
  type DriveUploadTarget,
} from '@/lib/drive-data'

type Props = {
  data: DrivePageData
}

type PreviewState = {
  url: string
  name: string
  kind: DrivePreviewKind
  mimeType: string | null
}

function isDemoProfileId(id: string): boolean {
  return id.startsWith('demo-project-')
}

export function DriveDashboard({ data }: Props) {
  const { isPersonalMode, activeProjectId } = useAccountContext()
  const [profileDrillId, setProfileDrillId] = useState<string | null>(null)

  const activeProfile = useMemo(() => {
    if (isPersonalMode) {
      if (profileDrillId) {
        return data.profiles.find((profile) => profile.id === profileDrillId) ?? data.profiles[0]
      }
      return null
    }
    return data.profiles.find((profile) => profile.id === activeProjectId) ?? data.profiles[0]
  }, [isPersonalMode, profileDrillId, activeProjectId, data.profiles])

  useEffect(() => {
    if (!isPersonalMode) setProfileDrillId(null)
  }, [isPersonalMode, activeProjectId])

  const profileFiles = useMemo(() => {
    if (!activeProfile || isDemoProfileId(activeProfile.id) || activeProfile.id !== data.entityId) {
      return []
    }
    return data.files
  }, [activeProfile, data.entityId, data.files])

  if (!isPersonalMode && activeProfile) {
    return (
      <ProfileDriveView
        profile={activeProfile}
        files={profileFiles}
        folders={data.folders}
        ownerLabel={activeProfile.name.split(' ')[0] ?? activeProfile.name}
        entityId={data.entityId}
        canManage={!isDemoProfileId(activeProfile.id)}
        quotaFull={data.quotaFull}
      />
    )
  }

  if (isPersonalMode && profileDrillId && activeProfile) {
    return (
      <ProfileDriveView
        profile={activeProfile}
        files={profileFiles}
        folders={data.folders}
        ownerLabel={activeProfile.name.split(' ')[0] ?? activeProfile.name}
        entityId={data.entityId}
        canManage={!isDemoProfileId(activeProfile.id)}
        quotaFull={data.quotaFull}
        onBack={() => setProfileDrillId(null)}
      />
    )
  }

  return (
    <AccountDriveView
      data={data}
      onOpenProfileDrive={(profileId) => setProfileDrillId(profileId)}
    />
  )
}

function AccountDriveView({
  data,
  onOpenProfileDrive,
}: {
  data: DrivePageData
  onOpenProfileDrive: (profileId: string) => void
}) {
  const canUpload = data.uploadTargets.length > 0 && !data.quotaFull

  return (
    <main className="drive-page">
      <DriveToolbar
        scope="account"
        canUpload={canUpload}
        uploadTargets={data.uploadTargets}
        defaultEntityId={data.entityId}
        quotaFull={data.quotaFull}
      />

      <section className="acct-storage" aria-label="Stockage du compte">
        <div className="acct-storage__head">
          <div className="acct-storage__title">Stockage du compte</div>
          <div className="acct-storage__nums">
            <span className="acct-storage__used">{formatDriveGo(data.totalUsedGb)}</span>
            <span> / {formatDriveGo(data.quotaGb)}</span>
          </div>
        </div>
        <div className="acct-storage__bar">
          {data.profiles.map((profile) => (
            <div
              key={profile.id}
              className="acct-storage__seg"
              style={{
                width: `${Math.max(profile.usedGb > 0 ? 2 : 0, (profile.usedGb / data.quotaGb) * 100)}%`,
                background: profile.color,
              }}
              title={`${profile.name} — ${formatDriveGo(profile.usedGb)}`}
            />
          ))}
        </div>
        <div className="acct-storage__legend">
          {data.profiles.map((profile) => (
            <div key={profile.id} className="acct-storage__legend-row">
              <span className="acct-storage__dot" style={{ background: profile.color }} />
              <span>{profile.name}</span>
              <span>{formatDriveGo(profile.usedGb)}</span>
            </div>
          ))}
        </div>
        {data.quotaFull ? (
          <p className="drive-quota-warning">Quota atteint — supprime des fichiers pour libérer de l’espace.</p>
        ) : null}
      </section>

      <p className="drive-section-label">Drives par profil</p>
      <div className="acct-drive-grid">
        {data.profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} onOpen={() => onOpenProfileDrive(profile.id)} />
        ))}
      </div>

      <p className="drive-section-label">Tous les fichiers</p>
      <FilesTable variant="account" files={data.files} />
    </main>
  )
}

function ProfileDriveView({
  profile,
  files,
  folders,
  ownerLabel,
  entityId,
  canManage,
  quotaFull,
  onBack,
}: {
  profile: DriveProfile
  files: DriveFileRow[]
  folders: DriveFolderRow[]
  ownerLabel: string
  entityId: string
  canManage: boolean
  quotaFull: boolean
  onBack?: () => void
}) {
  const router = useRouter()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const canUpload = canManage && profile.id === entityId && !quotaFull

  const childFolders = useMemo(
    () => folders.filter((folder) => folder.parentId === currentFolderId),
    [folders, currentFolderId],
  )

  const visibleFiles = useMemo(
    () => files.filter((file) => file.folderId === currentFolderId),
    [files, currentFolderId],
  )

  const breadcrumb = useMemo(
    () => buildFolderBreadcrumb(folders, currentFolderId),
    [folders, currentFolderId],
  )

  return (
    <main className="drive-page">
      {onBack ? (
        <button type="button" className="drive-back" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au drive compte
        </button>
      ) : null}

      <DriveToolbar
        scope="profile"
        profileName={profile.name}
        canUpload={canUpload}
        entityId={entityId}
        folderId={currentFolderId}
        quotaFull={quotaFull}
      />

      {canManage ? (
        <FolderBreadcrumb
          breadcrumb={breadcrumb}
          onNavigate={setCurrentFolderId}
          onCreateFolder={async (name) => {
            const result = await createDriveFolderAction({
              entityId,
              name,
              parentId: currentFolderId,
            })
            if (!result.ok) {
              toast.error(result.error)
              return
            }
            toast.success('Dossier créé.')
            router.refresh()
          }}
        />
      ) : null}

      {canManage && childFolders.length > 0 ? (
        <>
          <p className="drive-section-label">Dossiers</p>
          <FolderGrid
            folders={childFolders}
            onOpen={(folderId) => setCurrentFolderId(folderId)}
            onDelete={async (folderId) => {
              if (!window.confirm('Supprimer ce dossier vide ?')) return
              const result = await deleteDriveFolderAction(folderId)
              if (!result.ok) {
                toast.error(result.error)
                return
              }
              toast.success('Dossier supprimé.')
              router.refresh()
            }}
          />
        </>
      ) : null}

      <p className="drive-section-label">{currentFolderId ? 'Fichiers du dossier' : 'Fichiers'}</p>
      <FilesTable
        variant="profile"
        files={visibleFiles}
        ownerLabel={ownerLabel}
        emptyMessage={
          canUpload
            ? 'Aucun fichier ici. Importe un document ou crée un sous-dossier.'
            : 'Ce profil démo n’a pas encore de stockage propre.'
        }
      />
    </main>
  )
}

function DriveToolbar({
  scope,
  profileName,
  canUpload,
  entityId,
  folderId = null,
  uploadTargets,
  defaultEntityId,
  quotaFull = false,
}: {
  scope: 'account' | 'profile'
  profileName?: string
  canUpload: boolean
  entityId?: string
  folderId?: string | null
  uploadTargets?: DriveUploadTarget[]
  defaultEntityId?: string
  quotaFull?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPhase, setUploadPhase] = useState('')
  const [selectedEntityId, setSelectedEntityId] = useState(
    defaultEntityId ?? uploadTargets?.[0]?.entityId ?? '',
  )

  const targetEntityId = scope === 'account' ? selectedEntityId : entityId

  async function handleUpload(file: File) {
    if (!targetEntityId) {
      toast.error('Sélectionne un profil de destination.')
      return
    }

    setUploading(true)
    setUploadPhase('Préparation…')
    try {
      const result = await uploadDriveFile(file, setUploadPhase, {
        entityId: targetEntityId,
        folderId: scope === 'profile' ? folderId : null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const savedPct =
        result.compressed && result.originalSize > result.finalSize
          ? Math.round((1 - result.finalSize / result.originalSize) * 100)
          : 0
      toast.success(
        savedPct > 0
          ? `Fichier importé (−${savedPct} % après compression).`
          : 'Fichier importé.',
      )
      router.refresh()
    } finally {
      setUploading(false)
      setUploadPhase('')
    }
  }

  return (
    <div className="drive-toolbar">
      <div className="drive-toolbar__main">
        <h1 className="drive-toolbar__title">Drive</h1>
        <div className="drive-scope">
          {scope === 'account' ? (
            <>
              <span className="drive-scope__chip drive-scope__chip--account">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Compte
              </span>
              <span className="drive-scope__hint">Espace partagé entre tous vos profils web</span>
            </>
          ) : (
            <>
              <span className="drive-scope__chip">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Profil web
              </span>
              <span className="drive-scope__hint">
                Fichiers propres à ce profil · {profileName}
              </span>
            </>
          )}
        </div>
        {canUpload ? <p className="drive-upload-hint">{driveUploadHint()}</p> : null}
        {quotaFull ? (
          <p className="drive-quota-warning">Quota compte atteint — import désactivé.</p>
        ) : null}
      </div>
      {canUpload ? (
        <div className="drive-toolbar__actions">
          {scope === 'account' && uploadTargets && uploadTargets.length > 1 ? (
            <label className="drive-upload-target">
              <span className="sr-only">Profil de destination</span>
              <select
                className="drive-upload-target__select"
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                disabled={uploading}
              >
                {uploadTargets.map((target) => (
                  <option key={target.entityId} value={target.entityId}>
                    {target.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="dash-action-btn"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {uploading ? uploadPhase || 'Import…' : 'Importer'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function FolderBreadcrumb({
  breadcrumb,
  onNavigate,
  onCreateFolder,
}: {
  breadcrumb: DriveFolderRow[]
  onNavigate: (folderId: string | null) => void
  onCreateFolder: (name: string) => Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [pending, startTransition] = useTransition()

  function submitCreate() {
    const name = folderName.trim()
    if (!name) return
    startTransition(() => {
      void onCreateFolder(name).finally(() => {
        setFolderName('')
        setCreating(false)
      })
    })
  }

  return (
    <div className="drive-breadcrumb-bar">
      <nav className="drive-breadcrumb" aria-label="Emplacement">
        <button type="button" className="drive-breadcrumb__item" onClick={() => onNavigate(null)}>
          Racine
        </button>
        {breadcrumb.map((folder) => (
          <span key={folder.id} className="drive-breadcrumb__segment">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <button
              type="button"
              className="drive-breadcrumb__item"
              onClick={() => onNavigate(folder.id)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>
      {creating ? (
        <div className="drive-folder-create">
          <input
            className="drive-folder-create__input"
            value={folderName}
            placeholder="Nom du dossier"
            maxLength={120}
            autoFocus
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
          />
          <button
            type="button"
            className="drive-btn-ghost"
            disabled={pending}
            onClick={submitCreate}
          >
            Créer
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="drive-btn-ghost"
          onClick={() => setCreating(true)}
        >
          <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Nouveau dossier
        </button>
      )}
    </div>
  )
}

function FolderGrid({
  folders,
  onOpen,
  onDelete,
}: {
  folders: DriveFolderRow[]
  onOpen: (folderId: string) => void
  onDelete: (folderId: string) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="drive-folders">
      {folders.map((folder) => (
        <div key={folder.id} className="drive-folder-wrap">
          <button type="button" className="drive-folder" onClick={() => onOpen(folder.id)}>
            <Folder className="h-5 w-5 drive-folder__icon" aria-hidden="true" />
            <div className="min-w-0">
              <div className="drive-folder__name truncate">{folder.name}</div>
              <div className="drive-folder__meta">
                {folder.fileCount} fichier{folder.fileCount > 1 ? 's' : ''}
              </div>
            </div>
          </button>
          {folder.fileCount === 0 && folder.subfolderCount === 0 ? (
            <button
              type="button"
              className="drive-folder__delete"
              aria-label={`Supprimer ${folder.name}`}
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void onDelete(folder.id)
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function buildFolderBreadcrumb(
  folders: DriveFolderRow[],
  folderId: string | null,
): DriveFolderRow[] {
  if (!folderId) return []
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const trail: DriveFolderRow[] = []
  let current = byId.get(folderId) ?? null

  while (current) {
    trail.unshift(current)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }

  return trail
}

function ProfileCard({
  profile,
  onOpen,
}: {
  profile: DriveProfile
  onOpen: () => void
}) {
  return (
    <article className="acct-drive-card">
      <div className="acct-drive-card__head">
        <div className="acct-drive-card__avatar" style={{ background: profile.color }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            profileInitials(profile.name)
          )}
        </div>
        <div className="min-w-0">
          <div className="acct-drive-card__name">{profile.name}</div>
          {profile.role ? <div className="acct-drive-card__role">{profile.role}</div> : null}
        </div>
      </div>
      <div className="acct-drive-card__stats">
        <div>
          <div className="acct-drive-card__stat-v">{formatDriveGo(profile.usedGb)}</div>
          <div className="acct-drive-card__stat-k">utilisés</div>
        </div>
        <div>
          <div className="acct-drive-card__stat-v">{profile.fileCount}</div>
          <div className="acct-drive-card__stat-k">fichiers</div>
        </div>
      </div>
      <button type="button" className="drive-btn-ghost acct-drive-card__open" onClick={onOpen}>
        <Folder className="h-3.5 w-3.5" aria-hidden="true" />
        Ouvrir le drive
      </button>
    </article>
  )
}

function FilesTable({
  variant,
  files,
  columns,
  ownerLabel = 'Vous',
  emptyMessage = 'Aucun fichier.',
}: {
  variant: 'account' | 'profile'
  files: DriveFileRow[]
  columns?: string[]
  ownerLabel?: string
  emptyMessage?: string
}) {
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const headerColumns =
    columns ??
    (variant === 'account'
      ? ['Nom', 'Profil', 'Taille', 'Modifié', '']
      : ['Nom', 'Taille', 'Modifié', 'Propriétaire', ''])

  async function openFile(file: DriveFileRow, mode: 'preview' | 'download') {
    const result = await getEntityFileSignedUrl(file.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    if (mode === 'download' || !canPreviewInBrowser(file.previewKind)) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
      return
    }

    setPreview({
      url: result.url,
      name: result.name,
      kind: file.previewKind,
      mimeType: result.mime_type,
    })
  }

  function handleDelete(file: DriveFileRow) {
    if (file.linkedToProduct) {
      toast.error('Fichier lié à un produit digital — retire-le du produit avant suppression.')
      return
    }
    if (!window.confirm(`Supprimer « ${file.name} » ?`)) return

    startTransition(() => {
      void deleteEntityFileAction(file.id).then((result) => {
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success('Fichier supprimé.')
        router.refresh()
      })
    })
  }

  if (files.length === 0) {
    return <p className="drive-empty">{emptyMessage}</p>
  }

  return (
    <>
      <div className="drive-files">
        <div className={`drive-row drive-row__head${variant === 'account' ? ' drive-row--acct' : ''}`}>
          {headerColumns.map((column) => (
            <div key={column}>{column}</div>
          ))}
        </div>
        {files.map((file) => (
          <div
            key={file.id}
            className={`drive-row${variant === 'account' ? ' drive-row--acct' : ''}`}
          >
            <div className="drive-row__name">
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <button
                type="button"
                className="drive-file-link truncate"
                onClick={() => void openFile(file, 'preview')}
              >
                {file.name}
              </button>
              {file.linkedToProduct ? (
                <span className="drive-file-badge">Produit</span>
              ) : null}
            </div>
            {variant === 'account' ? (
              <div>
                <span className="acct-profile-tag">
                  <span
                    className="acct-profile-tag__dot"
                    style={{ background: file.profileColor }}
                  />
                  {file.profileName}
                </span>
              </div>
            ) : null}
            <div className="drive-row__meta">{file.sizeLabel}</div>
            <div className="drive-row__meta">{file.modifiedLabel}</div>
            {variant === 'profile' ? <div className="drive-row__meta">{ownerLabel}</div> : null}
            <div className="drive-row__actions">
              {canPreviewInBrowser(file.previewKind) ? (
                <button
                  type="button"
                  className="drive-row__action-btn"
                  aria-label={`Prévisualiser ${file.name}`}
                  disabled={pending}
                  onClick={() => void openFile(file, 'preview')}
                >
                  <Eye className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                className="drive-row__action-btn"
                aria-label={`Télécharger ${file.name}`}
                disabled={pending}
                onClick={() => void openFile(file, 'download')}
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="drive-row__action-btn drive-row__action-btn--danger"
                aria-label={`Supprimer ${file.name}`}
                disabled={pending || file.linkedToProduct}
                onClick={() => handleDelete(file)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview ? (
        <DriveFilePreview preview={preview} onClose={() => setPreview(null)} />
      ) : null}
    </>
  )
}

function DriveFilePreview({
  preview,
  onClose,
}: {
  preview: PreviewState
  onClose: () => void
}) {
  return (
    <div className="drive-preview" role="dialog" aria-modal="true" aria-label={preview.name}>
      <div className="drive-preview__backdrop" onClick={onClose} />
      <div className="drive-preview__panel">
        <div className="drive-preview__head">
          <span className="drive-preview__title truncate">{preview.name}</span>
          <button type="button" className="drive-row__action-btn" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="drive-preview__body">
          {preview.kind === 'image' ? (
            <img src={preview.url} alt={preview.name} className="drive-preview__image" />
          ) : null}
          {preview.kind === 'video' ? (
            <video src={preview.url} controls className="drive-preview__video" />
          ) : null}
          {preview.kind === 'audio' ? (
            <audio src={preview.url} controls className="drive-preview__audio" />
          ) : null}
          {preview.kind === 'pdf' ? (
            <iframe src={preview.url} title={preview.name} className="drive-preview__iframe" />
          ) : null}
          {preview.kind === 'text' ? (
            <iframe src={preview.url} title={preview.name} className="drive-preview__iframe" />
          ) : null}
        </div>
      </div>
    </div>
  )
}
