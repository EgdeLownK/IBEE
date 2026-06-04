'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Download, Plus } from 'lucide-react'
import type { BookingExtendedStats } from '@ibee/supabase'
import { AppointmentsChartHero } from './components/AppointmentsChartHero'
import { AppointmentsRecapSidebar } from './components/AppointmentsRecapSidebar'
import { ServicesGrid } from './components/ServicesGrid'
import { BookingsHistoryTable } from './components/BookingsHistoryTable'
import { BookingsDashboardToday } from './components/BookingsDashboardToday'
import { CreateServiceModal } from './components/CreateServiceModal'

type AppointmentType = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  location_type: string
  price_cents: number | null
  currency: string
  is_active: boolean
  color: string | null
}

type BookingWithType = {
  id: string
  client_id: string | null
  booker_name: string
  booker_email: string
  booker_phone: string | null
  booker_message: string | null
  start_at: string
  end_at: string
  status: string
  notes: string | null
  appointment_types: {
    title: string
    duration_minutes: number
    location_type: string
    location_details: string | null
    color: string | null
  } | null
}

type Props = {
  stats: BookingExtendedStats
  services: AppointmentType[]
  upcoming: BookingWithType[]
  past: BookingWithType[]
  serviceStats: Record<string, { bookings: number; revenue: number; clicks: number; conversion: number | null }>
  availabilitySlot: ReactNode
  defaultTab: 'dashboard' | 'services' | 'history' | 'availability'
  toastMessage?: string
  initialCreateOpen?: boolean
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'services', label: 'Mes Services' },
  { key: 'history', label: 'Historique' },
  { key: 'availability', label: 'Disponibilités' },
] as const

type Tab = (typeof TABS)[number]['key']

export function AppointmentsHome({
  stats,
  services,
  upcoming,
  past,
  serviceStats,
  availabilitySlot,
  defaultTab,
  toastMessage,
  initialCreateOpen = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const [createOpen, setCreateOpen] = useState(initialCreateOpen)

  useEffect(() => {
    if (!toastMessage) return
    toast.success(toastMessage)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('toast')
      window.history.replaceState(null, '', url.toString())
    }
  }, [toastMessage])

  useEffect(() => {
    if (!initialCreateOpen) return
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('new')
      window.history.replaceState(null, '', url.toString())
    }
  }, [initialCreateOpen])

  const openCreate = () => setCreateOpen(true)
  const closeCreate = () => setCreateOpen(false)

  const switchTab = (key: Tab) => {
    setActiveTab(key)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', key)
      url.searchParams.delete('toast')
      window.history.replaceState(null, '', url.toString())
    }
  }

  const counts: Partial<Record<Tab, number>> = {
    services: services.length,
    history: upcoming.length + past.length,
    dashboard: upcoming.length,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <h1 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <span className="text-accent">
              <CalendarClock className="h-[18px] w-[18px]" aria-hidden />
            </span>
            Mes rendez-vous
          </h1>
          <div className="flex gap-3">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-xs font-semibold text-neutral-600 opacity-60"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-md bg-cta-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cta-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nouveau service
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <AppointmentsChartHero
            weekChart={stats.weekChart}
            yearChart={stats.yearChart}
            recap={stats.recap}
          />
          <AppointmentsRecapSidebar recap={stats.recap} />
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-0 shadow-sm">
          <div className="border-b border-neutral-100 px-8">
            <div className="flex gap-8 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchTab(tab.key)}
                  className={`relative whitespace-nowrap py-6 text-xs font-bold transition ${
                    activeTab === tab.key ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {tab.label}
                  {counts[tab.key] !== undefined && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
                      {counts[tab.key]}
                    </span>
                  )}
                  {activeTab === tab.key && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'dashboard' && (
              <BookingsDashboardToday upcoming={upcoming} past={past} />
            )}
            {activeTab === 'services' && (
              <ServicesGrid services={services} stats={serviceStats} onCreate={openCreate} />
            )}
            {activeTab === 'history' && <BookingsHistoryTable upcoming={upcoming} past={past} />}
            {activeTab === 'availability' && availabilitySlot}
          </div>
        </div>
      </div>

      <CreateServiceModal open={createOpen} onClose={closeCreate} />
    </div>
  )
}
