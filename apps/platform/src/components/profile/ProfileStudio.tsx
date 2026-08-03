'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ProfileShell,
  getVisibleProfileTabs,
  profileTabContentFromLists,
} from '@ibee/ui-react/profile'
import { ProfileHeroEditor, type ProfileHeroEntity } from './ProfileHeroEditor'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import { useProfileStudioData } from './ProfileStudioDataContext'
import { StudioPlaylistsSkeleton } from './StudioPlaylistsSkeleton'
import { ProfileStudioMenuTabs } from './ProfileStudioMenuTabs'
import { ProfileStudioSections } from './ProfileStudioSections'
import { ProfileStudioEmptyState } from './ProfileStudioEmptyState'
import { HomeWidgetsPanel } from './home-widgets/HomeWidgetsPanel'
import { PublicJobOffersList } from '@/components/public/jobs/PublicJobOffersList'
import { AddContentDialog } from './add-content/AddContentDialog'
import { HistoryEditDialog } from './history/HistoryEditDialog'
import { EventCreateWizard } from './event-create/EventCreateWizard'
import { ProductCreateWizard } from './product-create/ProductCreateWizard'
import { ServiceCreateWizard } from './service-create/ServiceCreateWizard'
import { JobOfferDialog } from '../dashboard/talent/JobOfferDialog'
import { deleteJobOfferAction, updateJobOfferAction } from '@/app/dashboard/talent/talent-actions'
import type { JobOffer as SupabaseJobOffer } from '@ibee/supabase'

type Publication = ProfileStudioData['publications'][number]
type HistoryBlock = ProfileStudioData['historyBlocks'][number]
type ShopProduct = ProfileStudioData['shopProducts'][number]
type PlaylistService = ProfileStudioData['playlistServices'][number]
type PlaylistEvent = ProfileStudioData['playlistEvents'][number]
type JobOffer = ProfileStudioData['jobOffers'][number]

const EMPTY_PLAYLISTS = {
  publications: [] as Publication[],
  jobOffers: [] as JobOffer[],
  shopProducts: [] as ShopProduct[],
  productCategories: [] as ProfileStudioData['productCategories'],
  jobSectors: [] as ProfileStudioData['jobSectors'],
  playlistServices: [] as PlaylistService[],
  playlistEvents: [] as PlaylistEvent[],
}

