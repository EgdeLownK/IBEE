'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  isSingleInstanceHomeWidget,
  homeWidgetCarouselSectionLink,
  isHomeWidgetFeaturedSingle,
  parseHighlightConfig,
  sortHomeWidgetsByFixedOrder,
  widgetHasDisplayContent,
} from '@ibee/shared'
import { homeWidgetLabel } from '@ibee/ui-react/profile'
import { createHomeWidgetAction, deleteHomeWidgetAction } from '@/app/dashboard/site/home-widgets-actions'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import { WidgetCard } from './WidgetCard'
import { WidgetAdminMenu } from './WidgetAdminMenu'
import { WidgetBodyDisplay } from './WidgetBodyDisplay'
import { HomeWidgetConfigDialog } from './HomeWidgetConfigDialog'
import { FaqEditDialog } from './FaqEditDialog'
import { BioConfigDialog } from './BioConfigDialog'
import type { HomeWidget, PickerEvent, PickerProduct, PickerService, WidgetPickerData } from './types'

const WIDGET_DEFS = [
  { type: 'widget_highlight', label: 'Mise en avant' },
  { type: 'widget_carousel', label: 'Carrousel' },
  { type: 'widget_faq', label: 'F.A.Q' },
  { type: 'widget_bio', label: 'Bio' },
] as const

function mapStudioWidgets(raw: ProfileStudioData['homeWidgets']): HomeWidget[] {
  return sortHomeWidgetsByFixedOrder(
    [...raw]
      .map((w) => ({
        id: w.id,
        type: w.type,
        position: w.position,
        config: (w.config ?? {}) as Record<string, unknown>,
      }))
  )
}

function relativePublicationTag(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

function widgetEditMode(type: string): 'config' | 'faq' | 'none' {
  if (type === 'widget_faq') return 'faq'
  return 'config'
}

function productPickerTags(
  p: ProfileStudioData['shopProducts'][number],
  categories: ProfileStudioData['productCategories']
): string[] {
  const tags: string[] = []
  tags.push(p.type === 'digital' ? 'Numérique' : 'Physique')
  const cat = categories.find((c) => c.id === p.category_id)
  if (cat?.name) tags.push(cat.name)
  if (p.price_cents != null) {
    try {
      tags.push(
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.currency ?? 'EUR' }).format(
          p.price_cents / 100
        )
      )
    } catch {
      tags.push(`${(p.price_cents / 100).toFixed(2)} €`)
    }
  }
  if (p.status && p.status !== 'published') tags.push(p.status === 'draft' ? 'Brouillon' : p.status)
  return tags
}

function servicePickerTags(s: ProfileStudioData['playlistServices'][number]): string[] {
  const tags: string[] = []
  tags.push(`${s.duration_minutes} min`)
  const loc: Record<string, string> = { video: 'Visio', in_person: 'Sur place', phone: 'Téléphone' }
  tags.push(loc[s.location_type] ?? 'Visio')
  return tags
}

type Props = {
  data: ProfileStudioData
  onOpenAddContent?: () => void
}

import { SharedHomeWidgetsList } from './SharedHomeWidgetsList'

