'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccountContext } from '@/components/dashboard/AccountContext'
import {
  ArrowLeft,
  FileText,
  Folder,
  LayoutGrid,
  Upload,
  User,
} from 'lucide-react'
import {
  formatDriveGo,
  profileInitials,
  type DriveFileRow,
  type DriveFolder,
  type DrivePageData,
  type DriveProfile,
} from '@/lib/drive-data'

type Props = {
  data: DrivePageData
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

  if (!isPersonalMode && activeProfile) {
    return (
      <ProfileDriveView
        profile={activeProfile}
        folders={data.folders}
        files={data.recentFiles.filter((file) => file.profileName === activeProfile.name)}
        ownerLabel={activeProfile.name.split(' ')[0] ?? activeProfile.name}
      />
    )
  }

  if (isPersonalMode && profileDrillId && activeProfile) {
    return (
      <ProfileDriveView
        profile={activeProfile}
        folders={data.folders}
        files={data.recentFiles.filter((file) => file.profileName === activeProfile.name)}
        ownerLabel={activeProfile.name.split(' ')[0] ?? activeProfile.name}
        onBack={() => setProfileDrillId(null)}
      />
    )
  }

  return (
    <AccountDriveView data={data} onOpenProfileDrive={(profileId) => setProfileDrillId(profileId)} />
  )
}

function AccountDriveView({
  data,
  onOpenProfileDrive,
}: {
  data: DrivePageData
  onOpenProfileDrive: (profileId: string) => void
}) {
  return (
    <main className="drive-page">
      <div className="drive-toolbar">
        <div className="drive-toolbar__main">
          <h1 className="drive-toolbar__title">Drive</h1>
          <div className="drive-scope">
            <span className="drive-scope__chip drive-scope__chip--account">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              Compte
            </span>
            <span className="drive-scope__hint">Espace partagé entre tous vos profils web</span>
          </div>
        </div>
        <div className="drive-toolbar__actions">
          <button type="button" className="dash-action-btn">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Importer
          </button>
        </div>
      </div>

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
                width: `${Math.max(2, (profile.usedGb / data.quotaGb) * 100)}%`,
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
      </section>

      <p className="drive-section-label">Drives par profil</p>
      <div className="acct-drive-grid">
        {data.profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} onOpen={() => onOpenProfileDrive(profile.id)} />
        ))}
      </div>

      <p className="drive-section-label">Récents · tous profils</p>
      <FilesTable
        variant="account"
        files={data.recentFiles}
        columns={['Nom', 'Profil', 'Taille', 'Modifié']}
      />
    </main>
  )
}

function ProfileDriveView({
  profile,
  folders,
  files,
  ownerLabel,
  onBack,
}: {
  profile: DriveProfile
  folders: DriveFolder[]
  files: DriveFileRow[]
  ownerLabel: string
  onBack?: () => void
}) {
  return (
    <main className="drive-page">
      {onBack ? (
        <button type="button" className="drive-back" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au drive compte
        </button>
      ) : null}

      <div className="drive-toolbar">
        <div className="drive-toolbar__main">
          <h1 className="drive-toolbar__title">Drive</h1>
          <div className="drive-scope">
            <span className="drive-scope__chip">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Profil web
            </span>
            <span className="drive-scope__hint">
              Fichiers propres à ce profil · {profile.name}
            </span>
          </div>
        </div>
        <div className="drive-toolbar__actions">
          <button type="button" className="drive-btn-ghost">
            <Folder className="h-3.5 w-3.5" aria-hidden="true" />
            Nouveau dossier
          </button>
          <button type="button" className="dash-action-btn">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Importer
          </button>
        </div>
      </div>

      <div className="drive-folders">
        {folders.map((folder) => (
          <button key={folder.name} type="button" className="drive-folder">
            <Folder className="drive-folder__icon h-7 w-7" aria-hidden="true" />
            <div>
              <div className="drive-folder__name">{folder.name}</div>
              <div className="drive-folder__meta">{folder.count} fichiers</div>
            </div>
          </button>
        ))}
      </div>

      <FilesTable
        variant="profile"
        files={files}
        columns={['Nom', 'Taille', 'Modifié', 'Propriétaire']}
        ownerLabel={ownerLabel}
      />
    </main>
  )
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
}: {
  variant: 'account' | 'profile'
  files: DriveFileRow[]
  columns: string[]
  ownerLabel?: string
}) {
  return (
    <div className="drive-files">
      <div className={`drive-row drive-row__head${variant === 'account' ? ' drive-row--acct' : ''}`}>
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>
      {files.map((file) => (
        <div
          key={file.id}
          className={`drive-row${variant === 'account' ? ' drive-row--acct' : ''}`}
        >
          <div className="drive-row__name">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
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
        </div>
      ))}
    </div>
  )
}
