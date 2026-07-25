import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getEntityByUserId, listAccessibleEntities } from '@ibee/supabase'
import type { Database, AccessibleEntity } from '@ibee/supabase'

export type ProjectAccount = {
  id: string
  name: string
  role: string | null
  slug: string
  avatarUrl: string | null
  color: string
}

export type PersonalAccount = {
  displayName: string
  email: string
  avatarUrl: string | null
  handle: string
}

export type AccountShellData = {
  personalAccount: PersonalAccount
  projectAccounts: ProjectAccount[]
  primaryProjectId: string
}

type EntityRow = Database['public']['Tables']['entity']['Row']

export function buildAccountShellData(
  user: User,
  entity: EntityRow | null,
  accessible: { owned: AccessibleEntity[]; member: AccessibleEntity[] }
): AccountShellData {
  const emailLocal = user.email?.split('@')[0] ?? 'utilisateur'
  const personalName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    emailLocal

  const toProjectAccount = (e: AccessibleEntity, color: string): ProjectAccount => ({
    id: e.id,
    name: e.display_name,
    role: e.role,
    slug: e.slug,
    avatarUrl: e.avatar_url,
    color,
  })

  const ownedProjects = accessible.owned.map((e) =>
    toProjectAccount(e, 'var(--color-accent)')
  )
  const memberProjects = accessible.member.map((e) =>
    toProjectAccount(e, 'var(--color-neutral-500)')
  )
  const projectAccounts = [...ownedProjects, ...memberProjects]
  const primaryProjectId = entity?.id ?? accessible.owned[0]?.id ?? ''

  return {
    personalAccount: {
      displayName: personalName,
      email: user.email ?? '',
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      handle: entity ? `ibee.app/${entity.slug}` : 'ibee.app',
    },
    projectAccounts,
    primaryProjectId,
  }
}

/** Compat public layout — préférer getDashboardAccountShell() côté dashboard. */
export async function loadAccountShellData(
  supabase: SupabaseClient<Database>,
): Promise<AccountShellData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entity = await getEntityByUserId(supabase, user.id)
  // Un user sans entité peut quand même être candidat — on ne retourne pas null

  const accessible = user.email
    ? await listAccessibleEntities(supabase, user.id, user.email).catch(() => ({
        owned: entity ? [entity] : [],
        member: [],
      }))
    : { owned: entity ? [entity] : [], member: [] as AccessibleEntity[] }

  return buildAccountShellData(user, entity, accessible)
}
