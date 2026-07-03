'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownUp,
  ChevronRight,
  CircleCheck,
  Clock,
  FileText,
  Package,
  Printer,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react'
import {
  addOrderCommentAction,
  confirmOrderLabelsPrintedAction,
  sendOrderInvoiceAction,
} from '@/app/dashboard/activite/boutique-actions'
import { canPrintShippingLabel, PRINT_CANCELLED_ERROR, printShippingLabels } from '@/lib/boutique-order-label'
import {
  formatBoutiqueMoney,
  formatBoutiqueRelativeTime,
  type BoutiqueDisplayStatus,
  type BoutiqueOrderView,
} from '@/lib/boutique-order-view'
import { ActiviteCatalogThumb } from './ActiviteCatalogThumb'

const STATUS_CONFIG: Record<
  BoutiqueDisplayStatus,
  { label: string; color: string; icon: ReactNode }
> = {
  en_attente_paiement: {
    label: 'En attente',
    color: 'status--pending',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  a_traiter: {
    label: 'Commande à traiter',
    color: 'status--pending',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  a_expedier: {
    label: 'À expédier',
    color: 'status--confirmed',
    icon: <CircleCheck className="h-3.5 w-3.5" />,
  },
  prete: {
    label: 'Prête',
    color: 'status--confirmed',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  expediee: {
    label: 'Expédiée',
    color: 'status--shipped',
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  livree: {
    label: 'Livrée',
    color: 'status--delivered',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  annulee: {
    label: 'Annulée',
    color: 'status--cancelled',
    icon: <X className="h-3.5 w-3.5" />,
  },
  remboursee: {
    label: 'Remboursée',
    color: 'status--refunded',
    icon: <ArrowDownUp className="h-3.5 w-3.5" />,
  },
  en_essai: {
    label: 'Période d\'essai',
    color: 'status--confirmed',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  retour_demande: {
    label: 'Retour demandé',
    color: 'status--pending',
    icon: <ArrowDownUp className="h-3.5 w-3.5" />,
  },
}

const FILTER_STATUSES: BoutiqueDisplayStatus[] = [
  'en_attente_paiement',
  'a_traiter',
  'a_expedier',
  'prete',
  'expediee',
  'livree',
  'annulee',
  'remboursee',
  'en_essai',
  'retour_demande',
]

export function StatusBadge({
  status,
  label,
}: {
  status: BoutiqueDisplayStatus
  label?: string
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`order-status-badge${label ? ' order-status-badge--custom-label' : ''} ${cfg.color}`}
      title={label ? cfg.label : undefined}
    >
      {cfg.icon}
      {label ?? cfg.label}
    </span>
  )
}

export function OrderRow({
  order,
  onClick,
  meta,
}: {
  order: BoutiqueOrderView
  onClick: () => void
  meta?: string
}) {
  const date = new Date(order.paidAt ?? order.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className="order-row"
      aria-label={`Voir la commande ${order.ref}`}
    >
      <div className="order-row__main">
        <span className="order-row__ref">{order.ref}</span>
        <span className="order-row__customer">{order.customer}</span>
      </div>
      <div className="order-row__meta">
        <span className="order-row__date">{meta ?? date}</span>
        <StatusBadge status={order.displayStatus} />
        <span className="order-row__total">{formatBoutiqueMoney(order.totalCents, order.currency)}</span>
        <ChevronRight className="order-row__chevron h-4 w-4 text-neutral-400" aria-hidden="true" />
      </div>
    </button>
  )
}

export function InboxOrderCard({
  order,
  selected,
  onSelect,
  bulkChecked = false,
  onBulkCheckChange,
  bulkSelectable = false,
}: {
  order: BoutiqueOrderView
  selected: boolean
  onSelect: () => void
  bulkChecked?: boolean
  onBulkCheckChange?: (checked: boolean) => void
  bulkSelectable?: boolean
}) {
  const typeLabel =
    order.productType === 'digital'
      ? 'Digital'
      : order.productType === 'physical'
        ? 'Physique'
        : null

  const whenLabel = formatBoutiqueRelativeTime(order.paidAt ?? order.date)
  const itemsLabel = `${order.itemCount} article${order.itemCount > 1 ? 's' : ''}`
  const showBulkCheck = bulkSelectable && onBulkCheckChange

  function handleCardActivate() {
    onSelect()
    if (showBulkCheck) {
      onBulkCheckChange(!bulkChecked)
    }
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardActivate()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`boutique-order-card boutique-order-card--media boutique-order-card--shop-inbox${selected ? ' is-selected' : ''}${bulkChecked ? ' is-bulk-selected' : ''}`}
      onClick={handleCardActivate}
      onKeyDown={handleCardKeyDown}
      aria-current={selected ? 'true' : undefined}
      aria-label={`Commande ${order.customer}, ${itemsLabel}`}
    >
      <ActiviteCatalogThumb imageUrl={order.imageUrl} alt="" />
      <div className="boutique-order-card__body">
        <div className="boutique-order-card__top">
          <div className="boutique-order-card__top-main">
            {showBulkCheck ? (
              <label
                className="boutique-order-card__check"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={bulkChecked}
                  onChange={(event) => onBulkCheckChange(event.target.checked)}
                  aria-label={`Sélectionner la commande de ${order.customer}`}
                />
              </label>
            ) : null}
            <div
              className="boutique-order-card__identity"
              title={STATUS_CONFIG[order.displayStatus].label}
            >
              <div className="boutique-order-card__customer-head">
                <span className="boutique-order-card__status-icon" aria-hidden="true">
                  {STATUS_CONFIG[order.displayStatus].icon}
                </span>
                <span className="boutique-order-card__customer-name">{order.customer}</span>
              </div>
            </div>
          </div>
          <span className="boutique-order-card__when">{whenLabel}</span>
        </div>
        <div className="boutique-order-card__main-row">
          <p className="boutique-order-card__items-sub">
            {itemsLabel}
            {typeLabel ? (
              <span
                className={`boutique-order-card__type${order.productType === 'digital' ? ' is-digital' : ''}`}
              >
                {typeLabel}
              </span>
            ) : null}
          </p>
          <span className="boutique-order-card__amount">
            {formatBoutiqueMoney(order.totalCents, order.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function OrderTimeline({ order }: { order: BoutiqueOrderView }) {
  if (order.events.length === 0) {
    return <p className="order-timeline__empty">Aucun événement enregistré.</p>
  }

  return (
    <ol className="order-timeline">
      {order.events.map((event) => (
        <li key={event.id} className="order-timeline__item">
          <span className="order-timeline__dot" aria-hidden="true" />
          <div className="order-timeline__body">
            <p className="order-timeline__title">{event.title}</p>
            {event.detail ? <p className="order-timeline__detail">{event.detail}</p> : null}
            <time className="order-timeline__time" dateTime={event.at}>
              {new Date(event.at).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function OrderDetail({
  order,
  onClose,
  onUpdated,
  compact = false,
  senderName = 'IBEE',
  showPrintButton = true,
}: {
  order: BoutiqueOrderView
  onClose: () => void
  onUpdated?: (orderId: string, patch: Partial<BoutiqueOrderView>) => void
  compact?: boolean
  senderName?: string
  showPrintButton?: boolean
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [printPending, setPrintPending] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setComment('')
    setError(null)
  }, [order.id])

  const date = new Date(order.paidAt ?? order.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const printable =
    canPrintShippingLabel(order) &&
    (order.fulfillmentStatus === 'pending' || order.fulfillmentStatus === 'to_ship')

  function handleAddComment() {
    setError(null)
    startTransition(async () => {
      const result = await addOrderCommentAction(order.id, comment)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setComment('')
      router.refresh()
    })
  }

  function handleSendInvoice() {
    setError(null)
    startTransition(async () => {
      const result = await sendOrderInvoiceAction(order.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handlePrintLabel() {
    setError(null)
    setPrintPending(true)
    void printShippingLabels([order], senderName)
      .then(async (result) => {
        if (!result.ok) {
          if (result.error !== PRINT_CANCELLED_ERROR) {
            setError(result.error)
          }
          return
        }
        const confirmed = await confirmOrderLabelsPrintedAction(result.orderIds)
        if (!confirmed.ok) {
          setError(confirmed.error)
          return
        }
        router.refresh()
      })
      .catch(() => {
        setError('Impossible d’imprimer l’étiquette.')
      })
      .finally(() => {
        setPrintPending(false)
      })
  }

  return (
    <div className={`order-detail${compact ? ' order-detail--compact' : ''}`}>
      <div className="order-detail__header">
        <div className="order-detail__header-main">
          <p className="order-detail__ref">{order.ref}</p>
          <p className="order-detail__date">{date}</p>
          <div className="order-detail__status-row">
            <StatusBadge status={order.displayStatus} />
            {order.productType ? (
              <span className="order-detail__type-pill">
                {order.productType === 'digital' ? 'Digital' : 'Physique'}
              </span>
            ) : null}
          </div>
        </div>
        <div className="order-detail__header-actions">
          <button
            type="button"
            className="order-detail__header-btn"
            onClick={handleSendInvoice}
            disabled={pending}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Envoyer facture
          </button>
          {showPrintButton && printable ? (
            <button
              type="button"
              className="order-detail__header-btn"
              onClick={handlePrintLabel}
              disabled={pending || printPending}
              aria-label="Imprimer l'étiquette"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Étiquette
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="order-detail__close" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="order-detail__body">
        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Client</h3>
          <p className="order-detail__value">{order.customer}</p>
          {order.email ? (
            <p className="order-detail__value order-detail__value--muted">{order.email}</p>
          ) : null}
          {order.shippingAddress ? (
            <p className="order-detail__value order-detail__value--muted">{order.shippingAddress}</p>
          ) : null}
        </section>

        <section className="order-detail__section">
          <h3 className="order-detail__section-title">Produits commandés</h3>
          <ul className="order-detail__items">
            {order.items.map((item, i) => (
              <li key={i} className="order-detail__item">
                <span>
                  {item.name} × {item.qty}
                </span>
                <span>{formatBoutiqueMoney(item.priceCents * item.qty, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="order-detail__total">
            <span>Total</span>
            <span>{formatBoutiqueMoney(order.totalCents, order.currency)}</span>
          </div>
        </section>

        <section className="order-detail__section order-detail__activity">
          <h3 className="order-detail__section-title">Historique</h3>
          <div className="order-detail__comment">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire…"
              rows={2}
              className="order-detail__textarea"
              disabled={pending}
            />
            <button
              type="button"
              className="order-detail__comment-btn"
              onClick={handleAddComment}
              disabled={pending || comment.trim().length === 0}
            >
              {pending ? '…' : 'Ajouter'}
            </button>
          </div>
          <OrderTimeline order={order} />
        </section>

        {error ? <p className="order-detail__error">{error}</p> : null}
      </div>
    </div>
  )
}

export function OrdersMasterDetail({
  orders,
  emptyLabel = 'Sélectionne une commande pour voir les détails',
  selectedId,
  onSelect,
  listHeader,
  renderRowMeta,
}: {
  orders: BoutiqueOrderView[]
  emptyLabel?: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  listHeader?: ReactNode
  renderRowMeta?: (order: BoutiqueOrderView) => string | undefined
}) {
  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null

  return (
    <div className="commandes-layout commandes-layout--embedded">
      <div className="commandes-list-pane">
        {listHeader}
        <div className="commandes-list">
          {orders.length === 0 ? (
            <p className="commandes-empty">Aucune commande trouvée.</p>
          ) : (
            orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => onSelect(order.id)}
                meta={renderRowMeta?.(order)}
              />
            ))
          )}
        </div>
      </div>

      <div className={`commandes-detail-pane${selectedOrder ? ' is-open' : ''}`}>
        {selectedOrder ? (
          <OrderDetail order={selectedOrder} onClose={() => onSelect(null)} />
        ) : (
          <div className="commandes-detail-empty">
            <Package className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>{emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function BoutiqueHistoriquePanel({
  orders,
  embedded = false,
}: {
  orders: BoutiqueOrderView[]
  embedded?: boolean
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<BoutiqueDisplayStatus | 'tous'>('tous')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        search === '' ||
        o.ref.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase()) ||
        (o.email ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'tous' || o.displayStatus === filterStatus
      return matchSearch && matchStatus
    })
  }, [orders, search, filterStatus])

  const listHeader = (
    <div className="commandes-toolbar">
        <div className="commandes-search">
          <Search className="commandes-search__icon h-4 w-4" aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher une commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="commandes-search__input"
          />
        </div>
        <div className="commandes-filters">
          <SlidersHorizontal className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as BoutiqueDisplayStatus | 'tous')}
            className="commandes-filter-select"
          >
            <option value="tous">Tous les statuts</option>
            {FILTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>
  )

  return (
    <div className={embedded ? 'boutique-panel boutique-panel--historique' : undefined}>
      {embedded ? (
        <header className="boutique-panel__head">
          <div>
            <h2 className="boutique-panel__title">Toutes les commandes</h2>
            <p className="boutique-panel__hint">
              {orders.length} commande{orders.length > 1 ? 's' : ''}
            </p>
          </div>
        </header>
      ) : null}
      <div className={embedded ? 'boutique-panel__historique-body' : undefined}>
        <OrdersMasterDetail
          orders={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          listHeader={listHeader}
        />
      </div>
    </div>
  )
}

export { formatBoutiqueRelativeTime }
