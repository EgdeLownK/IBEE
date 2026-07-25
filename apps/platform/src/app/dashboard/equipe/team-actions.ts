'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  cloneRole,
  isValidEmail,
  mapRoleDefinitionToSaveInput,
  mapRoleRecordToDefinition,
  type TeamRoleDefinition,
} from '@/lib/team-data'
import {
  createTeamInvitation,
  getEntityByUserId,
  removeTeamMember,
  saveTeamRoles,
  teamEmailAlreadyUsed,
  touchTeamInvitation,
  updateTeamMemberRole,
} from '@ibee/supabase'

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

async function requireOwnerEntity() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non authentifié.' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { ok: false as const, error: 'Profil introuvable.' }

  return { ok: true as const, supabase, user, entity }
}

export async function saveTeamRolesAction(
  roles: TeamRoleDefinition[],
): Promise<ActionResult<TeamRoleDefinition[]>> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  try {
    const saved = await saveTeamRoles(
      ctx.supabase,
      ctx.entity.id,
      roles.map(mapRoleDefinitionToSaveInput),
    )
    revalidatePath('/dashboard/equipe')
    return { ok: true, data: saved.map(mapRoleRecordToDefinition).map((role) => cloneRole(role)) }
  } catch (err) {
    console.error('[saveTeamRolesAction]', err)
    const message = err instanceof Error ? err.message : 'Enregistrement impossible.'
    return { ok: false, error: message }
  }
}

export async function inviteTeamMemberAction(
  email: string,
  roleId: string,
): Promise<ActionResult<{ id: string; email: string; roleId: string }>> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  const trimmed = email.trim()
  if (!isValidEmail(trimmed)) {
    return { ok: false, error: 'Adresse e-mail invalide.' }
  }
  if (!roleId) {
    return { ok: false, error: 'Sélectionnez un rôle.' }
  }

  try {
    const conflict = await teamEmailAlreadyUsed(
      ctx.supabase,
      ctx.entity.id,
      trimmed,
      ctx.user.email,
    )
    if (conflict === 'owner') {
      return { ok: false, error: 'Cette personne fait déjà partie de l’équipe.' }
    }
    if (conflict === 'member') {
      return { ok: false, error: 'Cette personne fait déjà partie de l’équipe.' }
    }
    if (conflict === 'invite') {
      return { ok: false, error: 'Une invitation est déjà en attente pour cette adresse.' }
    }

    const invite = await createTeamInvitation(ctx.supabase, {
      entity_id: ctx.entity.id,
      email: trimmed,
      role_id: roleId,
      invited_by: ctx.user.id,
    })

    revalidatePath('/dashboard/equipe')
    return {
      ok: true,
      data: { id: invite.id, email: invite.email, roleId: invite.role_id },
    }
  } catch (err) {
    console.error('[inviteTeamMemberAction]', err)
    return { ok: false, error: 'Impossible d’envoyer l’invitation.' }
  }
}

export async function updateTeamMemberRoleAction(
  memberId: string,
  roleId: string,
): Promise<ActionResult<{ memberId: string; roleId: string }>> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  if (memberId === 'owner') {
    return { ok: false, error: 'Le rôle du propriétaire ne peut pas être modifié.' }
  }

  try {
    await updateTeamMemberRole(ctx.supabase, ctx.entity.id, memberId, roleId)
    revalidatePath('/dashboard/equipe')
    return { ok: true, data: { memberId, roleId } }
  } catch (err) {
    console.error('[updateTeamMemberRoleAction]', err)
    return { ok: false, error: 'Impossible de modifier le rôle.' }
  }
}

export async function excludeTeamMemberAction(memberId: string): Promise<ActionResult> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  if (memberId === 'owner') {
    return { ok: false, error: 'Le propriétaire ne peut pas être exclu.' }
  }

  try {
    await removeTeamMember(ctx.supabase, ctx.entity.id, memberId)
    revalidatePath('/dashboard/equipe')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[excludeTeamMemberAction]', err)
    return { ok: false, error: 'Impossible d’exclure ce membre.' }
  }
}

export async function resendTeamInviteAction(inviteId: string): Promise<ActionResult> {
  const ctx = await requireOwnerEntity()
  if (!ctx.ok) return ctx

  try {
    await touchTeamInvitation(ctx.supabase, ctx.entity.id, inviteId)
    revalidatePath('/dashboard/equipe')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[resendTeamInviteAction]', err)
    return { ok: false, error: 'Impossible de renvoyer l’invitation.' }
  }
}
