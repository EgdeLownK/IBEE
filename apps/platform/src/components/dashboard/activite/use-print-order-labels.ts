'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmOrderLabelsPrintedAction } from '@/app/dashboard/activite/boutique-actions'
import { PRINT_CANCELLED_ERROR, printShippingLabels } from '@/lib/boutique-order-label'
import type { BoutiqueOrderView } from '@/lib/boutique-order-view'

export function usePrintOrderLabels(senderName: string) {
  const router = useRouter()
  const [printPending, setPrintPending] = useState(false)

  function printOrders(
    orders: BoutiqueOrderView[],
    onError: (message: string) => void,
    onSuccess?: () => void
  ) {
    setPrintPending(true)

    void printShippingLabels(orders, senderName)
      .then(async (result) => {
        if (!result.ok) {
          if (result.error !== PRINT_CANCELLED_ERROR) {
            onError(result.error)
          }
          return
        }

        const confirmed = await confirmOrderLabelsPrintedAction(result.orderIds)
        if (!confirmed.ok) {
          onError(confirmed.error)
          return
        }

        onSuccess?.()
        router.refresh()
      })
      .catch(() => {
        onError('Impossible d’imprimer les étiquettes.')
      })
      .finally(() => {
        setPrintPending(false)
      })
  }

  return { printOrders, printPending }
}
