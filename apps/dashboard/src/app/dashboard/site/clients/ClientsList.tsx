'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users, Mail, Phone, Tag } from 'lucide-react'
import type { Client } from '@agora/supabase'
import { Input } from '@agora/ui-react'

type Props = {
  clients: Client[]
}

function formatEuros(cents: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(cents / 100))
}

function formatRelativeDate(iso: string | null) {
  if (!iso) return 'Jamais'
  const date = new Date(iso)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (Math.abs(diffDays) >= 30) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  }
  return rtf.format(diffDays, 'day')
}

export function ClientsList({ clients }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return clients
    const q = query.trim().toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [clients, query])

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <h1 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <span className="text-accent">
              <Users className="h-[18px] w-[18px]" aria-hidden />
            </span>
            Clients
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
              {clients.length}
            </span>
          </h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8">
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <Search className="h-4 w-4" />
          </div>
          <Input
            variant="subtle"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client par nom, email, téléphone ou tag…"
            className="py-3 pl-12 pr-4"
          />
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-16 text-center">
            <Users className="h-10 w-10 text-neutral-300" aria-hidden />
            <p className="mt-4 text-sm font-bold text-neutral-600">Aucun client pour l’instant</p>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              Dès qu’une personne réserve un rendez-vous, elle apparaîtra ici automatiquement. Tu pourras
              ajouter des notes et des tags pour chaque client.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Aucun client ne correspond à « {query} ».
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/site/clients/${client.id}`}
                className="group flex flex-col rounded-xl border border-neutral-200 bg-neutral-0 p-5 transition hover:border-accent/30 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-accent">
                    {(client.name || client.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-neutral-900 transition group-hover:text-accent">
                      {client.name || client.email}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                    {client.phone && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {client.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {client.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                    {client.tags.length > 4 && (
                      <span className="text-[10px] font-bold text-neutral-400">
                        +{client.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4 text-center">
                  <Stat label="RDV" value={client.bookings_count.toString()} />
                  <Stat label="Revenu" value={`${formatEuros(client.total_revenue_cents)}€`} />
                  <Stat
                    label="Dernier"
                    value={formatRelativeDate(client.last_booking_at)}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="truncate text-xs font-bold text-neutral-900">{value}</p>
    </div>
  )
}
