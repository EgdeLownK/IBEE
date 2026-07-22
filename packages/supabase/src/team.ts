import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './types'

type Client = SupabaseClient<Database>
type TeamRoleRow = Database['public']['Tables']['entity_team_roles']['Row']
type TeamMemberRow = Database['public']['Tables']['entity_team_members']['Row']
type TeamInviteRow = Database['public']['Tables']['entity_team_invitations']['Row']

export type TeamRoleRecord = TeamRoleRow & {
  permissions: Record<string, boolean>
}

export type TeamRoleSaveInput = {
  id?: string
  role_key?: string
  label: string
  bg: string
  fg: string
  permissions: Record<string, boolean>
  locked?: boolean
  inviteable?: boolean
  position?: number
}

const DEFAULT_ROLE_SEEDS: Omit<TeamRoleSaveInput, 'id'>[] = [
  {
    role_key: 'owner',
    label: 'Propriétaire',
    bg: 'var(--color-accent-tint)',
    fg: 'var(--color-accent)',
    permissions: {
      profile_studio: true,
      analyse: true,
      news: true,
      shop: true,
      services: true,
      events: true,
      messages: true,
      connecteur: true,
      team: true,
      revenue: true,
      talent: true,
    },
    locked: true,
    inviteable: false,
    position: 0,
  },
  {
    role_key: 'manager',
    label: 'Gérant',
    bg: 'rgba(44, 141, 74, 0.12)',
    fg: 'rgb(44, 141, 74)',
    permissions: {
      profile_studio: true,
      analyse: true,
      news: true,
      shop: true,
      services: true,
      events: true,
      messages: true,
      connecteur: true,
      team: true,
      revenue: true,
      talent: true,
    },
    inviteable: true,
    position: 1,
  },
  {
    role_key: 'recruiter',
    label: 'Recruteur·se',
    bg: 'rgba(59, 130, 246, 0.12)',
    fg: 'rgb(59, 130, 246)',
    permissions: {
      profile_studio: false,
      analyse: false,
      news: false,
      shop: false,
      services: false,
      events: false,
      messages: true,
      connecteur: false,
      team: false,
      revenue: false,
      talent: true,
    },
    inviteable: true,
    position: 2,
  },
  {
    role_key: 'member',
    label: 'Membre',
    bg: 'var(--color-panel-2)',
    fg: 'var(--color-neutral-500)',
    permissions: {
      profile_studio: false,
      analyse: false,
      news: false,
      shop: false,
      services: true,
      events: false,
      messages: true,
      connecteur: false,
      team: false,
      revenue: false,
      talent: false,
    },
    inviteable: true,
    position: 3,
  },
]

function parsePermissions(value: Json): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, boolean> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'boolean') out[key] = val
  }
  return out
}

function toRoleRecord(row: TeamRoleRow): TeamRoleRecord {
  return {
    ...row,
    permissions: parsePermissions(row.permissions),
  }
}

function slugifyRoleKey(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'role'
}

export async function listTeamRoles(client: Client, entityId: string) {
  const { data, error } = await client
    .from('entity_team_roles')
    .select('*')
    .eq('entity_id', entityId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data ?? []).map(toRoleRecord)
}

export async function ensureDefaultTeamRoles(client: Client, entityId: string) {
  const existing = await listTeamRoles(client, entityId)
  if (existing.length > 0) return existing

  const rows = DEFAULT_ROLE_SEEDS.map((seed) => ({
    entity_id: entityId,
    role_key: seed.role_key!,
    label: seed.label,
    bg: seed.bg,
    fg: seed.fg,
    permissions: seed.permissions as Json,
    locked: seed.locked ?? false,
    inviteable: seed.inviteable ?? true,
    position: seed.position ?? 0,
  }))

  const { data, error } = await client.from('entity_team_roles').insert(rows).select('*')
  if (error) throw error
  return (data ?? []).map(toRoleRecord)
}

