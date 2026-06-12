'use client'

import { useMemo, useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import { ProfileHeroEditor, type ProfileHeroEntity } from './ProfileHeroEditor'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
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

type Props = {
  data: ProfileStudioData
}

export function ProfileStudio({ data }: Props) {
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
  const [publications, setPublications] = useState<Publication[]>(data.publications)
  const [historyBlocks, setHistoryBlocks] = useState<HistoryBlock[]>(data.historyBlocks)
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>(data.shopProducts)
  const [playlistServices, setPlaylistServices] = useState<PlaylistService[]>(data.playlistServices)
  const [playlistEvents, setPlaylistEvents] = useState<PlaylistEvent[]>(data.playlistEvents)
  const [entity, setEntity] = useState<ProfileHeroEntity>({
    display_name: data.entity.display_name,
    role: data.entity.role,
    bio: data.entity.bio,
    avatar_url: data.entity.avatar_url,
    banner_url: data.entity.banner_url,
    followers_count: data.entity.followers_count,
  })
  const { menuSections, sectionOptions, webEditUrl, productCategories } = data

  const studioData = useMemo(
    () => ({ ...data, publications, historyBlocks, shopProducts, playlistServices, playlistEvents }),
    [data, publications, historyBlocks, shopProducts, playlistServices, playlistEvents]
  )

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

  function handlePublished(pub: Publication) {
    setPublications((prev) => [{ ...pub, publication_media: pub.publication_media ?? [] }, ...prev])
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

        {activeType === 'home' ? (
          <HomeWidgetsPanel data={studioData} onOpenAddContent={openAddContent} />
        ) : (
          <ProfileStudioSections
            activeType={activeType}
            homeWidgets={data.homeWidgets}
            shopProducts={shopProducts}
            playlistServices={playlistServices}
            playlistEvents={playlistEvents}
            publications={publications}
            historyBlocks={historyBlocks}
            faqItems={data.faqItems}
            entitySlug={data.entity.slug}
            entityDisplayName={entity.display_name}
            entityAvatarUrl={entity.avatar_url}
            webBaseUrl={data.webEditUrl}
            dashboardBaseUrl={data.dashboardUrl}
            onEditHistory={() => openHistoryEdit(false)}
            onPublicationUpdated={(pub) =>
              setPublications((prev) => prev.map((p) => (p.id === pub.id ? { ...p, ...pub } : p)))
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
          setShopProducts((prev) => [product, ...prev])
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
          setPlaylistServices((prev) => [service, ...prev])
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
          setPlaylistEvents((prev) => [event, ...prev])
          setActiveType('events')
        }}
      />
    </div>
  )
}
