'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Briefcase, MapPin } from 'lucide-react'
import type { JobOffer } from '@ibee/supabase'
import { parseHistoryBlocks } from '@ibee/shared'
import { ApplyBottomSheet } from './ApplyBottomSheet'

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

function compensationLabel(offer: JobOffer): string | null {
  if (!offer.compensation_type || !offer.compensation_amount) return null
  const unit = offer.compensation_type === 'percentage' ? '%' : '€'
  const freq =
    offer.compensation_frequency === 'monthly'
      ? ' / mois'
      : offer.compensation_frequency === 'weekly'
        ? ' / semaine'
        : offer.compensation_frequency === 'mission'
          ? ' / mission'
          : ''
  return `${offer.compensation_amount}${unit}${freq}`
}

interface Props {
  offer: JobOffer
  entitySlug: string
  entityName: string
  entityAvatarUrl: string | null
  isAuthenticated: boolean
  userEmail: string
  userFirstName: string
  userLastName: string
}

export function PublicJobOfferDetail({
  offer,
  entitySlug,
  entityName,
  entityAvatarUrl,
  isAuthenticated,
  userEmail,
  userFirstName,
  userLastName,
}: Props) {
  const [applyOpen, setApplyOpen] = useState(false)
  const blocks = offer.blocks ? parseHistoryBlocks(offer.blocks) : []
  const comp = compensationLabel(offer)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link
          href={`/${entitySlug}#jobs`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux offres
        </Link>

        <div className="mb-6">
          {entityAvatarUrl ? (
            <img
              src={entityAvatarUrl}
              alt={entityName}
              className="h-12 w-12 rounded-full object-cover mb-3"
            />
          ) : null}
          <p className="text-sm text-neutral-500 mb-1">{entityName}</p>
          <h1 className="text-2xl font-semibold text-neutral-900">{offer.title}</h1>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
              <Briefcase className="h-3 w-3" />
              {CONTRACT_LABELS[offer.contract_type] ?? offer.contract_type}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
              <MapPin className="h-3 w-3" />
              {offer.location_type === 'remote'
                ? LOCATION_LABELS.remote
                : offer.location_text || LOCATION_LABELS[offer.location_type] || 'Sur site'}
            </span>
            {comp ? (
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
                {comp}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 mb-8 text-sm text-neutral-700">
          {blocks.map((block, i) => {
            if (block.type === 'text') {
              return (
                <p key={i} className="whitespace-pre-wrap leading-relaxed">
                  {block.content}
                </p>
              )
            }
            if (block.type === 'list') {
              return (
                <ul key={i} className="list-disc pl-5 space-y-1">
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )
            }
            if (block.type === 'image' && block.images?.[0]) {
              return (
                <img
                  key={i}
                  src={block.images[0].url}
                  alt={block.title ?? ''}
                  className="rounded-lg w-full"
                />
              )
            }
            return null
          })}
        </div>

        <button
          type="button"
          onClick={() => setApplyOpen(true)}
          className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
        >
          Postuler à cette offre
        </button>
      </div>

      <ApplyBottomSheet
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        offerId={offer.id}
        offerTitle={offer.title}
        entityName={entityName}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </div>
  )
}