export async function saveTeamRoles(
  client: Client,
  entityId: string,
  roles: TeamRoleSaveInput[]
) {
  const existing = await listTeamRoles(client, entityId)
  const existingById = new Map(existing.map((role) => [role.id, role]))
  const keptIds = new Set<string>()

    const usedKeys = new Set(existing.map((role) => role.role_key))

    for (const [index, role] of roles.entries()) {
      const locked = role.locked ?? false
      const existingRole = role.id ? existingById.get(role.id) : undefined
      let roleKey =
        existingRole?.role_key ??
        role.role_key ??
        slugifyRoleKey(role.label)

      if (!existingRole) {
        let candidate = roleKey
        let suffix = 2
        while (usedKeys.has(candidate)) {
          candidate = `${roleKey}-${suffix}`
          suffix += 1
        }
        roleKey = candidate
        usedKeys.add(roleKey)
      }

    const payload = {
      entity_id: entityId,
      role_key: roleKey,
      label: role.label.trim(),
      bg: role.bg,
      fg: role.fg,
      permissions: role.permissions as Json,
      locked,
      inviteable: role.inviteable ?? !locked,
      position: index,
    }

    if (existingRole) {
      const { error } = await client
        .from('entity_team_roles')
        .update({
          label: payload.label,
          bg: payload.bg,
          fg: payload.fg,
          permissions: payload.permissions,
          inviteable: payload.inviteable,
          position: payload.position,
        })
        .eq('id', existingRole.id)
        .eq('entity_id', entityId)

      if (error) throw error
      keptIds.add(existingRole.id)
      continue
    }

    const { data, error } = await client
      .from('entity_team_roles')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw error
    keptIds.add(data.id)
  }

  const removable = existing.filter((role) => !role.locked && !keptIds.has(role.id))
  for (const role of removable) {
    const inUse = await isTeamRoleInUse(client, entityId, role.id)
    if (inUse) {
      throw new Error(`Le rôle « ${role.label} » est encore utilisé.`)
    }
    const { error } = await client
      .from('entity_team_roles')
      .delete()
      .eq('id', role.id)
      .eq('entity_id', entityId)
    if (error) throw error
  }

  return listTeamRoles(client, entityId)
}

export async function isTeamRoleInUse(client: Client, entityId: string, roleId: string) {
  const [members, invites] = await Promise.all([
    client
      .from('entity_team_members')
      .select('id')
      .eq('entity_id', entityId)
      .eq('role_id', roleId)
      .limit(1),
    client
      .from('entity_team_invitations')
      .select('id')
      .eq('entity_id', entityId)
      .eq('role_id', roleId)
      .eq('status', 'pending')
      .limit(1),
  ])

  if (members.error) throw members.error
  if (invites.error) throw invites.error
  return (members.data?.length ?? 0) > 0 || (invites.data?.length ?? 0) > 0
}

export async function listTeamMembers(client: Client, entityId: string) {
  const { data, error } = await client
    .from('entity_team_members')
    .select('*')
    .eq('entity_id', entityId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function listTeamInvitations(client: Client, entityId: string) {
  const { data, error } = await client
    .from('entity_team_invitations')
    .select('*')
    .eq('entity_id', entityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createTeamInvitation(
  client: Client,
  input: {
    entity_id: string
    email: string
    role_id: string
    invited_by: string
  }
) {
  const normalized = input.email.trim().toLowerCase()

  const { data, error } = await client
    .from('entity_team_invitations')
    .insert({
      entity_id: input.entity_id,
      email: normalized,
      role_id: input.role_id,
      invited_by: input.invited_by,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TeamInviteRow
}

export async function updateTeamMemberRole(
  client: Client,
  entityId: string,
  memberId: string,
  roleId: string
) {
  const { data, error } = await client
    .from('entity_team_members')
    .update({ role_id: roleId })
    .eq('id', memberId)
    .eq('entity_id', entityId)
    .select('*')
    .single()

  if (error) throw error
  return data as TeamMemberRow
}

export async function removeTeamMember(client: Client, entityId: string, memberId: string) {
  const { error } = await client
    .from('entity_team_members')
    .delete()
    .eq('id', memberId)
    .eq('entity_id', entityId)

  if (error) throw error
}

export async function touchTeamInvitation(client: Client, entityId: string, inviteId: string) {
  const { data, error } = await client
    .from('entity_team_invitations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('entity_id', entityId)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error) throw error
  return data as TeamInviteRow
}

export async function teamEmailAlreadyUsed(
  client: Client,
  entityId: string,
  email: string,
  ownerEmail?: string | null
) {
  const normalized = email.trim().toLowerCase()
  if (ownerEmail && ownerEmail.trim().toLowerCase() === normalized) {
    return 'owner'
  }

  const [members, invites] = await Promise.all([
    client
      .from('entity_team_members')
      .select('id')
      .eq('entity_id', entityId)
      .ilike('email', normalized)
      .limit(1),
    client
      .from('entity_team_invitations')
      .select('id')
      .eq('entity_id', entityId)
      .eq('status', 'pending')
      .ilike('email', normalized)
      .limit(1),
  ])

  if (members.error) throw members.error
  if (invites.error) throw invites.error
  if ((members.data?.length ?? 0) > 0) return 'member'
  if ((invites.data?.length ?? 0) > 0) return 'invite'
  return null
}

export function getOwnerRole(roles: TeamRoleRecord[]) {
  return roles.find((role) => role.role_key === 'owner' && role.locked)
}
