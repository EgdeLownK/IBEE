'use client'

import { useEffect, useState } from 'react'
import { Search, MoreVertical, Package, Plus } from 'lucide-react'
import { Input } from '@agora/ui-react'

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

type ServiceStats = {
  bookings: number
  revenue: number
  clicks: number
  conversion: number | null
}

type Props = {
  services: AppointmentType[]
  stats: Record<string, ServiceStats>
  onCreate?: () => void
}

const LOCATION_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  video: { bg: 'bg-info/10', text: 'text-info', label: 'Visio' },
  in_person: { bg: 'bg-accent-soft', text: 'text-accent', label: 'Sur place' },
  phone: { bg: 'bg-success/10', text: 'text-success', label: 'Téléphone' },
}

function formatPrice(cents: number | null, currency: string) {
  if (cents === null || cents === 0) return 'Gratuit'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

function formatEuros(cents: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(cents / 100))
}

export function ServicesGrid({ services, stats, onCreate }: Props) {
  const [query, setQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (openMenuId === null) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (!target?.closest('[data-menu-anchor]')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  const filtered = services.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-16 text-center">
        <Package className="h-10 w-10 text-neutral-300" aria-hidden />
        <p className="mt-4 text-sm font-medium text-neutral-600">Aucun service configuré</p>
        <p className="mt-1 text-xs text-neutral-400">
          Créez votre premier type de rendez-vous pour commencer.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-cta-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-cta-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Créer un service
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-7">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
          <Search className="h-4 w-4" />
        </div>
        <Input
          variant="subtle"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un service..."
          className="py-3 pl-12 pr-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((service) => {
          const badge = LOCATION_BADGES[service.location_type] ?? LOCATION_BADGES.video!
          const s = stats[service.id] ?? { bookings: 0, revenue: 0, clicks: 0, conversion: null }

          return (
            <article
              key={service.id}
              className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 transition hover:border-accent/20 hover:shadow-lg"
            >
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                  <div className="relative" data-menu-anchor>
                    <button
                      type="button"
                      aria-label="Options"
                      onClick={() => setOpenMenuId(openMenuId === service.id ? null : service.id)}
                      className="flex rounded-sm p-1 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === service.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-md border border-neutral-100 bg-neutral-0 py-1 shadow-lg">
                        <a
                          href={`/dashboard/site/appointments/types/${service.id}/edit`}
                          className="block px-4 py-2 text-left text-xs text-neutral-600 hover:bg-neutral-50"
                        >
                          Modifier
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-neutral-900 transition group-hover:text-accent">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                    {service.description}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="RDV" value={s.bookings.toString()} />
                  <MiniStat label="Revenu" value={`${formatEuros(s.revenue)}€`} />
                  <MiniStat label="Durée" value={`${service.duration_minutes} min`} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-50 pt-4">
                  <span className="text-xl font-bold text-neutral-900">
                    {formatPrice(service.price_cents, service.currency)}
                  </span>
                  <a
                    href={`/dashboard/site/appointments/types/${service.id}/edit`}
                    className="rounded-md bg-cta-primary px-3.5 py-2 text-xs font-bold text-white opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-cta-primary-hover"
                  >
                    Modifier
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-neutral-50 px-3 py-2">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="text-sm font-bold text-neutral-900">{value}</p>
    </div>
  )
}