export function HomeWidgetsPanel({ data, onOpenAddContent }: Props) {
  const [widgets, setWidgets] = useState<HomeWidget[]>(() => mapStudioWidgets(data.homeWidgets))
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState(false)
  const [bioOpen, setBioOpen] = useState(false)
  const [newWidgetId, setNewWidgetId] = useState<string | null>(null)
  const justSavedWidgetIds = useRef<Set<string>>(new Set())
  const [faqItems, setFaqItems] = useState(data.faqItems)
  const [contactInfo, setContactInfo] = useState(data.contactInfo)
  const [pending, startTransition] = useTransition()

  const panelData = useMemo(
    () => ({ ...data, faqItems, contactInfo }),
    [data, faqItems, contactInfo]
  )

  const existingSingleInstanceTypes = useMemo(
    () => new Set(widgets.filter((w) => isSingleInstanceHomeWidget(w.type)).map((w) => w.type)),
    [widgets]
  )

  const pickerData: WidgetPickerData = useMemo(
    () => ({
      products: data.shopProducts.map(
        (p): PickerProduct => ({
          id: p.id,
          title: p.title,
          tags: productPickerTags(p, data.productCategories),
          category_id: p.category_id,
        })
      ),
      categories: data.productCategories.map((c) => ({ id: c.id, name: c.name })),
      services: data.playlistServices.map(
        (s): PickerService => ({
          id: s.id,
          title: s.title,
          tags: servicePickerTags(s),
        })
      ),
      events: data.playlistEvents.map(
        (e): PickerEvent => ({
          id: e.id,
          title: e.title,
        })
      ),
      publications: data.publications
        .filter((p) => p.published_at)
        .map((p) => ({
          id: p.id,
          title: p.title,
          tags: [relativePublicationTag(p.published_at!)],
        })),
    }),
    [data]
  )

  const configWidget =
    widgets.find((w) => w.id === configWidgetId && w.type !== 'widget_bio' && w.type !== 'widget_faq') ??
    null

  const displayCtx = {
    products: panelData.shopProducts,
    appointmentTypes: panelData.playlistServices,
    events: panelData.playlistEvents,
    publications: panelData.publications,
    faqItems: panelData.faqItems,
    contactInfo: panelData.contactInfo,
  }

  function openWidgetEditor(widget: HomeWidget) {
    if (widget.type === 'widget_faq') setFaqOpen(true)
    else if (widget.type === 'widget_bio') setBioOpen(true)
    else setConfigWidgetId(widget.id)
  }

  function openEditorAfterAdd(type: string, widgetId: string) {
    if (type === 'widget_faq') setFaqOpen(true)
    else if (type === 'widget_bio') setBioOpen(true)
    else if (['widget_highlight', 'widget_carousel'].includes(type)) {
      setConfigWidgetId(widgetId)
    }
  }

  function handleAdd(type: string) {
    setAddMenuOpen(false)
    startTransition(async () => {
      const result = await createHomeWidgetAction(type)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setWidgets((prev) => sortHomeWidgetsByFixedOrder([...prev, result.widget]))
      setNewWidgetId(result.widget.id)
      openEditorAfterAdd(type, result.widget.id)
    })
  }

  function removeWidget(id: string) {
    setWidgets((prev) => sortHomeWidgetsByFixedOrder(prev.filter((x) => x.id !== id)))
    startTransition(async () => {
      await deleteHomeWidgetAction(id)
    })
  }

  function closeEditorDialog() {
    const pendingId = newWidgetId
    if (pendingId) {
      const wasJustSaved = justSavedWidgetIds.current.delete(pendingId)
      const widget = widgets.find((w) => w.id === pendingId)
      if (!wasJustSaved && widget && !widgetHasDisplayContent(widget, displayCtx)) {
        removeWidget(pendingId)
      }
      setNewWidgetId(null)
    }
    setConfigWidgetId(null)
    setFaqOpen(false)
    setBioOpen(false)
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce widget de l\'accueil ?')) return
    const prev = widgets
    const next = sortHomeWidgetsByFixedOrder(widgets.filter((x) => x.id !== id))
    setWidgets(next)
    startTransition(async () => {
      const result = await deleteHomeWidgetAction(id)
      if (!result.ok) {
        toast.error(result.error)
        setWidgets(prev)
      } else {
        toast.success('Widget supprimé')
      }
    })
  }

  function handleConfigSaved(widgetId: string, config: Record<string, unknown>) {
    justSavedWidgetIds.current.add(widgetId)
    setWidgets((prev) =>
      sortHomeWidgetsByFixedOrder(prev.map((w) => (w.id === widgetId ? { ...w, config } : w)))
    )
    setNewWidgetId((prev) => (prev === widgetId ? null : prev))
  }

  return (
    <div className="profile-section">
      <div className="profile-section__widgets">
        <SharedHomeWidgetsList
          widgets={widgets}
          data={panelData}
          webBaseUrl={data.webEditUrl}
          isOwner={true}
          onEditWidget={openWidgetEditor}
          onDeleteWidget={handleDelete}
        />

        <div className="home-widgets__add">
          <div className="relative">
            <button
              type="button"
              className="home-widgets__add-btn"
              disabled={pending}
              aria-expanded={addMenuOpen}
              onClick={() => setAddMenuOpen((v) => !v)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Ajouter un widget</span>
            </button>
            {addMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Fermer"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="hw-menu z-20">
                  <p className="hw-menu__label">Choisir un widget</p>
                  {WIDGET_DEFS.map((w) => {
                    const single = isSingleInstanceHomeWidget(w.type)
                    const already = single && existingSingleInstanceTypes.has(w.type)
                    return (
                      <button
                        key={w.type}
                        type="button"
                        className="hw-menu__item"
                        disabled={already || pending}
                        title={already ? 'Ce widget est déjà sur l\'accueil' : undefined}
                        onClick={() => handleAdd(w.type)}
                      >
                        <Plus className="h-4 w-4 text-neutral-500" />
                        <span>{w.label}</span>
                        {already && <span className="hw-menu__soon">Ajouté</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <HomeWidgetConfigDialog
        widget={configWidget}
        pickerData={pickerData}
        onClose={closeEditorDialog}
        onSaved={handleConfigSaved}
      />

      <FaqEditDialog
        open={faqOpen}
        initialItems={faqItems}
        onClose={closeEditorDialog}
        onSaved={(items) => {
          setFaqItems(items)
          if (newWidgetId) justSavedWidgetIds.current.add(newWidgetId)
          setNewWidgetId(null)
        }}
      />

      <BioConfigDialog
        open={bioOpen}
        contactInfo={contactInfo}
        onClose={closeEditorDialog}
        onSaved={(info) => {
          setContactInfo(info)
          if (newWidgetId) justSavedWidgetIds.current.add(newWidgetId)
          setNewWidgetId(null)
        }}
      />
    </div>
  )
}
