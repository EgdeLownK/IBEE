'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { EventCreateWizard } from '@/components/profile/event-create/EventCreateWizard'
import { EventEditOverlay } from '@/components/dashboard/activite/EventEditOverlay'
import { EventAddParticipantOverlay } from '@/components/dashboard/activite/EventAddParticipantOverlay'
import { ProductCreateWizard } from '@/components/profile/product-create/ProductCreateWizard'
import { ServiceCreateWizard } from '@/components/profile/service-create/ServiceCreateWizard'
import type { ActivityOverlayData } from '@/lib/load-activity-overlay-data'

export type ActivityOverlayKind = 'product' | 'service' | 'event' | 'order' | 'booking'

type ActivityOverlayContextValue = {
  openOverlay: (kind: ActivityOverlayKind) => void
  openEventEdit: (eventId: string) => void
  openAddParticipant: (eventId: string) => void
}

const ActivityOverlayContext = createContext<ActivityOverlayContextValue | null>(null)

export function useActivityOverlay(): ActivityOverlayContextValue {
  const ctx = useContext(ActivityOverlayContext)
  if (!ctx) {
    throw new Error('useActivityOverlay must be used within ActivityOverlayProvider')
  }
  return ctx
}

function ActivityPlaceholderOverlay({
  open,
  title,
  subtitle,
  hint,
  onClose,
}: {
  open: boolean
  title: string
  subtitle: string
  hint: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="pco-root" role="presentation">
      <button type="button" className="pco-root__backdrop" aria-label="Fermer" onClick={onClose} />
      <div
        className="pco__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-placeholder-title"
      >
        <header className="pco__header">
          <div>
            <h2 id="activity-placeholder-title" className="pco__title">
              {title}
            </h2>
            <p className="activity-placeholder__subtitle">{subtitle}</p>
          </div>
          <button type="button" className="pco__close" aria-label="Fermer" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="pco__scroll">
          <section className="boutique-create-order__panel activity-placeholder__panel">
            <p className="boutique-create-order__hint">{hint}</p>
            <button type="button" className="boutique-dash__head-btn" onClick={onClose}>
              Fermer
            </button>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

type Props = ActivityOverlayData & {
  children: ReactNode
}

export function ActivityOverlayProvider({ children, productCategories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [productOpen, setProductOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [eventEditId, setEventEditId] = useState<string | null>(null)
  const [addParticipantEventId, setAddParticipantEventId] = useState<string | null>(null)
  const [orderOpen, setOrderOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)

  const openOverlay = useCallback((kind: ActivityOverlayKind) => {
    switch (kind) {
      case 'product':
        setProductOpen(true)
        break
      case 'service':
        setServiceOpen(true)
        break
      case 'event':
        setEventOpen(true)
        break
      case 'order':
        setOrderOpen(true)
        break
      case 'booking':
        setBookingOpen(true)
        break
    }
  }, [])

  const openEventEdit = useCallback((eventId: string) => {
    setEventEditId(eventId)
  }, [])

  const openAddParticipant = useCallback((eventId: string) => {
    setAddParticipantEventId(eventId)
  }, [])

  const overlayHandledRef = useRef(false)

  useEffect(() => {
    const overlay = searchParams.get('overlay')
    if (!overlay || overlayHandledRef.current) return

    overlayHandledRef.current = true

    const kinds: ActivityOverlayKind[] = ['product', 'service', 'event', 'order', 'booking']
    if (kinds.includes(overlay as ActivityOverlayKind)) {
      openOverlay(overlay as ActivityOverlayKind)
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('overlay')
    const next = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
    router.replace(next, { scroll: false })
  }, [openOverlay, pathname, router, searchParams])

  const value = useMemo(
    () => ({ openOverlay, openEventEdit, openAddParticipant }),
    [openOverlay, openEventEdit, openAddParticipant],
  )

  function refreshAfterCreate() {
    router.refresh()
  }

  function closeEventEdit() {
    setEventEditId(null)
    refreshAfterCreate()
  }

  function closeAddParticipant() {
    setAddParticipantEventId(null)
    refreshAfterCreate()
  }

  return (
    <ActivityOverlayContext.Provider value={value}>
      {children}

      <ProductCreateWizard
        open={productOpen}
        productCategories={productCategories}
        onClose={() => setProductOpen(false)}
        onCreated={() => {
          setProductOpen(false)
          refreshAfterCreate()
        }}
      />

      <ServiceCreateWizard
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        onCreated={() => {
          setServiceOpen(false)
          refreshAfterCreate()
        }}
      />

      <EventCreateWizard
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        onCreated={() => {
          setEventOpen(false)
          refreshAfterCreate()
        }}
      />

      <EventEditOverlay eventId={eventEditId} open={eventEditId != null} onClose={closeEventEdit} />

      <EventAddParticipantOverlay
        eventId={addParticipantEventId}
        open={addParticipantEventId != null}
        onClose={closeAddParticipant}
      />

      <ActivityPlaceholderOverlay
        open={orderOpen}
        title="Créer une commande"
        subtitle="Commande manuelle — parcours en cours de construction."
        hint="Cette fenêtre accueillera la création de commandes hors checkout (vente au comptoir, téléphone, etc.). En attendant, les commandes arrivent via le checkout public."
        onClose={() => setOrderOpen(false)}
      />

      <ActivityPlaceholderOverlay
        open={bookingOpen}
        title="Ajouter un rendez-vous"
        subtitle="Rendez-vous manuel — parcours en cours de construction."
        hint="Cette fenêtre accueillera la création de rendez-vous hors réservation en ligne (téléphone, comptoir, reprogrammation…). En attendant, les demandes arrivent via le formulaire public de réservation."
        onClose={() => setBookingOpen(false)}
      />
    </ActivityOverlayContext.Provider>
  )
}
