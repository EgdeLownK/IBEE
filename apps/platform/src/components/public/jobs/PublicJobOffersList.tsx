import { JobOfferRow } from './JobOfferRow'

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
  blocks?: unknown
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
      {offers.map((offer) => (
        <JobOfferRow
          key={offer.id}
          variant="visitor"
          href={`/${entitySlug}/offres/${offer.id}`}
          applyHref={`/${entitySlug}/offres/${offer.id}`}
          title={offer.title}
          contractType={offer.contract_type as 'cdi' | 'cdd' | 'mission'}
          locationType={offer.location_type as 'remote' | 'onsite' | 'hybrid'}
          locationText={offer.location_text}
          createdAt={offer.created_at}
          compensationLabel={compensationLabel(offer)}
          blocks={offer.blocks}
        />
      ))}
    </div>
  )
}
