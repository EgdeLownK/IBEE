'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { isSingleInstanceHomeWidget, widgetHasDisplayContent } from '@ibee/shared'
import { homeWidgetLabel } from '@ibee/ui-react/profile'
import {
  createHomeWidgetAction,
  deleteHomeWidgetAction,
  reorderHomeWidgetsAction,
} from '@/app/dashboard/site/home-widgets-actions'
import type { ProfileStudioData } from '@/lib/profile-studio-data'
import { WidgetCard } from './WidgetCard'
import { WidgetBodyDisplay } from './WidgetBodyDisplay'
import { HomeWidgetConfigDialog } from './HomeWidgetConfigDialog'
import { FaqEditDialog } from './FaqEditDialog'
import { BioConfigDialog } from './BioConfigDialog'
import type { HomeWidget, PickerEvent, PickerProduct, PickerService, WidgetPickerData } from './types'

const WIDGET_DEFS = [
  { type: 'widget_shop', label: 'Shop' },
  { type: 'widget_service', label: 'Service' },
  { type: 'widget_event', label: 'Event' },
  { type: 'widget_news', label: 'News' },
  { type: 'widget_bio', label: 'Bio' },
  { type: 'widget_faq', label: 'F.A.Q' },
  { type: 'widget_announcement', label: 'Bannière' },
] as const

function widgetEditMode(type: string): 'config' | 'faq' | 'none' {
  if (type === 'widget_news') return 'none'
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

export function HomeWidgetsPanel({ data, onOpenAddContent }: Props) {
  const [widgets, setWidgets] = useState<HomeWidget[]>(() =>
    [...data.homeWidgets]
      .filter((w) => w.type !== 'widget_history')
      .sort((a, b) => a.position - b.position)
      .map((w) => ({
        id: w.id,
        type: w.type,
        position: w.position,
        config: (w.config ?? {}) as Record<string, unknown>,
      }))
  )
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null)
  const [faqOpen, setFaqOpen] = useState(false)
  const [bioOpen, setBioOpen] = useState(false)
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

  const widgetCountByType = useMemo(() => {
    const acc: Record<string, number> = {}
    widgets.forEach((w) => {
      acc[w.type] = (acc[w.type] ?? 0) + 1
    })
    return acc
  }, [widgets])

  function widgetCardTitle(widget: HomeWidget, index: number): string {
    const base = homeWidgetLabel(widget.type)
    if ((widgetCountByType[widget.type] ?? 0) <= 1) return base
    const sameTypeIndex = widgets.slice(0, index + 1).filter((w) => w.type === widget.type).length
    return `${base} ${sameTypeIndex}`
  }

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
    else if (['widget_shop', 'widget_service', 'widget_event', 'widget_announcement'].includes(type)) {
      setConfigWidgetId(widgetId)
    }
  }

  function persistOrder(next: HomeWidget[]) {
    const order = next.map((w) => w.id)
    startTransition(async () => {
      const result = await reorderHomeWidgetsAction(order)
      if (!result.ok) {
        toast.error(result.error)
        setWidgets(
          [...data.homeWidgets]
            .filter((w) => w.type !== 'widget_history')
            .sort((a, b) => a.position - b.position)
            .map((w) => ({
              id: w.id,
              type: w.type,
              position: w.position,
              config: (w.config ?? {}) as Record<string, unknown>,
            }))
        )
      }
    })
  }

  function moveWidget(id: string, direction: 'up' | 'down') {
    const idx = widgets.findIndex((w) => w.id === id)
    if (idx < 0) return
    const next = direction === 'up' ? idx - 1 : idx + 1
    if (next < 0 || next >= widgets.length) return
    const copy = [...widgets]
    const [item] = copy.splice(idx, 1)
    copy.splice(next, 0, item)
    setWidgets(copy)
    persistOrder(copy)
  }

  function handleAdd(type: string) {
    setAddMenuOpen(false)
    startTransition(async () => {
      const result = await createHomeWidgetAction(type)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setWidgets((prev) => [...prev, result.widget])
      toast.success('Widget ajouté')
      openEditorAfterAdd(type, result.widget.id)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce widget de l\'accueil ?')) return
    const prev = widgets
    setWidgets((w) => w.filter((x) => x.id !== id))
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
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, config } : w)))
  }

  return (
    <div className="profile-section">
      <div className="profile-section__widgets" data-widget-sort-list>
        {widgets.map((widget, index) => {
          const filled = widgetHasDisplayContent(widget, displayCtx)
          const editMode = widgetEditMode(widget.type)
          return (
            <WidgetCard
              key={widget.id}
              title={widgetCardTitle(widget, index)}
              filled={filled}
              canMoveUp={index > 0}
              canMoveDown={index < widgets.length - 1}
              editMode={editMode}
              onMoveUp={() => moveWidget(widget.id, 'up')}
              onMoveDown={() => moveWidget(widget.id, 'down')}
              onEdit={() => openWidgetEditor(widget)}
              onDelete={() => handleDelete(widget.id)}
            >
              <WidgetBodyDisplay
                widget={widget}
                data={panelData}
                webBaseUrl={data.webEditUrl}
                onConfigure={(id) => {
                  const w = widgets.find((x) => x.id === id)
                  if (w) openWidgetEditor(w)
                }}
                onOpenFaq={widget.type === 'widget_faq' ? () => setFaqOpen(true) : undefined}
                onOpenAddContent={widget.type === 'widget_news' ? onOpenAddContent : undefined}
              />
            </WidgetCard>
          )
        })}

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
        onClose={() => setConfigWidgetId(null)}
        onSaved={handleConfigSaved}
      />

      <FaqEditDialog
        open={faqOpen}
        initialItems={faqItems}
        onClose={() => setFaqOpen(false)}
        onSaved={setFaqItems}
      />

      <BioConfigDialog
        open={bioOpen}
        contactInfo={contactInfo}
        onClose={() => setBioOpen(false)}
        onSaved={setContactInfo}
      />
    </div>
  )
}
