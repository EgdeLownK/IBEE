'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import {
  CAROUSEL_SELECTION_LABELS,
  CAROUSEL_SOURCE_EMPTY_LABELS,
  CAROUSEL_SOURCE_KINDS,
  carouselSelectionModeHasContent,
  carouselSelectionModesForSource,
  carouselSourceHasContent,
  carouselSourceLimit,
  carouselSourceNeedsContentStep,
  categoriesWithProducts,
  defaultCarouselSelectionMode,
  firstAvailableCarouselSelectionMode,
  firstAvailableCarouselSource,
  firstAvailableHighlightKind,
  highlightKindHasContent,
  normalizeWidgetConfig,
  parseCarouselConfig,
  parseHighlightConfig,
  type CarouselSelectionMode,
  type CarouselSourceKind,
  type HighlightContentKind,
} from '@ibee/shared'
import { updateHomeWidgetConfigAction } from '@/app/dashboard/site/home-widgets-actions'
import type { HomeWidget, WidgetPickerData } from './types'

const CAROUSEL_SOURCE_STEP_LABELS: Record<CarouselSourceKind, string> = {
  shop_category: 'Shop',
  services: 'Service',
  events: 'Event',
  news: 'Actu',
}

const CAROUSEL_SOURCE_STEP_DESC: Record<CarouselSourceKind, string> = {
  shop_category: 'Produits de la boutique',
  services: 'Prestations réservables',
  events: 'Événements à venir uniquement',
  news: 'Dernières publications',
}

const KIND_LABELS: Record<HighlightContentKind, string> = {
  product: 'Produit',
  service: 'Service',
  event: 'Événement',
  news: 'Actualité',
}

type PickerRow = {
  kind: HighlightContentKind
  id: string
  title: string
  tags: string[]
}

interface Props {
  widget: HomeWidget | null
  pickerData: WidgetPickerData
  onClose: () => void
  onSaved: (widgetId: string, config: Record<string, unknown>) => void
}

