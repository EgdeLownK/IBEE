'use client'

import { useEffect, useId, useState } from 'react'
import { ArrowLeft, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import {
  cloneRole,
  countEnabledPermissions,
  createRoleDraft,
  createRoleId,
  formatPermissionSummary,
  hasEnabledPermission,
  type TeamRoleDefinition,
} from '@/lib/team-data'
import { TeamPermissionEditor } from './TeamPermissionEditor'

type Props = {
  open: boolean
  roles: TeamRoleDefinition[]
  onClose: () => void
  onSave: (roles: TeamRoleDefinition[]) => void
  canDeleteRole: (roleId: string) => boolean
}

type EditorMode = 'list' | 'edit'

export function TeamRoleConfigDialog({ open, roles, onClose, onSave, canDeleteRole }: Props) {
  const formId = useId()
  const [draft, setDraft] = useState<TeamRoleDefinition[]>(roles)
  const [mode, setMode] = useState<EditorMode>('list')
  const [editingRole, setEditingRole] = useState<TeamRoleDefinition | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(roles.map((role) => cloneRole(role)))
      setMode('list')
      setEditingRole(null)
      setError('')
    }
  }, [open, roles])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (mode === 'edit') {
          setMode('list')
          setEditingRole(null)
          setError('')
        } else {
          onClose()
        }
      }
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, mode])

  if (!open) return null

  function openCreateRole() {
    setEditingRole(createRoleDraft(draft))
    setMode('edit')
    setError('')
  }

  function openEditRole(role: TeamRoleDefinition) {
    setEditingRole(cloneRole(role))
    setMode('edit')
    setError('')
  }

  function handleDelete(roleId: string) {
    if (!canDeleteRole(roleId)) {
      setError('Ce rôle est utilisé par un membre ou une invitation.')
      return
    }
    setDraft((prev) => prev.filter((role) => role.id !== roleId))
    setError('')
  }

  function handleSaveRole() {
    if (!editingRole) return

    const label = editingRole.label.trim()
    if (label.length < 2) {
      setError('Le nom du rôle doit contenir au moins 2 caractères.')
      return
    }

    const nameTaken = draft.some((role) => {
      if (editingRole.id && role.id === editingRole.id) return false
      return role.label.toLowerCase() === label.toLowerCase()
    })
    if (nameTaken) {
      setError('Ce nom de rôle existe déjà.')
      return
    }

    if (!editingRole.locked && !hasEnabledPermission(editingRole.permissions)) {
      setError('Sélectionnez au moins une autorisation pour ce rôle.')
      return
    }

    const savedRole: TeamRoleDefinition = {
      ...editingRole,
      label,
      id: editingRole.id || createRoleId(label, draft),
      permissions: { ...editingRole.permissions },
    }

    setDraft((prev) => {
      const exists = prev.some((role) => role.id === savedRole.id)
      if (exists) {
        return prev.map((role) => (role.id === savedRole.id ? savedRole : role))
      }
      return [...prev, savedRole]
    })

    setMode('list')
    setEditingRole(null)
    setError('')
  }

  function handleSubmitList(e: React.FormEvent) {
    e.preventDefault()
    onSave(draft.map((role) => cloneRole(role)))
  }

  const isEditing = mode === 'edit' && editingRole !== null
  const isReadOnlyRole = editingRole?.locked === true

  return (
    <div
      className="team-modal-backdrop"
      onClick={() => {
        if (mode === 'list') onClose()
      }}
    >
      <div
        className={`team-modal${isEditing ? ' team-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="team-modal__head">
          {isEditing ? (
            <button
              type="button"
              className="team-btn-icon"
              onClick={() => {
                setMode('list')
                setEditingRole(null)
                setError('')
              }}
              aria-label="Retour à la liste"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <h2 id={`${formId}-title`} className="team-modal__title">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
            {isEditing
              ? editingRole?.id
                ? isReadOnlyRole
                  ? `Rôle ${editingRole.label}`
                  : `Modifier ${editingRole.label}`
                : 'Nouveau rôle'
              : 'Configurer les rôles'}
          </h2>
          <button type="button" className="team-btn-icon" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isEditing && editingRole ? (
          <>
            <div className="team-modal__body">
              <p className="team-modal__hint">
                {isReadOnlyRole
                  ? 'Le rôle Propriétaire dispose de tous les accès et ne peut pas être modifié.'
                  : 'Définissez le nom du rôle et les autorisations associées.'}
              </p>

              <label className="team-field">
                <span className="team-field__label">Nom du rôle</span>
                <input
                  type="text"
                  className="team-field__input"
                  value={editingRole.label}
                  onChange={(e) => {
                    setEditingRole({ ...editingRole, label: e.target.value })
                    setError('')
                  }}
                  disabled={isReadOnlyRole}
                  placeholder="Ex. Stagiaire"
                />
              </label>

              <div className="team-perm-editor-wrap">
                <div className="team-perm-editor-wrap__head">
                  <span className="team-field__label">Autorisations</span>
                  <span className="team-perm-editor-wrap__count">
                    {countEnabledPermissions(editingRole.permissions)} activée
                    {countEnabledPermissions(editingRole.permissions) > 1 ? 's' : ''}
                  </span>
                </div>
                <TeamPermissionEditor
                  permissions={editingRole.permissions}
                  onChange={(permissions) => {
                    setEditingRole({ ...editingRole, permissions })
                    setError('')
                  }}
                  readOnly={isReadOnlyRole}
                />
              </div>
            </div>

            <div className="team-modal__footer">
              {error ? <p className="team-modal__error">{error}</p> : null}
              <div className="team-modal__actions">
                <button
                  type="button"
                  className="team-btn-ghost"
                  onClick={() => {
                    setMode('list')
                    setEditingRole(null)
                    setError('')
                  }}
                >
                  {isReadOnlyRole ? 'Retour' : 'Annuler'}
                </button>
                {!isReadOnlyRole ? (
                  <button type="button" className="team-btn-accent" onClick={handleSaveRole}>
                    Enregistrer le rôle
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <form className="team-modal__body" onSubmit={handleSubmitList}>
            <p className="team-modal__hint">
              Créez des rôles personnalisés et choisissez précisément ce que chaque membre peut
              faire.
            </p>

            <div className="team-role-config-list team-role-config-list--rich">
              {draft.map((role) => (
                <div key={role.id} className="team-role-config-card">
                  <div className="team-role-config-card__main">
                    <span
                      className="team-role-chip"
                      style={{ background: role.bg, color: role.fg }}
                    >
                      {role.label}
                    </span>
                    <div className="team-role-config-card__meta">
                      <span>
                        {countEnabledPermissions(role.permissions)} autorisation
                        {countEnabledPermissions(role.permissions) > 1 ? 's' : ''}
                      </span>
                      <span className="team-role-config-card__summary">
                        {formatPermissionSummary(role.permissions)}
                      </span>
                    </div>
                  </div>
                  <div className="team-role-config-card__actions">
                    <button
                      type="button"
                      className="team-btn-ghost"
                      onClick={() => openEditRole(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      {role.locked ? 'Voir' : 'Modifier'}
                    </button>
                    {role.locked ? null : (
                      <button
                        type="button"
                        className="team-btn-icon team-role-config-row__delete"
                        onClick={() => handleDelete(role.id)}
                        aria-label={`Supprimer le rôle ${role.label}`}
                        disabled={!canDeleteRole(role.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="team-role-config-add-btn" onClick={openCreateRole}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un rôle
            </button>

            {error ? <p className="team-modal__error">{error}</p> : null}

            <div className="team-modal__actions">
              <button type="button" className="team-btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="team-btn-accent">
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

type InviteProps = {
  open: boolean
  roles: TeamRoleDefinition[]
  onClose: () => void
  onInvite: (email: string, roleId: string) => Promise<string | null> | string | null
}

export function TeamInviteDialog({ open, roles, onClose, onInvite }: InviteProps) {
  const formId = useId()
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      const inviteableRoles = roles.filter((role) => role.inviteable !== false)
      setEmail('')
      setRoleId(inviteableRoles[inviteableRoles.length - 1]?.id ?? '')
      setError('')
    }
  }, [open, roles])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const inviteableRoles = roles.filter((role) => role.inviteable !== false)
  const selectedRole = inviteableRoles.find((role) => role.id === roleId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Adresse e-mail invalide.')
      return
    }
    if (!roleId) {
      setError('Sélectionnez un rôle.')
      return
    }
    void Promise.resolve(onInvite(trimmed, roleId)).then((inviteError) => {
      if (inviteError) {
        setError(inviteError)
        return
      }
      onClose()
    })
  }

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div
        className="team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="team-modal__head">
          <h2 id={`${formId}-title`} className="team-modal__title">
            Inviter un membre
          </h2>
          <button type="button" className="team-btn-icon" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="team-modal__body" onSubmit={handleSubmit}>
          <label className="team-field">
            <span className="team-field__label">Adresse e-mail</span>
            <input
              type="email"
              className="team-field__input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="nom@exemple.fr"
              autoFocus
            />
          </label>

          <label className="team-field">
            <span className="team-field__label">Rôle</span>
            <select
              className="team-field__select"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {inviteableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {selectedRole ? (
            <div className="team-role-preview">
              <span className="team-field__label">Accès inclus</span>
              <p className="team-role-preview__text">
                {formatPermissionSummary(selectedRole.permissions, 6)}
              </p>
            </div>
          ) : null}

          {error ? <p className="team-modal__error">{error}</p> : null}

          <div className="team-modal__actions">
            <button type="button" className="team-btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="team-btn-accent">
              Envoyer l&apos;invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type EditProps = {
  open: boolean
  memberName: string
  roleId: string
  roles: TeamRoleDefinition[]
  onClose: () => void
  onSave: (roleId: string) => void
}

export function TeamEditMemberRoleDialog({
  open,
  memberName,
  roleId,
  roles,
  onClose,
  onSave,
}: EditProps) {
  const formId = useId()
  const assignableRoles = roles.filter((role) => !role.locked)
  const [draftRoleId, setDraftRoleId] = useState(roleId)

  useEffect(() => {
    if (open) setDraftRoleId(roleId)
  }, [open, roleId])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const selectedRole = assignableRoles.find((role) => role.id === draftRoleId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(draftRoleId)
    onClose()
  }

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div
        className="team-modal team-modal--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="team-modal__head">
          <h2 id={`${formId}-title`} className="team-modal__title">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modifier le rôle
          </h2>
          <button type="button" className="team-btn-icon" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="team-modal__body" onSubmit={handleSubmit}>
          <p className="team-modal__hint">
            Choisir un nouveau rôle pour <strong>{memberName}</strong>.
          </p>

          <label className="team-field">
            <span className="team-field__label">Rôle</span>
            <select
              className="team-field__select"
              value={draftRoleId}
              onChange={(e) => setDraftRoleId(e.target.value)}
            >
              {assignableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {selectedRole ? (
            <div className="team-role-preview">
              <span className="team-field__label">Accès du rôle</span>
              <p className="team-role-preview__text">
                {formatPermissionSummary(selectedRole.permissions, 6)}
              </p>
            </div>
          ) : null}

          <div className="team-modal__actions">
            <button type="button" className="team-btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="team-btn-accent">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
