import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  getBookingsByEntity,
  getAppointmentTypesByEntity,
  getAvailabilitySchedule,
  getAvailabilityExceptions,
  getBookingExtendedStats,
} from '@ibee/supabase'
import { AvailabilityEditor } from './availability/AvailabilityEditor'
import { AppointmentsHome } from './AppointmentsHome'

const VALID_TABS = ['dashboard', 'services', 'history', 'availability'] as const
type Tab = (typeof VALID_TABS)[number]

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; toast?: string; new?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  const params = await searchParams
  const defaultTab: Tab = VALID_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'dashboard'

  const now = new Date()
  const nowIso = now.toISOString()
  const threeMonthsLater = new Date(now)
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

  const [upcoming, past, services, schedules, exceptions, stats] = await Promise.all([
    getBookingsByEntity(supabase, entity.id, { from: nowIso, limit: 100 }),
    getBookingsByEntity(supabase, entity.id, { to: nowIso, limit: 100 }),
    getAppointmentTypesByEntity(supabase, entity.id),
    getAvailabilitySchedule(supabase, entity.id),
    getAvailabilityExceptions(
      supabase,
      entity.id,
      now.toISOString().split('T')[0]!,
      threeMonthsLater.toISOString().split('T')[0]!
    ),
    getBookingExtendedStats(supabase, entity.id),
  ])

  const serviceStats = Object.fromEntries(
    services.map((s) => [
      s.id,
      {
        bookings: stats.byService[s.id]?.bookings ?? 0,
        revenue: stats.byService[s.id]?.revenue ?? 0,
        clicks: 0,
        conversion: null as number | null,
      },
    ])
  )

  const toastMessage =
    params.toast === 'status-updated'
      ? 'Statut du rendez-vous mis à jour.'
      : params.toast === 'created'
      ? 'Service créé avec succès.'
      : undefined

  return (
    <AppointmentsHome
      stats={stats}
      services={services}
      upcoming={upcoming}
      past={past}
      serviceStats={serviceStats}
      availabilitySlot={
        <AvailabilityEditor initialSchedules={schedules} initialExceptions={exceptions} />
      }
      defaultTab={defaultTab}
      toastMessage={toastMessage}
      initialCreateOpen={params.new === 'true'}
    />
  )
}
