'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import {
  normalizeWidgetConfig,
  parseEventConfig,
  parseServiceConfig,
  parseShopConfig,
} from '@ibee/shared'
import { updateHomeWidgetConfigAction } from '@/app/dashboard/site/home-widgets-actions'
import type { HomeWidget, WidgetPickerData } from './types'

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
    switch (widget.type) {
      case 'widget_shop': {
        const parsed = parseShopConfig(cfg)
        return {
          shopMode: parsed?.mode === 'product' ? 'product' : 'collection',
          categoryId: parsed?.mode === 'collection' ? parsed.category_id : pickerData.categories[0]?.id ?? '',
          productId: parsed?.mode === 'product' ? parsed.product_id : '',
          productSearch: '',
        }
      }
      case 'widget_service': {
        const parsed = parseServiceConfig(cfg)
        return {
          serviceMode: parsed?.mode === 'service' ? 'service' : 'collection',
          serviceId: parsed?.mode === 'service' ? parsed.appointment_type_id : '',
          serviceSearch: '',
        }
      }
      case 'widget_event': {
        const parsed = parseEventConfig(cfg)
        return {
          eventMode: parsed?.mode === 'list' ? 'list' : 'featured',
          eventId: parsed?.mode === 'featured' ? parsed.event_id : pickerData.events[0]?.id ?? '',
        }
      }
      default:
        return {}
    }
  }, [widget, pickerData])

  const [shopMode, setShopMode] = useState('collection')
  const [categoryId, setCategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [serviceMode, setServiceMode] = useState('collection')
  const [serviceId, setServiceId] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [eventMode, setEventMode] = useState('featured')
  const [eventId, setEventId] = useState('')

  useEffect(() => {
    if (!initial) return
    if ('shopMode' in initial) {
      setShopMode(initial.shopMode as string)
      setCategoryId(initial.categoryId as string)
      setProductId(initial.productId as string)
      setProductSearch('')
    }
    if ('serviceMode' in initial) {
      setServiceMode(initial.serviceMode as string)
      setServiceId(initial.serviceId as string)
      setServiceSearch('')
    }
    if ('eventMode' in initial) {
      setEventMode(initial.eventMode as string)
      setEventId(initial.eventId as string)
    }
  }, [initial])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!widget) return null
  const activeWidget = widget

  const filteredProducts = pickerData.products.filter((p) =>
    p.title.toLowerCase().includes(productSearch.trim().toLowerCase())
  )

  const filteredServices = pickerData.services.filter((s) =>
    s.title.toLowerCase().includes(serviceSearch.trim().toLowerCase())
  )

  function buildConfig(): Record<string, unknown> | null {
    switch (activeWidget.type) {
      case 'widget_shop':
        if (shopMode === 'product') {
          if (!productId) return null
          return { mode: 'product', product_id: productId }
        }
        if (!categoryId) return null
        return { mode: 'collection', category_id: categoryId, limit: 6 }
      case 'widget_service':
        if (serviceMode === 'service') {
          if (!serviceId) return null
          return { mode: 'service', appointment_type_id: serviceId }
        }
        return { mode: 'collection', limit: 6 }
      case 'widget_event':
        if (eventMode === 'list') return { mode: 'list', limit: 6 }
        if (!eventId) return null
        return { mode: 'featured', event_id: eventId }
      default:
        return null
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const config = buildConfig()
    if (!config) {
      toast.error('Complète la configuration avant d\'enregistrer.')
      return
    }

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

  const configurable = ['widget_shop', 'widget_service', 'widget_event'].includes(activeWidget.type)

  return (
    <div className="hw-config" role="presentation">
      <button type="button" className="hw-config__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="hw-config__panel" role="dialog" aria-modal="true" aria-labelledby="hw-config-title">
        <header className="hw-config__head">
          <h2 id="hw-config-title" className="hw-config__title">
            Configurer le widget
          </h2>
          <button type="button" className="hw-config__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <form className="hw-config__form" onSubmit={handleSubmit}>
          {!configurable && (
            <p className="hw-config__hint">
              Ce widget se configure automatiquement ou via un autre écran (FAQ, bannière…). Utilise
              l&apos;édition complète sur le profil web pour les options avancées.
            </p>
          )}

          {activeWidget.type === 'widget_shop' && (
            <div className="hw-config__section">
              <p className="hw-config__hint">
                Choisis une <strong>vue catégorie</strong> (carrousel) ou une <strong>vue produit</strong>.
              </p>
              <fieldset className="hw-config__fieldset">
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="shop_mode"
                    checked={shopMode === 'collection'}
                    onChange={() => setShopMode('collection')}
                  />
                  <span>Vue catégorie</span>
                </label>
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="shop_mode"
                    checked={shopMode === 'product'}
                    onChange={() => setShopMode('product')}
                  />
                  <span>Vue produit</span>
                </label>
              </fieldset>
              {shopMode === 'collection' ? (
                <label className="hw-config__field">
                  <span>Catégorie</span>
                  <select
                    className="hw-config__select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {pickerData.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="hw-config__field">
                  <input
                    type="search"
                    className="hw-config__entity-search"
                    placeholder="Rechercher un produit…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="hw-config__entity-list" role="listbox">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={productId === p.id}
                        className={`hw-config__entity-item${productId === p.id ? ' is-selected' : ''}`}
                        onClick={() => setProductId(p.id)}
                      >
                        <span className="hw-config__entity-title">{p.title}</span>
                        {p.tags.length > 0 && (
                          <span className="hw-config__entity-tags">{p.tags.join(' · ')}</span>
                        )}
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="hw-config__entity-empty">Aucun produit ne correspond.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeWidget.type === 'widget_service' && (
            <div className="hw-config__section">
              <p className="hw-config__hint">
                Carrousel de services ou mise en avant d&apos;un service précis.
              </p>
              <fieldset className="hw-config__fieldset">
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="service_mode"
                    checked={serviceMode === 'collection'}
                    onChange={() => setServiceMode('collection')}
                  />
                  <span>Vue catégorie</span>
                </label>
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="service_mode"
                    checked={serviceMode === 'service'}
                    onChange={() => setServiceMode('service')}
                  />
                  <span>Vue service</span>
                </label>
              </fieldset>
              {serviceMode === 'service' && (
                <div className="hw-config__field">
                  <input
                    type="search"
                    className="hw-config__entity-search"
                    placeholder="Rechercher un service…"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />
                  <div className="hw-config__entity-list" role="listbox">
                    {filteredServices.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={serviceId === s.id}
                        className={`hw-config__entity-item${serviceId === s.id ? ' is-selected' : ''}`}
                        onClick={() => setServiceId(s.id)}
                      >
                        <span className="hw-config__entity-title">{s.title}</span>
                        {s.tags.length > 0 && (
                          <span className="hw-config__entity-tags">{s.tags.join(' · ')}</span>
                        )}
                      </button>
                    ))}
                    {filteredServices.length === 0 && (
                      <p className="hw-config__entity-empty">Aucun service ne correspond.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeWidget.type === 'widget_event' && (
            <div className="hw-config__section">
              <p className="hw-config__hint">Mettre en avant un event ou afficher tous les events.</p>
              <fieldset className="hw-config__fieldset">
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="event_mode"
                    checked={eventMode === 'featured'}
                    onChange={() => setEventMode('featured')}
                  />
                  <span>Un event</span>
                </label>
                <label className="hw-config__radio">
                  <input
                    type="radio"
                    name="event_mode"
                    checked={eventMode === 'list'}
                    onChange={() => setEventMode('list')}
                  />
                  <span>Tous les events</span>
                </label>
              </fieldset>
              {eventMode === 'featured' && (
                <label className="hw-config__field">
                  <span>Event</span>
                  <select
                    className="hw-config__select"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {pickerData.events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {configurable && (
            <footer className="hw-config__foot">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn--dark" disabled={pending}>
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </footer>
          )}
        </form>
      </div>
    </div>
  )
}
