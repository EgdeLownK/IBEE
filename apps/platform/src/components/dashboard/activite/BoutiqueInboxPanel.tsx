'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Mail, Printer, Truck } from 'lucide-react'
import {
  markOrderDeliveredAction,
  markOrderShippedAction,
  resendDigitalLinkAction,
} from '@/app/dashboard/activite/boutique-actions'
import {
  filterBoutiqueOrders,
  type BoutiqueDashboardData,
  type BoutiqueOrderFilter,
  type BoutiqueOrderView,
} from '@/lib/boutique-order-view'
import { canPrintShippingLabel } from '@/lib/boutique-order-label'
import { InboxOrderCard, OrderDetail, StatusBadge } from './boutique-orders-ui'
import { BoutiqueInboxFilterSummary } from './BoutiqueInboxFilterSummary'
import { BoutiqueSidePanel } from './BoutiqueSidePanel'
import { usePrintOrderLabels } from './use-print-order-labels'

type Props = {
  data: Pick<BoutiqueDashboardData, 'orders' | 'stockItems' | 'products'>
  orderFilter: BoutiqueOrderFilter
  searchQuery: string
  senderName: string
}

const FILTER_EMPTY_LABELS: Record<BoutiqueOrderFilter, string> = {
  all: 'Aucune commande pour le moment.',
  'to-treat': 'Aucune commande à traiter.',
  ready: 'Aucune commande prête à l’expédition.',
  shipping: 'Aucune commande en transit.',
  trial: 'Aucune commande livrée.',
  returns: 'Aucune demande de retour.',
}

function canPrintToReady(order: BoutiqueOrderView): boolean {
  return (
    canPrintShippingLabel(order) &&
    (order.fulfillmentStatus === 'pending' || order.fulfillmentStatus === 'to_ship')
  )
}