export function ProfileStudio() {
  const { shell, playlists } = useProfileStudioData()
  const searchParams = useSearchParams()
  const router = useRouter()
  const playlistsReady = playlists != null

  const [activeType, setActiveType] = useState('home')
  const [addContentOpen, setAddContentOpen] = useState(false)
  const [historyEditOpen, setHistoryEditOpen] = useState(false)
  const [historyReturnToAddContent, setHistoryReturnToAddContent] = useState(false)
  const [productWizardOpen, setProductWizardOpen] = useState(false)
  const [productReturnToAddContent, setProductReturnToAddContent] = useState(false)
  const [serviceWizardOpen, setServiceWizardOpen] = useState(false)
  const [serviceReturnToAddContent, setServiceReturnToAddContent] = useState(false)
  const [eventWizardOpen, setEventWizardOpen] = useState(false)
  const [eventReturnToAddContent, setEventReturnToAddContent] = useState(false)
  const [jobOfferWizardOpen, setJobOfferWizardOpen] = useState(false)
  const [jobOfferReturnToAddContent, setJobOfferReturnToAddContent] = useState(false)
  const [selectedJobOffer, setSelectedJobOffer] = useState<JobOffer | null>(null)
  const [jobOfferActionPendingId, setJobOfferActionPendingId] = useState<string | null>(null)
  // Bascule differee vers l'onglet Offres apres publication (voir l'effet
  // plus bas) : createJobOfferAction ne retourne pas l'offre creee (pas de
  // modification de server action ici), donc jobOffers/visibleTabTypes ne se
  // mettent a jour qu'apres le router.refresh() asynchrone de JobOfferDialog.
  // Un setActiveType('jobs') immediat serait annule par le garde-fou
  // ci-dessous si l'onglet n'existait pas encore (premiere offre publiee).
  const [jobOfferPendingTab, setJobOfferPendingTab] = useState(false)
  const [publications, setPublications] = useState<Publication[]>([])
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([])
  const [historyBlocks, setHistoryBlocks] = useState<HistoryBlock[]>(shell.historyBlocks)
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([])
  const [playlistServices, setPlaylistServices] = useState<PlaylistService[]>([])
  const [playlistEvents, setPlaylistEvents] = useState<PlaylistEvent[]>([])
  const [entity, setEntity] = useState<ProfileHeroEntity>({
    display_name: shell.entity.display_name,
    role: shell.entity.role,
    bio: shell.entity.bio,
    avatar_url: shell.entity.avatar_url,
    banner_url: shell.entity.banner_url,
    followers_count: shell.entity.followers_count,
  })

  useEffect(() => {
    if (!playlists) return
    setPublications(playlists.publications)
    // Le profil (studio + visiteur) n'affiche que les offres actives - la
    // reactivation d'une offre hors ligne se fait uniquement depuis
    // /dashboard/talent (Pilotage), jamais depuis cette vue.
    setJobOffers(playlists.jobOffers.filter((o) => o.status === 'active'))
    setShopProducts(playlists.shopProducts)
    setPlaylistServices(playlists.playlistServices)
    setPlaylistEvents(playlists.playlistEvents)
  }, [playlists])

  useEffect(() => {
    if (searchParams.get('wizard') !== 'product') return
    setProductWizardOpen(true)
    setActiveType('shop')
    router.replace('/dashboard/site', { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    if (searchParams.get('wizard') !== 'service') return
    setServiceWizardOpen(true)
    setActiveType('appointments')
    router.replace('/dashboard/site', { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    if (searchParams.get('wizard') !== 'event') return
    setEventWizardOpen(true)
    setActiveType('events')
    router.replace('/dashboard/site', { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    if (searchParams.get('action') !== 'add-content') return
    setAddContentOpen(true)
    router.replace('/dashboard/site', { scroll: false })
  }, [router, searchParams])

  const baseData = useMemo<ProfileStudioData>(
    () => ({
      ...shell,
      ...(playlists ?? EMPTY_PLAYLISTS),
    }),
    [shell, playlists],
  )

  const studioData = useMemo(
    () => ({
      ...baseData,
      publications,
      historyBlocks,
      shopProducts,
      playlistServices,
      playlistEvents,
    }),
    [baseData, publications, historyBlocks, shopProducts, playlistServices, playlistEvents],
  )

  const { menuSections, webEditUrl, productCategories } = baseData

  const tabContent = useMemo(
    () =>
      profileTabContentFromLists({
        publications,
        shopProducts,
        playlistServices,
        playlistEvents,
        historyBlocks,
        jobOffers,
      }),
    [publications, shopProducts, playlistServices, playlistEvents, historyBlocks, jobOffers],
  )

  const visibleTabTypes = useMemo(
    () => new Set<string>(getVisibleProfileTabs('studio', menuSections, tabContent)),
    [menuSections, tabContent],
  )

  // Accueil est toujours "avec contenu" (hasProfileTabContent), donc exclu ici :
  // seuls les types de contenu éditorial comptent pour l'état vide global.
  const hasAnyContent =
    tabContent.publicationsCount > 0 ||
    tabContent.jobOffersCount > 0 ||
    tabContent.historyBlocksCount > 0

  useEffect(() => {
    if (!visibleTabTypes.has(activeType)) setActiveType('home')
  }, [activeType, visibleTabTypes])

  useEffect(() => {
    if (jobOfferPendingTab && visibleTabTypes.has('jobs')) {
      setActiveType('jobs')
      setJobOfferPendingTab(false)
    }
  }, [jobOfferPendingTab, visibleTabTypes])

  const addContentSectionTypes = useMemo(() => new Set(['news', 'history', 'talent']), [])

  function openAddContent() {
    setAddContentOpen(true)
  }

  function openHistoryEdit(fromAddContent = false) {
    setHistoryReturnToAddContent(fromAddContent)
    setHistoryEditOpen(true)
  }

  function openProductWizard(fromAddContent = false) {
    setProductReturnToAddContent(fromAddContent)
    setProductWizardOpen(true)
  }

  function openServiceWizard(fromAddContent = false) {
    setServiceReturnToAddContent(fromAddContent)
    setServiceWizardOpen(true)
  }

  function openEventWizard(fromAddContent = false) {
    setEventReturnToAddContent(fromAddContent)
    setEventWizardOpen(true)
  }

  function openJobOfferWizard(fromAddContent = false) {
    setSelectedJobOffer(null)
    setJobOfferReturnToAddContent(fromAddContent)
    setJobOfferWizardOpen(true)
  }

  function handleEditJobOffer(offerId: string) {
    const offer = jobOffers.find((o) => o.id === offerId)
    if (!offer) return
    setSelectedJobOffer(offer)
    setJobOfferReturnToAddContent(false)
    setJobOfferWizardOpen(true)
  }

  // updateJobOfferAction/deleteJobOfferAction ne revalident que /dashboard/talent
  // (talent-actions.ts) : router.refresh() est necessaire ici pour que la
  // carte se mette a jour dans le studio, meme motif que JobOfferDialog.tsx.
  async function handleToggleJobOfferStatus(offerId: string, currentStatus: 'active' | 'inactive') {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
    if (nextStatus === 'active') {
      // Repasser inactive -> active archive les candidatures en cours
      // (talent-actions.ts, updateJobOfferAction) - effet de bord serveur non
      // modifiable ici, seulement signale avant que l'utilisateur ne le declenche.
      // En pratique jamais atteint depuis le studio (offres actives uniquement,
      // voir le filtre sur jobOffers ci-dessus) - garde-fou defensif conserve
      // au cas ou une offre listee deviendrait inactive entre deux rendus.
      if (
        !window.confirm(
          'Remettre cette offre en ligne archivera les candidatures en cours. Continuer ?',
        )
      ) {
        return
      }
    } else if (
      !window.confirm(
        'Mettre cette offre hors ligne la fera disparaître de cette vue. Elle reste accessible et réactivable depuis Pilotage > Talent.',
      )
    ) {
      return
    }
    setJobOfferActionPendingId(offerId)
    try {
      await updateJobOfferAction(shell.entity.id, offerId, { status: nextStatus })
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de changer le statut de l'offre."
      toast.error(msg)
    } finally {
      setJobOfferActionPendingId(null)
    }
  }

  async function handleDeleteJobOffer(offerId: string) {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.',
      )
    ) {
      return
    }
    setJobOfferActionPendingId(offerId)
    try {
      await deleteJobOfferAction(shell.entity.id, offerId)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de supprimer cette offre.'
      toast.error(msg)
    } finally {
      setJobOfferActionPendingId(null)
    }
  }

  function handlePublished(pub: {
    id: string
    title: string
    slug: string
    content: string | null
    created_at: string
    published_at: string | null
    status?: string
    publication_media?: unknown[]
  }) {
    const status: Publication['status'] = pub.status === 'scheduled' ? 'scheduled' : 'published'
    setPublications((prev) => [
      {
        ...pub,
        comments_count: 0,
        entity_id: shell.entity.id,
        scheduled_for: null,
        updated_at: pub.created_at,
        publication_media: (pub.publication_media ?? []) as Publication['publication_media'],
        status,
      },
      ...prev,
    ])
    setActiveType('news')
  }

  return (
    <div className="profile-page">
      <ProfileShell>
        <ProfileHeroEditor
          entity={entity}
          onAddContent={openAddContent}
          onEntityChange={(patch) => setEntity((prev) => ({ ...prev, ...patch }))}
        />

        {playlistsReady && !hasAnyContent ? (
          <ProfileStudioEmptyState />
        ) : (
          <>
            <ProfileStudioMenuTabs
              menuSections={menuSections}
              tabContent={tabContent}
              activeType={activeType}
              onTabChange={(type) => {
                // L'utilisateur choisit lui-meme un onglet : la bascule
                // differee vers "jobs" (voir jobOfferPendingTab) ne doit plus
                // le contredire une fois la publication rafraichie.
                setJobOfferPendingTab(false)
                setActiveType(type)
              }}
            />

            {!playlistsReady ? (
              <StudioPlaylistsSkeleton />
            ) : activeType === 'home' ? (
              <HomeWidgetsPanel data={studioData} onOpenAddContent={openAddContent} />
            ) : activeType === 'jobs' ? (
              <PublicJobOffersList
                offers={jobOffers}
                entitySlug={baseData.entity.slug}
                adminActions={{
                  pendingId: jobOfferActionPendingId,
                  onEdit: handleEditJobOffer,
                  onToggleStatus: handleToggleJobOfferStatus,
                  onDelete: handleDeleteJobOffer,
                }}
              />
            ) : (
              <ProfileStudioSections
                activeType={activeType}
                homeWidgets={baseData.homeWidgets}
                shopProducts={shopProducts}
                playlistServices={playlistServices}
                playlistEvents={playlistEvents}
                publications={publications}
                historyBlocks={historyBlocks}
                faqItems={baseData.faqItems}
                productCategories={baseData.productCategories}
                entitySlug={baseData.entity.slug}
                entityDisplayName={entity.display_name}
                entityAvatarUrl={entity.avatar_url}
                webBaseUrl={baseData.webEditUrl}
                dashboardBaseUrl={baseData.dashboardUrl}
                onEditHistory={() => openHistoryEdit(false)}
                onPublicationUpdated={(pub) =>
                  setPublications((prev) =>
                    prev.map((p) =>
                      p.id === pub.id
                        ? {
                            ...p,
                            title: pub.title,
                            slug: pub.slug,
                            content: pub.content,
                            published_at: pub.published_at ?? p.published_at,
                            status:
                              pub.status === 'published' || pub.status === 'scheduled'
                                ? pub.status
                                : p.status,
                            publication_media: Array.isArray(pub.publication_media)
                              ? (pub.publication_media as Publication['publication_media'])
                              : p.publication_media,
                          }
                        : p,
                    ),
                  )
                }
                onPublicationDeleted={(id) =>
                  setPublications((prev) => prev.filter((p) => p.id !== id))
                }
                onEventDeleted={(id) =>
                  setPlaylistEvents((prev) => prev.filter((ev) => ev.id !== id))
                }
              />
            )}
          </>
        )}
      </ProfileShell>

      <AddContentDialog
        open={addContentOpen}
        displayName={entity.display_name}
        avatarUrl={entity.avatar_url}
        activeSectionTypes={addContentSectionTypes}
        webEditUrl={webEditUrl}
        onClose={() => setAddContentOpen(false)}
        onPublished={handlePublished}
        onOpenHistory={() => openHistoryEdit(true)}
        onOpenProduct={() => openProductWizard(true)}
        onOpenService={() => openServiceWizard(true)}
        onOpenEvent={() => openEventWizard(true)}
        onOpenTalent={() => openJobOfferWizard(true)}
      />

      <HistoryEditDialog
        open={historyEditOpen}
        initialBlocks={historyBlocks}
        returnToAddContent={historyReturnToAddContent}
        onClose={() => {
          setHistoryEditOpen(false)
          setHistoryReturnToAddContent(false)
        }}
        onReturnToAddContent={() => setAddContentOpen(true)}
        onSaved={(blocks) => setHistoryBlocks(blocks)}
      />

      <ProductCreateWizard
        open={productWizardOpen}
        productCategories={productCategories.map((c) => ({ id: c.id, name: c.name }))}
        returnToAddContent={productReturnToAddContent}
        onClose={() => {
          setProductWizardOpen(false)
          setProductReturnToAddContent(false)
        }}
        onReturnToAddContent={() => setAddContentOpen(true)}
        onCreated={(product) => {
          setShopProducts((prev) => [
            {
              ...product,
              image_url: product.image_url ?? '',
              image_urls: product.image_url ? [product.image_url] : [],
            },
            ...prev,
          ])
          setActiveType('shop')
        }}
      />

      <ServiceCreateWizard
        open={serviceWizardOpen}
        returnToAddContent={serviceReturnToAddContent}
        onClose={() => {
          setServiceWizardOpen(false)
          setServiceReturnToAddContent(false)
        }}
        onReturnToAddContent={() => setAddContentOpen(true)}
        onCreated={(service) => {
          setPlaylistServices((prev) => [
            {
              ...service,
              image_url: service.image_url ?? '',
              image_urls: service.image_url ? [service.image_url] : [],
              location_type: service.location_type as PlaylistService['location_type'],
            },
            ...prev,
          ])
          setActiveType('appointments')
        }}
      />

      <EventCreateWizard
        open={eventWizardOpen}
        returnToAddContent={eventReturnToAddContent}
        onClose={() => {
          setEventWizardOpen(false)
          setEventReturnToAddContent(false)
        }}
        onReturnToAddContent={() => setAddContentOpen(true)}
        onCreated={(event) => {
          setPlaylistEvents((prev) => [
            {
              ...event,
              image_url: event.image_url ?? '',
              image_urls: event.image_url ? [event.image_url] : [],
            },
            ...prev,
          ])
          setActiveType('events')
        }}
      />

      <JobOfferDialog
        open={jobOfferWizardOpen}
        sectors={playlists?.jobSectors ?? []}
        // Cast volontaire : JobOfferDialog attend le JobOffer complet
        // (@ibee/supabase, toutes les colonnes entity_job_offers), mais ne lit
        // en pratique que les champs deja presents sur ProfileStudioData
        // (voir profile-studio-data.ts, meme motif TS2742 documente la-bas) -
        // repartir sur le type Supabase brut ici recreerait ce probleme.
        offer={selectedJobOffer as unknown as SupabaseJobOffer | null}
        onOpenChange={(isOpen, reason, meta) => {
          setJobOfferWizardOpen(isOpen)
          if (isOpen) return
          setJobOfferReturnToAddContent(false)
          setSelectedJobOffer(null)
          // Succes -> tout se ferme, jamais de retour sur AddContentDialog
          // (meme motif que ProductCreateWizard/ServiceCreateWizard/EventCreateWizard :
          // onCreated puis onClose sans passer par onReturnToAddContent).
          if (reason !== 'success' && jobOfferReturnToAddContent) {
            setAddContentOpen(true)
          }
          // Creation + publication active uniquement -> bascule differee sur
          // l'onglet Offres (voir jobOfferPendingTab). Brouillon ou edition :
          // aucun changement d'onglet.
          if (reason === 'success' && meta?.isCreate && meta.status === 'active') {
            setJobOfferPendingTab(true)
          }
        }}
        entityId={shell.entity.id}
      />
    </div>
  )
}
