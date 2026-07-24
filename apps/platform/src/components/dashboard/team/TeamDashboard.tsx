'use client'

import { useMemo, useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Plus, Settings2, User, UserMinus } from 'lucide-react'
import {
  excludeTeamMemberAction,
  inviteTeamMemberAction,
  resendTeamInviteAction,
  saveTeamRolesAction,
  updateTeamMemberRoleAction,
} from '@/app/dashboard/equipe/team-actions'
import { useAccountContext } from '@/components/dashboard/AccountContext'
import {
  cloneRole,
  getRoleLabel,
  getRoleStyle,
  isRoleInUse,
  memberInitial,
  type TeamMember,
  type TeamPageData,
  type TeamRoleDefinition,
} from '@/lib/team-data'
import { TeamEditMemberRoleDialog, TeamInviteDialog, TeamRoleConfigDialog } from './TeamDialogs'

type Props = {
  data: TeamPageData
}

export function TeamDashboard({ data }: Props) {
  const { activeProject } = useAccountContext()
  const projectLabel = activeProject.name
  const [isPending, startTransition] = useTransition()

  const [roles, setRoles] = useState<TeamRoleDefinition[]>(
    data.roles.map((role) => cloneRole(role)),
  )
  const [members, setMembers] = useState<TeamMember[]>(data.members)
  const [pending, setPending] = useState(data.pending)
  const [actionError, setActionError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)

  const memberCountLabel = useMemo(() => `${members.length} membres`, [members.length])

  function canDeleteRole(roleId: string) {
    return !isRoleInUse(roleId, members, pending)
  }

  async function handleInvite(email: string, roleId: string): Promise<string | null> {
    setActionError(null)
    const result = await inviteTeamMemberAction(email, roleId)
    if (!result.ok) {
      setActionError(result.error)
      return result.error
    }
    setPending((prev) => [...prev, result.data])
    return null
  }

  function handleExclude(memberId: string) {
    setActionError(null)
    startTransition(() => {
      void excludeTeamMemberAction(memberId).then((result) => {
        if (!result.ok) {
          setActionError(result.error)
          return
        }
        setMembers((prev) => prev.filter((member) => member.id !== memberId))
      })
    })
  }

  function handleSaveMemberRole(memberId: string, roleId: string) {
    setActionError(null)
    startTransition(() => {
      void updateTeamMemberRoleAction(memberId, roleId).then((result) => {
        if (!result.ok) {
          setActionError(result.error)
          return
        }
        setMembers((prev) =>
          prev.map((member) => (member.id === memberId ? { ...member, roleId } : member)),
        )
      })
    })
  }

  function handleSaveRoles(nextRoles: TeamRoleDefinition[]) {
    setActionError(null)
    startTransition(() => {
      void saveTeamRolesAction(nextRoles).then((result) => {
        if (!result.ok) {
          setActionError(result.error)
          return
        }
        setRoles(result.data)
        setRolesOpen(false)
      })
    })
  }

  function handleResendInvite(inviteId: string) {
    setActionError(null)
    startTransition(() => {
      void resendTeamInviteAction(inviteId).then((result) => {
        if (!result.ok) setActionError(result.error)
      })
    })
  }

  function closePopover(popoverId: string) {
    document.getElementById(popoverId)?.hidePopover()
  }

  return (
    <main className="team-page">
      <div className="team-head">
        <h1 className="team-head__title">Équipe</h1>
        <div className="team-head__actions">
          <button
            type="button"
            className="team-btn-ghost team-btn-ghost--border"
            onClick={() => setRolesOpen(true)}
            disabled={isPending}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Rôles
          </button>
          <button
            type="button"
            className="team-btn-accent"
            onClick={() => setInviteOpen(true)}
            disabled={isPending}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Inviter un membre
          </button>
        </div>
      </div>

      <p className="team-head__intro">
        {memberCountLabel} · gérez les accès et les rôles de {projectLabel}.
      </p>

      {actionError ? <p className="team-modal__error">{actionError}</p> : null}

      <section className="team-card" aria-label="Membres">
        <div className="team-card__head">
          <div className="team-card__title">Membres</div>
        </div>
        {members.map((member) => {
          const roleStyle = getRoleStyle(roles, member.roleId)
          const isOwner = member.id === 'owner'
          const menuId = `team-member-menu-${member.id}`

          return (
            <div key={member.id} className="team-row">
              <div className="team-avatar-wrap">
                <div className="team-avatar">{memberInitial(member.name)}</div>
                {member.online ? <span className="team-avatar__online" aria-hidden="true" /> : null}
              </div>
              <div className="team-row__main">
                <div className="team-row__name">{member.name}</div>
                <div className="team-row__meta">
                  {member.email} · {member.since}
                </div>
              </div>
              <div
                className="team-role-chip team-row__role"
                style={{ background: roleStyle.bg, color: roleStyle.fg }}
              >
                {getRoleLabel(roles, member.roleId)}
              </div>
              {isOwner ? (
                <span className="team-row__action team-row__action--spacer" aria-hidden="true" />
              ) : (
                <div className="team-row__action">
                  <button
                    type="button"
                    popoverTarget={menuId}
                    style={{ anchorName: `--${menuId}` } as React.CSSProperties}
                    className="team-btn-icon"
                    aria-label={`Actions pour ${member.name}`}
                    disabled={isPending}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div
                    id={menuId}
                    popover="auto"
                    className="app-menu team-member-menu"
                    style={{ positionAnchor: `--${menuId}` } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      className="app-menu__item"
                      onClick={() => {
                        closePopover(menuId)
                        setEditMember(member)
                      }}
                    >
                      <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      className="app-menu__item app-menu__item--danger"
                      onClick={() => {
                        closePopover(menuId)
                        handleExclude(member.id)
                      }}
                    >
                      <UserMinus className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Exclure</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {pending.length > 0 ? (
        <section className="team-card" aria-label="Invitations en attente">
          <div className="team-card__head">
            <div className="team-card__title">Invitations en attente</div>
          </div>
          {pending.map((invite) => {
            const roleStyle = getRoleStyle(roles, invite.roleId)
            return (
              <div key={invite.id} className="team-row">
                <div className="team-avatar team-avatar--pending">
                  <User className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div className="team-row__main">
                  <div className="team-row__name">{invite.email}</div>
                  <div className="team-row__meta">En attente d&apos;acceptation</div>
                </div>
                <div
                  className="team-role-chip team-row__role"
                  style={{ background: roleStyle.bg, color: roleStyle.fg }}
                >
                  {getRoleLabel(roles, invite.roleId)}
                </div>
                <button
                  type="button"
                  className="team-btn-ghost team-row__action"
                  onClick={() => handleResendInvite(invite.id)}
                  disabled={isPending}
                >
                  Renvoyer
                </button>
              </div>
            )
          })}
        </section>
      ) : null}

      <TeamInviteDialog
        open={inviteOpen}
        roles={roles}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />

      <TeamRoleConfigDialog
        open={rolesOpen}
        roles={roles}
        onClose={() => setRolesOpen(false)}
        onSave={handleSaveRoles}
        canDeleteRole={canDeleteRole}
      />

      <TeamEditMemberRoleDialog
        open={editMember !== null}
        memberName={editMember?.name ?? ''}
        roleId={editMember?.roleId ?? ''}
        roles={roles}
        onClose={() => setEditMember(null)}
        onSave={(roleId) => {
          if (editMember) handleSaveMemberRole(editMember.id, roleId)
        }}
      />
    </main>
  )
}
