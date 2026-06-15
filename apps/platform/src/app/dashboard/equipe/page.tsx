import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@ibee/supabase'
import {
  ensureDefaultTeamRoles,
  getOwnerRole,
  listTeamInvitations,
  listTeamMembers,
} from '@ibee/supabase'
import { TeamDashboard } from '@/components/dashboard/team/TeamDashboard'
import { TeamPageSkeleton } from '@/components/dashboard/team/TeamPageSkeleton'
import {
  buildTeamPageDataFromEntity,
  mapRoleRecordToDefinition,
} from '@/lib/team-data'
import { getDashboardContext } from '@/lib/dashboard-context'
import { measureDashboardLoad } from '@/lib/dashboard-perf'

export const metadata: Metadata = {
  title: 'Équipe',
}

type LoaderProps = {
  supabase: SupabaseClient<Database>
  entityId: string
  displayName: string
  createdAt: string
  ownerEmail: string
}

async function EquipePageLoader({
  supabase,
  entityId,
  displayName,
  createdAt,
  ownerEmail,
}: LoaderProps) {
  const roles = await ensureDefaultTeamRoles(supabase, entityId)
  const ownerRole = getOwnerRole(roles)
  if (!ownerRole) redirect('/login')

  const [members, pending] = await measureDashboardLoad('page:equipe', () =>
    Promise.all([
      listTeamMembers(supabase, entityId),
      listTeamInvitations(supabase, entityId),
    ])
  )

  const data = buildTeamPageDataFromEntity({
    display_name: displayName,
    created_at: createdAt,
    ownerEmail,
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

export default async function EquipePage() {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  return (
    <Suspense fallback={<TeamPageSkeleton />}>
      <EquipePageLoader
        supabase={ctx.supabase}
        entityId={ctx.entity.id}
        displayName={ctx.entity.display_name}
        createdAt={ctx.entity.created_at}
        ownerEmail={ctx.user.email ?? ''}
      />
    </Suspense>
  )
}
