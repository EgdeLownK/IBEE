'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit, Trash, ExternalLink, Search, Power, MoreHorizontal } from 'lucide-react'
import { JobOffer } from '@ibee/supabase'
import { JobOfferDialog } from './JobOfferDialog'
import {
  deleteJobOfferAction,
  updateJobOfferAction,
} from '../../../app/dashboard/talent/talent-actions'
import Link from 'next/link'

export function TalentDashboard({ entityId, offers }: { entityId: string; offers: JobOffer[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleCreate = () => {
    setSelectedOffer(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (offer: JobOffer) => {
    setSelectedOffer(offer)
    setIsDialogOpen(true)
  }

  const handleDelete = async (offerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) {
      await deleteJobOfferAction(entityId, offerId)
    }
  }

  const handleToggleStatus = async (offer: JobOffer) => {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active'
    await updateJobOfferAction(entityId, offer.id, { status: newStatus })
  }

  const getContractLabel = (type: string) => {
    switch (type) {
      case 'cdi':
        return 'CDI'
      case 'cdd':
        return 'CDD'
      case 'mission':
        return 'Mission / Freelance'
      default:
        return type
    }
  }

  const getCompensationLabel = (offer: JobOffer) => {
    if (!offer.compensation_type) return null
    const amount = offer.compensation_amount ? offer.compensation_amount.toString() : ''
    const unit = offer.compensation_type === 'percentage' ? '%' : '€'
    let freq = ''
    if (offer.compensation_frequency === 'weekly') freq = ' / semaine'
    if (offer.compensation_frequency === 'monthly') freq = ' / mois'
    if (offer.compensation_frequency === 'mission') freq = ' / mission'

    return `${amount}${unit}${freq}`
  }

  const filteredAndSortedOffers = useMemo(() => {
    return offers
      .filter((offer) => offer.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [offers, searchQuery])

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">Talent</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gérez vos offres d'emploi et recrutements.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" /> Nouvelle offre
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher une offre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-neutral-900 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {filteredAndSortedOffers.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            {searchQuery ? (
              <p>Aucune offre ne correspond à votre recherche.</p>
            ) : (
              <>
                <p>Aucune offre d'emploi pour le moment.</p>
                <button
                  className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900 h-10 px-4 py-2"
                  onClick={handleCreate}
                >
                  Créer votre première offre
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Poste</th>
                  <th className="px-6 py-4 font-medium">Contrat</th>
                  <th className="px-6 py-4 font-medium">Lieu</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredAndSortedOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{offer.title}</div>
                      {getCompensationLabel(offer) && (
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {getCompensationLabel(offer)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{getContractLabel(offer.contract_type)}</td>
                    <td className="px-6 py-4 text-neutral-600">
                      {offer.location_type === 'remote'
                        ? '100% Télétravail'
                        : offer.location_text || 'Sur site'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(offer)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          offer.status === 'active'
                            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100'
                            : 'bg-neutral-50 text-neutral-600 ring-1 ring-inset ring-neutral-500/10 hover:bg-neutral-100'
                        }`}
                        title="Cliquez pour changer le statut"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${offer.status === 'active' ? 'bg-green-600' : 'bg-neutral-400'}`}
                        />
                        {offer.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/talent/${offer.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 h-8 px-3"
                        >
                          Ouvrir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <JobOfferDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entityId={entityId}
        offer={selectedOffer}
      />
    </div>
  )
}
