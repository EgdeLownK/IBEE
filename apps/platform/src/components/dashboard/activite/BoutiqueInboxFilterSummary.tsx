'use client'

import { useMemo } from 'react'
import {
  buildBoutiqueToTreatSummary,
  type BoutiqueOrderFilter,
  type BoutiqueOrderView,
} from '@/lib/boutique-order-view'

type Props = {
  orders: BoutiqueOrderView[]
  filter: BoutiqueOrderFilter
}

export function BoutiqueInboxFilterSummary({ orders, filter }: Props) {
  const productLines = useMemo(() => {
    if (filter !== 'to-treat') return []

    return buildBoutiqueToTreatSummary(orders).lines.flatMap((line) =>
      line.items.map((item, index) => ({
        key: `${line.orderId}-${index}`,
        name: item.name,
        qty: item.qty,
      })),
    )
  }, [orders, filter])

  if (productLines.length === 0) return null

  return (
    <section className="boutique-inbox__filter-summary" aria-label="Articles à traiter">
      <ul className="boutique-inbox__filter-summary-list">
        {productLines.map((line) => (
          <li key={line.key} className="boutique-inbox__filter-summary-product">
            <span className="boutique-inbox__filter-summary-product-name">{line.name}</span>
            <span className="boutique-inbox__filter-summary-product-qty">× {line.qty}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
