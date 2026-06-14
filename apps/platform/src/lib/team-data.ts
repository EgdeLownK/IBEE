export type TeamPermissionKey =
  | 'profile_studio'
  | 'analyse'
  | 'news'
  | 'shop'
  | 'services'
  | 'events'
  | 'drive'
  | 'messages'
  | 'connecteur'
  | 'team'
  | 'revenue'

export type TeamPermissions = Record<TeamPermissionKey, boolean>

export type TeamPermissionItem = {
  key: TeamPermissionKey
  label: string
  description: string
}

export type TeamPermissionGroup = {
  id: string
  label: string
  items: TeamPermissionItem[]
}

export const TEAM_PERMISSION_GROUPS: TeamPermissionGroup[] = [
  {
    id: 'general',
    label: 'Général',
    items: [
      {
        key: 'profile_studio',
        label: 'Profile web',
        description: 'Modifier le studio et les sections du profil',
      },
      {
        key: 'analyse',
        label: 'Analyse',
        description: 'Consulter les statistiques et performances',
      },
    ],
  },
  {
    id: 'content',
    label: 'Contenu',
    items: [
      {
        key: 'news',
        label: 'News',
        description: 'Créer et modérer les publications',
      },
      {
        key: 'shop',
        label: 'Shop',
        description: 'Gérer les produits et commandes',
      },
      {
        key: 'services',
        label: 'Services',
        description: 'Gérer les prestations et réservations',
      },
      {
        key: 'events',
        label: 'Événements',
        description: 'Créer et gérer les événements',
      },
    ],
  },
  {
    id: 'tools',
    label: 'Outils',
    items: [
      {
        key: 'drive',
        label: 'Drive',
        description: 'Accéder aux fichiers du projet',
      },
      {
        key: 'messages',
        label: 'Messages',
        description: 'Lire et répondre aux messages clients',
      },
      {
        key: 'connecteur',
        label: 'Connecteur',
        description: 'Configurer les intégrations externes',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      {
        key: 'team',
        label: 'Équipe',
        description: 'Inviter des membres et gérer les rôles',
      },
      {
        key: 'revenue',
        label: 'Revenus',
        description: 'Consulter le chiffre d\'affaires',
      },
    ],
  },
]

export const TEAM_PERMISSION_KEYS: TeamPermissionKey[] = TEAM_PERMISSION_GROUPS.flatMap(
  (group) => group.items.map((item) => item.key)
)

export function createEmptyPermissions(): TeamPermissions {
  return Object.fromEntries(TEAM_PERMISSION_KEYS.map((key) => [key, false])) as TeamPermissions
}

export function createFullPermissions(): TeamPermissions {
  return Object.fromEntries(TEAM_PERMISSION_KEYS.map((key) => [key, true])) as TeamPermissions
}

export function clonePermissions(permissions: TeamPermissions): TeamPermissions {
  return { ...permissions }
}

export const OWNER_PERMISSIONS = createFullPermissions()

export const MANAGER_PERMISSIONS: TeamPermissions = {
  ...createFullPermissions(),
}

export const MEMBER_PERMISSIONS: TeamPermissions = {
  ...createEmptyPermissions(),
  drive: true,
  messages: true,
  services: true,
}

export function countEnabledPermissions(permissions: TeamPermissions) {
  return TEAM_PERMISSION_KEYS.filter((key) => permissions[key]).length
}

export function formatPermissionSummary(permissions: TeamPermissions, maxLabels = 3) {
  const labels = TEAM_PERMISSION_GROUPS.flatMap((group) =>
    group.items.filter((item) => permissions[item.key]).map((item) => item.label)
  )
  if (labels.length === 0) return 'Aucun accès'
  if (labels.length <= maxLabels) return labels.join(' · ')
  const visible = labels.slice(0, maxLabels).join(' · ')
  return `${visible} · +${labels.length - maxLabels}`
}

export type TeamRoleDefinition = {
  id: string
  roleKey?: string
  label: string
  bg: string
  fg: string
  permissions: TeamPermissions
  locked?: boolean
  inviteable?: boolean
}

export type TeamMember = {
  id: string
  name: string
  email: string
  roleId: string
  since: string
  online: boolean
}

export type PendingInvite = {
  id: string
  email: string
  roleId: string
}

export type TeamPageData = {
  projectName: string
  roles: TeamRoleDefinition[]
  members: TeamMember[]
  pending: PendingInvite[]
}

export const ROLE_PALETTE: { bg: string; fg: string }[] = [
  { bg: 'rgba(44, 141, 74, 0.12)', fg: 'rgb(44, 141, 74)' },
  { bg: 'var(--color-accent-tint)', fg: 'var(--color-accent)' },
  { bg: 'var(--color-panel-2)', fg: 'var(--color-neutral-500)' },
  { bg: 'rgba(59, 130, 246, 0.12)', fg: 'rgb(59, 130, 246)' },
  { bg: 'rgba(168, 85, 247, 0.12)', fg: 'rgb(168, 85, 247)' },
  { bg: 'rgba(234, 88, 12, 0.12)', fg: 'rgb(234, 88, 12)' },
]

export const DEFAULT_TEAM_ROLES: TeamRoleDefinition[] = [
  {
    id: 'owner',
    roleKey: 'owner',
    label: 'Propriétaire',
    bg: 'var(--color-accent-tint)',
    fg: 'var(--color-accent)',
    permissions: clonePermissions(OWNER_PERMISSIONS),
    locked: true,
    inviteable: false,
  },
  {
    id: 'manager',
    roleKey: 'manager',
    label: 'Gérant',
    bg: 'rgba(44, 141, 74, 0.12)',
    fg: 'rgb(44, 141, 74)',
    permissions: clonePermissions(MANAGER_PERMISSIONS),
    inviteable: true,
  },
  {
    id: 'member',
    roleKey: 'member',
    label: 'Membre',
    bg: 'var(--color-panel-2)',
    fg: 'var(--color-neutral-500)',
    permissions: clonePermissions(MEMBER_PERMISSIONS),
    inviteable: true,
  },
]

export function cloneRole(role: TeamRoleDefinition): TeamRoleDefinition {
  return {
    ...role,
    permissions: clonePermissions(role.permissions),
  }
}

export function getRoleDefinition(roles: TeamRoleDefinition[], roleId: string) {
  return roles.find((role) => role.id === roleId)
}

export function getRoleStyle(roles: TeamRoleDefinition[], roleId: string) {
  const role = getRoleDefinition(roles, roleId)
  return role ?? { bg: 'var(--color-panel-2)', fg: 'var(--color-neutral-500)' }
}

export function getRoleLabel(roles: TeamRoleDefinition[], roleId: string) {
  return getRoleDefinition(roles, roleId)?.label ?? 'Rôle inconnu'
}

export function getInviteableRoles(roles: TeamRoleDefinition[]) {
  return roles.filter((role) => role.inviteable !== false)
}

export function getAssignableRoles(roles: TeamRoleDefinition[]) {
  return roles.filter((role) => !role.locked)
}

export function memberInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function createRoleId(label: string, existing: TeamRoleDefinition[]) {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const seed = base || 'role'
  let id = seed
  let index = 2
  while (existing.some((role) => role.id === id)) {
    id = `${seed}-${index}`
    index += 1
  }
  return id
}

export function nextRolePalette(index: number) {
  return ROLE_PALETTE[index % ROLE_PALETTE.length]!
}

export function createRoleDraft(existing: TeamRoleDefinition[]): TeamRoleDefinition {
  const palette = nextRolePalette(existing.length)
  return {
    id: '',
    label: '',
    ...palette,
    permissions: clonePermissions(MEMBER_PERMISSIONS),
    inviteable: true,
  }
}

export function hasEnabledPermission(permissions: TeamPermissions) {
  return countEnabledPermissions(permissions) > 0
}

export function isRoleInUse(
  roleId: string,
  members: TeamMember[],
  pending: PendingInvite[]
) {
  return (
    members.some((member) => member.roleId === roleId) ||
    pending.some((invite) => invite.roleId === roleId)
  )
}

export function createInviteId() {
  return `invite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatMemberSince(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Membre'
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date)
  return `Depuis ${label.replace('.', '')}`
}

function formatOwnerSince(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Depuis la création'
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date)
  return `Depuis ${label.replace('.', '')}`
}

export function mapRoleRecordToDefinition(role: {
  id: string
  role_key: string
  label: string
  bg: string
  fg: string
  permissions: Record<string, boolean>
  locked: boolean
  inviteable: boolean
}): TeamRoleDefinition {
  const permissions = createEmptyPermissions()
  for (const key of TEAM_PERMISSION_KEYS) {
    permissions[key] = Boolean(role.permissions[key])
  }

  return {
    id: role.id,
    roleKey: role.role_key,
    label: role.label,
    bg: role.bg,
    fg: role.fg,
    permissions,
    locked: role.locked,
    inviteable: role.inviteable,
  }
}

export function mapRoleDefinitionToSaveInput(role: TeamRoleDefinition) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(role.id)
  return {
    id: isUuid ? role.id : undefined,
    role_key: role.roleKey,
    label: role.label,
    bg: role.bg,
    fg: role.fg,
    permissions: role.permissions,
    locked: role.locked,
    inviteable: role.inviteable,
  }
}

export function buildTeamPageData(input: {
  projectName: string
  ownerName: string
  ownerEmail: string
  ownerSince: string
  ownerRoleId: string
  roles: TeamRoleDefinition[]
  members: Array<{
    id: string
    display_name: string | null
    email: string
    role_id: string
    joined_at: string
  }>
  pending: Array<{ id: string; email: string; role_id: string }>
}): TeamPageData {
  const owner: TeamMember = {
    id: 'owner',
    name: input.ownerName,
    email: input.ownerEmail,
    roleId: input.ownerRoleId,
    since: input.ownerSince,
    online: true,
  }

  return {
    projectName: input.projectName,
    roles: input.roles.map((role) => cloneRole(role)),
    members: [
      owner,
      ...input.members.map((member) => ({
        id: member.id,
        name: member.display_name?.trim() || member.email,
        email: member.email,
        roleId: member.role_id,
        since: formatMemberSince(member.joined_at),
        online: false,
      })),
    ],
    pending: input.pending.map((invite) => ({
      id: invite.id,
      email: invite.email,
      roleId: invite.role_id,
    })),
  }
}

export function buildTeamPageDataFromEntity(entity: {
  display_name: string
  created_at: string
  ownerEmail?: string | null
  ownerRoleId: string
  roles: TeamRoleDefinition[]
  members?: Array<{
    id: string
    display_name: string | null
    email: string
    role_id: string
    joined_at: string
  }>
  pending?: Array<{ id: string; email: string; role_id: string }>
}) {
  return buildTeamPageData({
    projectName: entity.display_name,
    ownerName: entity.display_name,
    ownerEmail: entity.ownerEmail ?? '—',
    ownerSince: formatOwnerSince(entity.created_at),
    ownerRoleId: entity.ownerRoleId,
    roles: entity.roles,
    members: entity.members ?? [],
    pending: entity.pending ?? [],
  })
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
