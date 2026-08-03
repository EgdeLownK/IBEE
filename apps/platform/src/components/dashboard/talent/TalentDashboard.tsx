'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { JobOffer, JobOfferWithMedia, JobSector } from '@ibee/supabase'
import { JobOfferDialog } from './JobOfferDialog'
import { JobOfferRow } from '@/components/public/jobs/JobOfferRow'
import { updateJobOfferAction, deleteJobOfferAction } from '@/app/dashboard/talent/talent-actions'

export function TalentDashboard({
  entityId,
  offers,
  sectors,
}: {
  entityId: string
  offers: JobOfferWithMedia[]
  sectors: JobSector[]
}) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionPendingId, setActionPendingId] = useState<string | null>(null)

  const handleCreate = () => {
    setSelectedOffer(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (offer: JobOffer) => {
    setSelectedOffer(offer)
    setIsDialogOpen(true)
  }

  // talent-actions.ts ne revalide que /dashboard/talent (pas de cache d'une
  // autre route a invalider ici) mais ne met pas a jour le state local :
  // router.refresh() reste necessaire, meme motif que ProfileStudio.tsx et le
  // reste du dashboard (ServicePlanningPanel, EventPlacesPanel, etc.).
  async function handleToggleStatus(offer: JobOffer) {
    const nextStatus = offer.status === 'active' ? 'inactive' : 'active'
    // Repasser inactive -> active archive les candidatures en cours
    // (talent-actions.ts, updateJobOfferAction) - effet de bord serveur non
    // modifiable ici, seulement signale avant declenchement. Pas de message
    // equivalent pour la mise hors ligne : contrairement au studio (qui ne
    // liste que les offres actives), /dashboard/talent affiche toutes les
    // offres - l'offre reste visible ici, aucune disparition a signaler.
    if (
      nextStatus === 'active' &&
      !window.confirm(
        'Remettre cette offre en ligne archivera les candidatures en cours. Continuer ?',
      )
    ) {
      return
    }
    setActionPendingId(offer.id)
    try {
      await updateJobOfferAction(entityId, offer.id, { status: nextStatus })
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de changer le statut de l'offre."
      toast.error(msg)
    } finally {
      setActionPendingId(null)
    }
  }

  async function handleDelete(offer: JobOffer) {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.',
      )
    ) {
      return
    }
    setActionPendingId(offer.id)
    try {
      await deleteJobOfferAction(entityId, offer.id)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de supprimer cette offre.'
      toast.error(msg)
    } finally {
      setActionPendingId(null)
    }
  }

  // Tri actif-d'abord-puis-date INCHANGE : les sections ci-dessous se
  // contentent de partitionner ce tableau deja trie par statut (filter
  // preserve l'ordre relatif), aucun re-tri necessaire par section.
  const filteredAndSortedOffers = useMemo(() => {
    return offers
      .filter((offer) => offer.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [offers, searchQuery])

  const activeOffers = filteredAndSortedOffers.filter((offer) => offer.status === 'active')
  const inactiveOffers = filteredAndSortedOffers.filter((offer) => offer.status === 'inactive')

  function renderOfferRow(offer: JobOfferWithMedia) {
    // Trie cote appelant, meme convention que product_media (pas d'ordre
    // sur relation embarquee cote requete, cf. project-talent.ts).
    const media = [...(offer.entity_job_offer_media ?? [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    )
    return (
      <JobOfferRow
        key={offer.id}
        variant="owner"
        display={offer.status === 'inactive' ? 'compact' : 'full'}
        href={`/dashboard/talent/${offer.id}`}
        title={offer.title}
        contractType={offer.contract_type}
        sectorLabel={offer.job_sectors?.label}
        locationType={offer.location_type}
        locationText={offer.location_text}
        endDate={offer.end_date}
        isCadre={offer.is_cadre}
        compensationAmount={offer.compensation_amount}
        compensationType={offer.compensation_type}
        compensationFrequency={offer.compensation_frequency}
        blocks={offer.blocks}
        media={media[0] ?? null}
        status={offer.status}
        onEdit={() => handleEdit(offer)}
        ctaLabel="Ouvrir"
        adminMenu={{
          status: offer.status,
          pending: actionPendingId === offer.id,
          onEdit: () => handleEdit(offer),
          onToggleStatus: () => handleToggleStatus(offer),
          onDelete: () => handleDelete(offer),
        }}
      />
    )
  }

  return (
    <div className="talent-page flex flex-1 flex-col gap-6">
      {/* items-start + colonne sous 640px : la maquette Claude Design empile
          titre et bouton sur mobile (au lieu de rester cote a cote), voir
          rapport phase 0. */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
            Talent
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Gérez vos offres d&apos;emploi et recrutements.
          </p>
        </div>
        <button onClick={handleCreate} className="btn btn--dark talent-page__create-btn">
          <span className="talent-page__create-btn-icon">
            <Plus className="h-4 w-4" />
          </span>
          Nouvelle offre
        </button>
      </div>

      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-neutral-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher une offre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="talent-page__search-input block w-full pl-10 text-neutral-900 placeholder:text-neutral-400"
        />
      </div>

      {filteredAndSortedOffers.length === 0 ? (
        <div className="p-8 text-center text-neutral-500">
          {searchQuery ? (
            <p>Aucune offre ne correspond à votre recherche.</p>
          ) : (
            <>
              <p>Aucune offre d&apos;emploi pour le moment.</p>
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
        <div className="flex flex-col gap-6">
          {activeOffers.length > 0 && (
            <div className="job-list-section">
              <div className="job-list-section__head">
                <h2 className="job-list-section__title">En ligne</h2>
                <span className="job-list-section__count">({activeOffers.length})</span>
              </div>
              <div className="event-list">{activeOffers.map(renderOfferRow)}</div>
            </div>
          )}
          {inactiveOffers.length > 0 && (
            <div className="job-list-section">
              <div className="job-list-section__head">
                <h2 className="job-list-section__title">Hors ligne</h2>
                <span className="job-list-section__count">({inactiveOffers.length})</span>
              </div>
              {/* gap 8px (vs 12px pour "En ligne") : ecart demande par la
                  maquette Claude Design. Nouvelle classe scopee plutot qu'une
                  modification de .event-list (partagee avec d'autres listes
                  dashboard). */}
              <div className="event-list talent-page__list--compact">
                {inactiveOffers.map(renderOfferRow)}
              </div>
            </div>
          )}
        </div>
      )}

      <JobOfferDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entityId={entityId}
        offer={selectedOffer}
        sectors={sectors}
      />
    </div>
  )
}
