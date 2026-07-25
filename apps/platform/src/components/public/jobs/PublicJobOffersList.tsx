import Link from 'next/link'
import { Briefcase, MapPin } from 'lucide-react'

type JobOfferPublic = {
  id: string
  title: string
  contract_type: string
  location_type: string
  location_text: string | null
  compensation_type: string | null
  compensation_amount: number | null
  compensation_frequency: string | null
  created_at: string
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  mission: 'Mission / Freelance',
}

const LOCATION_LABELS: Record<string, string> = {
  remote: '100% Télétravail',
  onsite: 'Sur site',
  hybrid: 'Hybride',
}

function compensationLabel(offer: JobOfferPublic): string | null {
  if (!offer.compensation_type || !offer.compensation_amount) return null
  const unit = offer.compensation_type === 'percentage' ? '%' : '€'
  const freq =
    offer.compensation_frequency === 'monthly'
      ? '/mois'
      : offer.compensation_frequency === 'weekly'
        ? '/semaine'
        : offer.compensation_frequency === 'mission'
          ? '/mission'
          : ''
  return `${offer.compensation_amount}${unit}${freq ? ' ' + freq : ''}`
}

export function PublicJobOffersList({
  offers,
  entitySlug,
}: {
  offers: JobOfferPublic[]
  entitySlug: string
}) {
  if (offers.length === 0) {
    return (
      <div className="px-[22px] py-12 text-center">
        <p className="text-sm text-neutral-500">Aucune offre d&apos;emploi en ce moment.</p>
      </div>
    )
  }

  return (
    <div className="px-[22px] py-6 space-y-3">
      <p className="text-sm text-neutral-500 mb-4">
        {offers.length} offre{offers.length > 1 ? 's' : ''} disponible{offers.length > 1 ? 's' : ''}
      </p>
      {offers.map((offer) => {
        const comp = compensationLabel(offer)
        return (
          <Link
            key={offer.id}
            href={`/${entitySlug}/offres/${offer.id}`}
            className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900 text-sm truncate">{offer.title}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                    <Briefcase className="h-3 w-3" />
                    {CONTRACT_LABELS[offer.contract_type] ?? offer.contract_type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                    <MapPin className="h-3 w-3" />
                    {offer.location_type === 'remote'
                      ? LOCATION_LABELS.remote
                      : offer.location_text || LOCATION_LABELS[offer.location_type] || 'Sur site'}
                  </span>
                  {comp ? <span className="text-xs text-neutral-500">{comp}</span> : null}
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Postuler
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
