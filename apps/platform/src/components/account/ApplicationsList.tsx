import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import type { listMyApplications } from '@ibee/supabase'

type Application = Awaited<ReturnType<typeof listMyApplications>>[number]

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-50 text-yellow-700' },
  reviewing: { label: 'En cours', className: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Accepté', className: 'bg-green-50 text-green-700' },
  rejected: { label: 'Refusé', className: 'bg-red-50 text-red-700' },
}

export function ApplicationsList({ applications }: { applications: Application[] }) {
  if (applications.length === 0) {
    return (
      <div className="py-16 text-center">
        <Briefcase className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Aucune candidature</h2>
        <p className="text-sm text-neutral-500">
          Explorez les offres disponibles sur les profils IBEE.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Explorer
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Mes candidatures</h1>
      <div className="space-y-3">
        {applications.map((app) => {
          const statusInfo = STATUS_LABELS[app.status ?? 'pending'] ?? STATUS_LABELS.pending
          const date = new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date(app.created_at))
          return (
            <div key={app.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm text-neutral-900">
                    {app.entity_job_offers?.title ?? 'Offre supprimée'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{date}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
