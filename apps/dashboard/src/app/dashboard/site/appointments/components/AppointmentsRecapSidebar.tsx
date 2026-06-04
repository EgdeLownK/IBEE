import { CloudSun } from 'lucide-react'
import type { BookingExtendedStats } from '@ibee/supabase'

type Props = {
  recap: BookingExtendedStats['recap']
}

const ROWS: Array<{ key: keyof BookingExtendedStats['recap']; label: string }> = [
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: 'Ce trimestre' },
  { key: 'year', label: 'Cette année' },
]

function formatEuros(cents: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(cents / 100))
}

export function AppointmentsRecapSidebar({ recap }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
        <h3 className="text-base font-bold text-neutral-900">Récapitulatif</h3>
        <div className="mt-5 flex flex-col gap-1">
          {ROWS.map(({ key, label }) => {
            const stat = recap[key]
            return (
              <div
                key={key}
                className="group flex items-center justify-between rounded-md px-3 py-2.5 transition hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-50 text-neutral-400 transition group-hover:bg-accent-soft group-hover:text-accent">
                    <CloudSun className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{label}</p>
                    <p className="text-xs text-neutral-600">{formatEuros(stat.revenue)} €</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-neutral-900">
                  {stat.count} RDV
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
