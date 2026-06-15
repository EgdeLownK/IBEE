'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import { ProfileHeroEditor, type ProfileHeroEntity } from './ProfileHeroEditor'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import { useProfileStudioData } from './ProfileStudioDataContext'
import { StudioPlaylistsSkeleton } from './StudioPlaylistsSkeleton'
import { ProfileStudioMenuTabs } from './ProfileStudioMenuTabs'
import { ProfileStudioSections } from './ProfileStudioSections'
import { HomeWidgetsPanel } from './home-widgets/HomeWidgetsPanel'
import { AddContentDialog } from './add-content/AddContentDialog'
import { HistoryEditDialog } from './history/HistoryEditDialog'
import { EventCreateWizard } from './event-create/EventCreateWizard'
import { ProductCreateWizard } from './product-create/ProductCreateWizard'
import { ServiceCreateWizard } from './service-create/ServiceCreateWizard'

type Publication = ProfileStudioData['publications'][number]
type HistoryBlock = ProfileStudioData['historyBlocks'][number]
type ShopProduct = ProfileStudioData['shopProducts'][number]
type PlaylistService = ProfileStudioData['playlistServices'][number]
type PlaylistEvent = ProfileStudioData['playlistEvents'][number]

const EMPTY_PLAYLISTS = {
  publications: [] as Publication[],
  shopProducts: [] as ShopProduct[],
  productCategories: [] as ProfileStudioData['productCategories'],
  playlistServices: [] as PlaylistService[],
  playlistEvents: [] as PlaylistEvent[],
}

export function ProfileStudio() {
  const { shell, playlists } = useProfileStudioData()
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
  const [publications, setPublications] = useState<Publication[]>([])
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
    setShopProducts(playlists.shopProducts)
    setPlaylistServices(playlists.playlistServices)
    setPlaylistEvents(playlists.playlistEvents)
  }, [playlists])

  const baseData = useMemo<ProfileStudioData>(
    () => ({
      ...shell,
      ...(playlists ?? EMPTY_PLAYLISTS),
    }),
    [shell, playlists]
  )

  const studioData = useMemo(
    () => ({ ...baseData, publications, historyBlocks, shopProducts, playlistServices, playlistEvents }),
    [baseData, publications, historyBlocks, shopProducts, playlistServices, playlistEvents]
  )

  const { menuSections, sectionOptions, webEditUrl, productCategories } = baseData

  const activeSectionTypes = useMemo(() => {
    const set = new Set<string>(['home'])
    menuSections.forEach((s) => set.add(s.type))
    sectionOptions.filter((o) => o.active).forEach((o) => set.add(o.type))
    return set
  }, [menuSections, sectionOptions])

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
    const status: Publication['status'] =
      pub.status === 'scheduled' ? 'scheduled' : 'published'
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

        <ProfileStudioMenuTabs
          menuSections={menuSections}
          sectionOptions={sectionOptions}
          activeType={activeType}
          onTabChange={setActiveType}
        />

        {!playlistsReady ? (
          <StudioPlaylistsSkeleton />
        ) : activeType === 'home' ? (
          <HomeWidgetsPanel data={studioData} onOpenAddContent={openAddContent} />
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
                    : p
                )
              )
            }
            onPublicationDeleted={(id) => setPublications((prev) => prev.filter((p) => p.id !== id))}
          />
        )}
      </ProfileShell>

      <AddContentDialog
        open={addContentOpen}
        displayName={entity.display_name}
        avatarUrl={entity.avatar_url}
        activeSectionTypes={activeSectionTypes}
        webEditUrl={webEditUrl}
        onClose={() => setAddContentOpen(false)}
        onPublished={handlePublished}
        onOpenHistory={() => openHistoryEdit(true)}
        onOpenProduct={() => openProductWizard(true)}
        onOpenService={() => openServiceWizard(true)}
        onOpenEvent={() => openEventWizard(true)}
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
            },
            ...prev,
          ])
          setActiveType('events')
        }}
      />
    </div>
  )
}
