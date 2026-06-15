import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TeamDashboard } from '@/components/dashboard/team/TeamDashboard'
import {
  buildTeamPageDataFromEntity,
  mapRoleRecordToDefinition,
} from '@/lib/team-data'
import {
  ensureDefaultTeamRoles,
  getOwnerRole,
  listTeamInvitations,
  listTeamMembers,
} from '@ibee/supabase'
import { getDashboardContext } from '@/lib/dashboard-context'
import { measureDashboardLoad } from '@/lib/dashboard-perf'

export const metadata: Metadata = {
  title: 'Équipe',
}

export default async function EquipePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const roles = await ensureDefaultTeamRoles(ctx.supabase, ctx.entity.id)
  const ownerRole = getOwnerRole(roles)
  if (!ownerRole) redirect('/login')

  const [members, pending] = await measureDashboardLoad('page:equipe', () =>
    Promise.all([
      listTeamMembers(ctx.supabase, ctx.entity.id),
      listTeamInvitations(ctx.supabase, ctx.entity.id),
    ])
  )

  const data = buildTeamPageDataFromEntity({
    display_name: ctx.entity.display_name,
    created_at: ctx.entity.created_at,
    ownerEmail: ctx.user.email,
    ownerRoleId: ownerRole.id,
    roles: roles.map(mapRoleRecordToDefinition),
    members,
    pending: pending.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role_id: invite.role_id,
    })),
  })

  return <TeamDashboard data={data} />
}