export function HomeWidgetConfigDialog({ widget, pickerData, onClose, onSaved }: Props) {
  const [pending, startTransition] = useTransition()
  const open = widget != null

  const initial = useMemo(() => {
    if (!widget) return null
    const cfg = normalizeWidgetConfig(widget.config)
    if (widget.type === 'widget_highlight') {
      const parsed = parseHighlightConfig(cfg)
      return {
        highlightKind: parsed?.item.kind ?? ('product' as HighlightContentKind),
        highlightId: parsed?.item.id ?? '',
        contentSearch: '',
      }
    }
    if (widget.type === 'widget_carousel') {
      const parsed = parseCarouselConfig(cfg)
      const sourceKind = parsed?.source_kind ?? ('services' as CarouselSourceKind)
      const defaultMode = defaultCarouselSelectionMode(sourceKind)
      return {
        sourceKind,
        categoryId:
          parsed?.category_id ?? categoriesWithProducts(pickerData)[0]?.id ?? '',
        selectionMode: parsed?.selection_mode ?? defaultMode ?? ('popular' as CarouselSelectionMode),
      }
    }
    return null
  }, [widget, pickerData.categories])

  const [highlightKind, setHighlightKind] = useState<HighlightContentKind>('product')
  const [highlightId, setHighlightId] = useState('')
  const [contentSearch, setContentSearch] = useState('')
  const [sourceKind, setSourceKind] = useState<CarouselSourceKind>('services')
  const [categoryId, setCategoryId] = useState('')
  const [selectionMode, setSelectionMode] = useState<CarouselSelectionMode>('popular')
  const [carouselStep, setCarouselStep] = useState<1 | 2>(1)

  useEffect(() => {
    if (!initial) return
    if ('highlightKind' in initial) {
      setHighlightKind(initial.highlightKind as HighlightContentKind)
      setHighlightId(initial.highlightId as string)
      setContentSearch('')
    }
    if ('sourceKind' in initial) {
      setSourceKind(initial.sourceKind as CarouselSourceKind)
      setCategoryId(initial.categoryId as string)
      setSelectionMode(initial.selectionMode as CarouselSelectionMode)
    }
  }, [initial])

  useEffect(() => {
    if (!open) {
      setCarouselStep(1)
      return
    }
    setCarouselStep(1)
  }, [open, widget?.id])

  useEffect(() => {
    if (!open || !widget) return
    const cfg = normalizeWidgetConfig(widget.config)
    if (widget.type === 'widget_carousel' && !parseCarouselConfig(cfg)) {
      const first = firstAvailableCarouselSource(pickerData)
      if (first) {
        setSourceKind(first)
        const mode = firstAvailableCarouselSelectionMode(first, pickerData)
        if (mode) setSelectionMode(mode)
        const cats = categoriesWithProducts(pickerData)
        if (mode === 'category' && cats[0]) setCategoryId(cats[0].id)
      }
    }
    if (widget.type === 'widget_highlight' && !parseHighlightConfig(cfg)) {
      const first = firstAvailableHighlightKind(pickerData)
      if (first) {
        setHighlightKind(first)
        setHighlightId('')
      }
    }
  }, [open, widget, pickerData])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const pickerRows = useMemo((): PickerRow[] => {
    const q = contentSearch.trim().toLowerCase()
    const match = (title: string) => !q || title.toLowerCase().includes(q)
    const rows: PickerRow[] = []
    if (highlightKind === 'product') {
      pickerData.products.forEach((p) => {
        if (match(p.title)) rows.push({ kind: 'product', id: p.id, title: p.title, tags: p.tags })
      })
    } else if (highlightKind === 'service') {
      pickerData.services.forEach((s) => {
        if (match(s.title)) rows.push({ kind: 'service', id: s.id, title: s.title, tags: s.tags })
      })
    } else if (highlightKind === 'event') {
      pickerData.events.forEach((e) => {
        if (match(e.title)) rows.push({ kind: 'event', id: e.id, title: e.title, tags: [] })
      })
    } else {
      pickerData.publications.forEach((n) => {
        if (match(n.title)) rows.push({ kind: 'news', id: n.id, title: n.title, tags: n.tags })
      })
    }
    return rows
  }, [contentSearch, highlightKind, pickerData])

  const shopCategoriesWithProducts = useMemo(
    () => categoriesWithProducts(pickerData),
    [pickerData]
  )

  if (!widget) return null
  const activeWidget = widget

  function buildCarouselConfig(): Record<string, unknown> | null {
    if (!carouselSourceHasContent(sourceKind, pickerData)) return null
    if (sourceKind === 'shop_category') {
      if (!carouselSelectionModeHasContent(sourceKind, selectionMode, pickerData)) return null
      if (selectionMode === 'category' && !categoryId) return null
      if (
        selectionMode === 'category' &&
        !shopCategoriesWithProducts.some((c) => c.id === categoryId)
      ) {
        return null
      }
      return {
        mode: 'collection',
        source_kind: 'shop_category',
        selection_mode: selectionMode,
        ...(selectionMode === 'category' ? { category_id: categoryId } : {}),
        limit: carouselSourceLimit('shop_category'),
      }
    }
    if (sourceKind === 'services') {
      if (!carouselSelectionModeHasContent(sourceKind, selectionMode, pickerData)) return null
      const mode = selectionMode === 'top_rated' ? 'top_rated' : 'popular'
      return {
        mode: 'collection',
        source_kind: 'services',
        selection_mode: mode,
        limit: carouselSourceLimit('services'),
      }
    }
    return {
      mode: 'collection',
      source_kind: sourceKind,
      limit: carouselSourceLimit(sourceKind),
    }
  }

  function buildConfig(): Record<string, unknown> | null {
    if (activeWidget.type === 'widget_highlight') {
      if (!highlightId) return null
      return { mode: 'single', item: { kind: highlightKind, id: highlightId } }
    }
    if (activeWidget.type === 'widget_carousel') {
      return buildCarouselConfig()
    }
    return null
  }

  function persistConfig(config: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateHomeWidgetConfigAction(activeWidget.id, config)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onSaved(activeWidget.id, result.config)
      toast.success('Widget mis à jour')
      onClose()
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const config = buildConfig()
    if (!config) {
      toast.error('Complète la configuration avant d\'enregistrer.')
      return
    }
    persistConfig(config)
  }

  function handleCarouselContinue() {
    if (!carouselSourceHasContent(sourceKind, pickerData)) {
      toast.error('Ce type de contenu n’est pas disponible.')
      return
    }
    if (!carouselSourceNeedsContentStep(sourceKind)) {
      const config = buildCarouselConfig()
      if (!config) {
        toast.error('Impossible d’enregistrer ce carrousel.')
        return
      }
      persistConfig(config)
      return
    }
    const nextMode = firstAvailableCarouselSelectionMode(sourceKind, pickerData)
    if (!nextMode) {
      toast.error('Aucun contenu disponible pour ce type.')
      return
    }
    setSelectionMode(nextMode)
    if (nextMode === 'category') {
      const firstCategory = shopCategoriesWithProducts[0]
      if (firstCategory) setCategoryId(firstCategory.id)
    }
    setCarouselStep(2)
  }

  const configurable = activeWidget.type === 'widget_highlight' || activeWidget.type === 'widget_carousel'
  const selectionModes = carouselSelectionModesForSource(sourceKind)
  const isCarousel = activeWidget.type === 'widget_carousel'
  const carouselNeedsStep2 = isCarousel && carouselSourceNeedsContentStep(sourceKind)
  const carouselSourceAvailable = carouselSourceHasContent(sourceKind, pickerData)
  const carouselSelectionAvailable = carouselSelectionModeHasContent(
    sourceKind,
    selectionMode,
    pickerData
  )
  const carouselCategoryValid =
    selectionMode !== 'category' ||
    (categoryId !== '' && shopCategoriesWithProducts.some((c) => c.id === categoryId))
  const canSaveCarouselStep1 = carouselSourceAvailable
  const canSaveCarouselStep2 =
    carouselSourceAvailable && carouselSelectionAvailable && carouselCategoryValid
  const canSaveHighlight =
    highlightKindHasContent(highlightKind, pickerData) && highlightId.length > 0
  const anyCarouselSourceAvailable = CAROUSEL_SOURCE_KINDS.some((kind) =>
    carouselSourceHasContent(kind, pickerData)
  )

  const dialogTitle = isCarousel
    ? carouselStep === 1
      ? 'Carrousel — type de contenu'
      : `Carrousel — ${CAROUSEL_SOURCE_STEP_LABELS[sourceKind]}`
    : 'Configurer le widget'

  return (
    <div className="hw-config" role="presentation">
      <button type="button" className="hw-config__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="hw-config__panel" role="dialog" aria-modal="true" aria-labelledby="hw-config-title">
        <header className="hw-config__head">
          <h2 id="hw-config-title" className="hw-config__title">
            {dialogTitle}
          </h2>
          <button type="button" className="hw-config__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <form className="hw-config__form" onSubmit={handleSubmit}>
          {!configurable && (
            <p className="hw-config__hint">
              Ce widget se configure automatiquement ou via un autre écran (FAQ, bannière…).
            </p>
          )}

          {activeWidget.type === 'widget_highlight' && (
            <div className="hw-config__section">
              <p className="hw-config__hint">
                Choisis <strong>un contenu</strong> à mettre en avant (produit, service, événement ou actualité).
              </p>
              <fieldset className="hw-config__fieldset">
                {(['product', 'service', 'event', 'news'] as const).map((kind) => {
                  const available = highlightKindHasContent(kind, pickerData)
                  return (
                    <label
                      key={kind}
                      className={`hw-config__radio${available ? '' : ' is-disabled'}`}
                    >
                      <input
                        type="radio"
                        name="highlight_kind"
                        checked={highlightKind === kind}
                        disabled={!available}
                        onChange={() => {
                          setHighlightKind(kind)
                          setHighlightId('')
                        }}
                      />
                      <span>{KIND_LABELS[kind]}</span>
                    </label>
                  )
                })}
              </fieldset>
              <div className="hw-config__field">
                <input
                  type="search"
                  className="hw-config__entity-search"
                  placeholder={`Rechercher un ${KIND_LABELS[highlightKind].toLowerCase()}…`}
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                />
                <div className="hw-config__entity-list" role="listbox">
                  {pickerRows.map((row) => (
                    <button
                      key={`${row.kind}-${row.id}`}
                      type="button"
                      role="option"
                      aria-selected={highlightId === row.id}
                      className={`hw-config__entity-item${highlightId === row.id ? ' is-selected' : ''}`}
                      onClick={() => setHighlightId(row.id)}
                    >
                      <span className="hw-config__entity-title">{row.title}</span>
                      {row.tags.length > 0 && (
                        <span className="hw-config__entity-tags">{row.tags.join(' · ')}</span>
                      )}
                    </button>
                  ))}
                  {pickerRows.length === 0 && (
                    <p className="hw-config__entity-empty">Aucun contenu ne correspond.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCarousel && carouselStep === 1 && (
            <div className="hw-config__section">
              <p className="hw-config__step">Étape 1 sur 2</p>
              <p className="hw-config__hint">Quel type de contenu afficher dans ce carrousel ?</p>
              {!anyCarouselSourceAvailable && (
                <p className="hw-config__entity-empty">
                  Aucun contenu disponible pour créer un carrousel.
                </p>
              )}
              <div className="hw-config__source-grid" role="radiogroup" aria-label="Type de carrousel">
                {CAROUSEL_SOURCE_KINDS.map((kind) => {
                  const available = carouselSourceHasContent(kind, pickerData)
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={sourceKind === kind}
                      disabled={!available}
                      className={`hw-config__source-tile${sourceKind === kind ? ' is-selected' : ''}`}
                      onClick={() => {
                        if (!available) return
                        setSourceKind(kind)
                        const nextMode = firstAvailableCarouselSelectionMode(kind, pickerData)
                        if (nextMode) setSelectionMode(nextMode)
                      }}
                    >
                      <span className="hw-config__source-tile-title">
                        {CAROUSEL_SOURCE_STEP_LABELS[kind]}
                      </span>
                      <span
                        className={`hw-config__source-tile-desc${available ? '' : ' is-empty'}`}
                      >
                        {available
                          ? CAROUSEL_SOURCE_STEP_DESC[kind]
                          : CAROUSEL_SOURCE_EMPTY_LABELS[kind]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {isCarousel && carouselStep === 2 && selectionModes && (
            <div className="hw-config__section">
              <p className="hw-config__step">Étape 2 sur 2</p>
              <p className="hw-config__hint">Comment sélectionner les éléments à afficher ?</p>
              <fieldset className="hw-config__fieldset">
                {selectionModes.map((mode) => {
                  const available = carouselSelectionModeHasContent(sourceKind, mode, pickerData)
                  return (
                    <label
                      key={mode}
                      className={`hw-config__radio${available ? '' : ' is-disabled'}`}
                    >
                      <input
                        type="radio"
                        name="carousel_selection"
                        checked={selectionMode === mode}
                        disabled={!available}
                        onChange={() => setSelectionMode(mode)}
                      />
                      <span>{CAROUSEL_SELECTION_LABELS[mode]}</span>
                    </label>
                  )
                })}
              </fieldset>
              {sourceKind === 'shop_category' && selectionMode === 'category' && (
                <label className="hw-config__field">
                  <span>Catégorie</span>
                  <select
                    className="hw-config__select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {shopCategoriesWithProducts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {configurable && (
            <footer className="hw-config__foot">
              {isCarousel && carouselStep === 2 ? (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={pending}
                    onClick={() => setCarouselStep(1)}
                  >
                    Retour
                  </button>
                  <button type="submit" className="btn btn--dark" disabled={pending || !canSaveCarouselStep2}>
                    {pending ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </>
              ) : isCarousel ? (
                <>
                  <button type="button" className="btn btn--ghost" onClick={onClose}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn--dark"
                    disabled={pending || !canSaveCarouselStep1}
                    onClick={handleCarouselContinue}
                  >
                    {pending
                      ? 'Enregistrement…'
                      : carouselNeedsStep2
                        ? 'Continuer'
                        : 'Enregistrer'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn--ghost" onClick={onClose}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn--dark" disabled={pending || !canSaveHighlight}>
                    {pending ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </>
              )}
            </footer>
          )}
        </form>
      </div>
    </div>
  )
}