export function BoutiqueInboxPanel({
  data,
  orderFilter,
  searchQuery,
  senderName,
}: Props) {
  const visibleOrders = useMemo(
    () => filterBoutiqueOrders(data.orders, orderFilter, searchQuery),
    [data.orders, orderFilter, searchQuery]
  )

  const showBulkSelection = orderFilter === 'to-treat'

  const printableVisible = useMemo(
    () => (showBulkSelection ? visibleOrders.filter(canPrintToReady) : []),
    [showBulkSelection, visibleOrders]
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set())
  const [actionId, setActionId] = useState<string | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const { printOrders, printPending } = usePrintOrderLabels(senderName)

  useEffect(() => {
    if (!selectedId) return
    const stillExists = data.orders.some((order) => order.id === selectedId)
    if (!stillExists) setSelectedId(null)
  }, [data.orders, selectedId])

  useEffect(() => {
    if (orderFilter === 'to-treat') return
    setSelectionMode(false)
    setCheckedIds(new Set())
  }, [orderFilter])

  useEffect(() => {
    setCheckedIds((current) => {
      const printableIds = new Set(printableVisible.map((order) => order.id))
      const next = new Set([...current].filter((id) => printableIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [printableVisible])

  const selectedOrder = data.orders.find((order) => order.id === selectedId) ?? null
  const selectedPrintable = selectedOrder ? canPrintToReady(selectedOrder) : false

  const checkedPrintableOrders = useMemo(
    () => printableVisible.filter((order) => checkedIds.has(order.id)),
    [printableVisible, checkedIds]
  )

  const ordersToPrint = useMemo(() => {
    if (selectionMode) {
      return checkedPrintableOrders
    }
    return printableVisible
  }, [selectionMode, checkedPrintableOrders, printableVisible])

  function toggleSelectionMode() {
    setSelectionMode((current) => {
      if (current) setCheckedIds(new Set())
      return !current
    })
  }

  const toggleChecked = useCallback((orderId: string, checked: boolean) => {
    setCheckedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(orderId)
      else next.delete(orderId)
      return next
    })
  }, [])

  function runAction(order: BoutiqueOrderView) {
    setActionId(order.id)
    startTransition(async () => {
      if (order.productType === 'digital') {
        await markOrderDeliveredAction(order.id)
      } else {
        await markOrderShippedAction(order.id)
      }
      setActionId(null)
      router.refresh()
    })
  }

  function runResendDigitalLink(order: BoutiqueOrderView) {
    setActionId(order.id)
    startTransition(async () => {
      const result = await resendDigitalLinkAction(order.id)
      if (!result.ok) {
        setPrintError(result.error)
      }
      setActionId(null)
      router.refresh()
    })
  }

  function handleBulkPrint() {
    if (ordersToPrint.length === 0) return
    setPrintError(null)
    printOrders(ordersToPrint, setPrintError, () => {
      setCheckedIds(new Set())
      setSelectionMode(false)
    })
  }

  function handleSinglePrint(order: BoutiqueOrderView) {
    setPrintError(null)
    printOrders([order], setPrintError)
  }

  return (
    <div className="boutique-inbox">
      <div className="boutique-inbox__file">
        <header className="boutique-inbox__file-head boutique-inbox__file-head--split">
          <div className="boutique-inbox__file-head-main">
            <h2 className="boutique-inbox__file-title">Commande</h2>
            <p className="boutique-inbox__file-count">
              {visibleOrders.length} commande{visibleOrders.length > 1 ? 's' : ''}
              {checkedIds.size > 0
                ? ` · ${checkedIds.size} sélectionnée${checkedIds.size > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
          {showBulkSelection && printableVisible.length > 0 ? (
            <div className="boutique-inbox__file-toolbar boutique-inbox__file-toolbar--split">
              <button
                type="button"
                className={`boutique-inbox__select-mode-btn${selectionMode ? ' is-active' : ''}`}
                onClick={toggleSelectionMode}
              >
                {selectionMode ? 'Annuler' : 'Sélectionner'}
              </button>
              <button
                type="button"
                className="boutique-inbox__print-btn boutique-inbox__print-btn--primary"
                onClick={handleBulkPrint}
                disabled={printPending || ordersToPrint.length === 0}
              >
                <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
                {printPending
                  ? 'Impression…'
                  : `Imprimer ${ordersToPrint.length} étiquette${ordersToPrint.length > 1 ? 's' : ''}`}
              </button>
            </div>
          ) : null}
        </header>

        <BoutiqueInboxFilterSummary orders={visibleOrders} filter={orderFilter} />

        {printError ? <p className="boutique-inbox__print-error">{printError}</p> : null}

        {visibleOrders.length === 0 ? (
          <p className="boutique-inbox__empty">
            {searchQuery.trim()
              ? 'Aucun résultat pour cette recherche.'
              : FILTER_EMPTY_LABELS[orderFilter]}
          </p>
        ) : (
          <ul className="boutique-inbox__list boutique-inbox__list--flat">
            {visibleOrders.map((order) => (
              <li key={order.id}>
                <InboxOrderCard
                  order={order}
                  selected={selectedId === order.id}
                  onSelect={() => setSelectedId(order.id)}
                  bulkSelectable={selectionMode && canPrintToReady(order)}
                  bulkChecked={checkedIds.has(order.id)}
                  onBulkCheckChange={(checked) => toggleChecked(order.id, checked)}
                />
              </li>
            ))}
          </ul>
        )}

      </div>

      <aside
        className={`boutique-inbox__detail${selectedOrder ? ' boutique-inbox__detail--order' : ''}`}
      >
        {selectedOrder ? (
          <>
            <OrderDetail
              order={selectedOrder}
              onClose={() => setSelectedId(null)}
              compact
              senderName={senderName}
              showPrintButton={false}
            />
            <div className="boutique-inbox__quick-action">
              {selectedOrder.needsAction ? (
                selectedPrintable ? (
                  <button
                    type="button"
                    className="boutique-inbox__action-btn"
                    disabled={printPending || actionId === selectedOrder.id}
                    onClick={() => handleSinglePrint(selectedOrder)}
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {printPending ? 'Impression…' : 'Imprimer l’étiquette'}
                  </button>
                ) : selectedOrder.productType === 'digital' ? (
                  <button
                    type="button"
                    className="boutique-inbox__action-btn"
                    disabled={actionId === selectedOrder.id || printPending}
                    onClick={() => runAction(selectedOrder)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {actionId === selectedOrder.id ? '…' : 'Marquer livrée'}
                  </button>
                ) : selectedOrder.fulfillmentStatus === 'ready' ? (
                  <button
                    type="button"
                    className="boutique-inbox__action-btn"
                    disabled={actionId === selectedOrder.id || printPending}
                    onClick={() => runAction(selectedOrder)}
                  >
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    {actionId === selectedOrder.id ? '…' : 'Marquer expédiée'}
                  </button>
                ) : (
                  <StatusBadge status={selectedOrder.displayStatus} />
                )
              ) : selectedOrder.productType === 'digital' &&
                selectedOrder.paymentStatus === 'paid' ? (
                <button
                  type="button"
                  className="boutique-inbox__action-btn"
                  disabled={actionId === selectedOrder.id || printPending}
                  onClick={() => runResendDigitalLink(selectedOrder)}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {actionId === selectedOrder.id ? '…' : 'Renvoyer le lien'}
                </button>
              ) : (
                <StatusBadge status={selectedOrder.displayStatus} />
              )}
            </div>
          </>
        ) : (
          <BoutiqueSidePanel
            orders={data.orders}
            products={data.products}
            stockItems={data.stockItems}
            onSelectOrder={setSelectedId}
          />
        )}
      </aside>
    </div>
  )
}
