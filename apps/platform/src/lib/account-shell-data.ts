import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getEntityByUserId } from '@ibee/supabase'
import type { Database } from '@ibee/supabase'

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

/** Profils projet démo — en attente du multi-entity en base */
const DEMO_PROJECT_ACCOUNTS: Omit<ProjectAccount, 'id' | 'slug'>[] = [
  {
    name: 'Killian Care',
    role: 'Marque produits',
    avatarUrl: null,
    color: 'var(--color-neutral-900)',
  },
  {
    name: 'Académie Killian',
    role: 'Formation',
    avatarUrl: null,
    color: 'var(--color-neutral-500)',
  },
]

type EntityRow = Database['public']['Tables']['entity']['Row']

export function buildAccountShellData(user: User, entity: EntityRow): AccountShellData {
  const emailLocal = user.email?.split('@')[0] ?? 'utilisateur'
  const personalName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    emailLocal

  const primaryProject: ProjectAccount = {
    id: entity.id,
    name: entity.display_name,
    role: entity.role,
    slug: entity.slug,
    avatarUrl: entity.avatar_url,
    color: 'var(--color-accent)',
  }

  const demoProjects: ProjectAccount[] = DEMO_PROJECT_ACCOUNTS.map((demo, index) => ({
    ...demo,
    id: `demo-project-${index + 1}`,
    slug: demo.name.toLowerCase().replace(/\s+/g, '-'),
  }))

  return {
    personalAccount: {
      displayName: personalName,
      email: user.email ?? '',
      avatarUrl: user.user_metadata?.avatar_url ?? entity.avatar_url,
      handle: `ibee.app/${entity.slug}`,
    },
    projectAccounts: [primaryProject, ...demoProjects],
    primaryProjectId: entity.id,
  }
}

/** Compat public layout — préférer getDashboardAccountShell() côté dashboard. */
export async function loadAccountShellData(
  supabase: SupabaseClient<Database>
): Promise<AccountShellData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return null

  return buildAccountShellData(user, entity)
}
