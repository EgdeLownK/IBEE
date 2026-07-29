'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    setJobOffers(playlists.jobOffers)
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
    setJobOfferReturnToAddContent(fromAddContent)
    setJobOfferWizardOpen(true)
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
              onTabChange={setActiveType}
            />

            {!playlistsReady ? (
              <StudioPlaylistsSkeleton />
            ) : activeType === 'home' ? (
              <HomeWidgetsPanel data={studioData} onOpenAddContent={openAddContent} />
            ) : activeType === 'jobs' ? (
              <PublicJobOffersList offers={jobOffers} entitySlug={baseData.entity.slug} />
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
        onOpenChange={(isOpen) => {
          setJobOfferWizardOpen(isOpen)
          if (!isOpen && jobOfferReturnToAddContent) {
            setAddContentOpen(true)
            setJobOfferReturnToAddContent(false)
          }
        }}
        entityId={shell.entity.id}
      />
    </div>
  )
}
