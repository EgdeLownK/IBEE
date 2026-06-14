import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TeamDashboard } from '@/components/dashboard/team/TeamDashboard'
import {
  buildTeamPageDataFromEntity,
  mapRoleRecordToDefinition,
} from '@/lib/team-data'
import {
  ensureDefaultTeamRoles,
  getEntityByUserId,
  getOwnerRole,
  listTeamInvitations,
  listTeamMembers,
} from '@ibee/supabase'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Équipe',
}

export default async function EquipePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const roles = await ensureDefaultTeamRoles(supabase, entity.id)
  const ownerRole = getOwnerRole(roles)
  if (!ownerRole) redirect('/login')

  const [members, pending] = await Promise.all([
    listTeamMembers(supabase, entity.id),
    listTeamInvitations(supabase, entity.id),
  ])

  const data = buildTeamPageDataFromEntity({
    display_name: entity.display_name,
    created_at: entity.created_at,
    ownerEmail: user.email,
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
