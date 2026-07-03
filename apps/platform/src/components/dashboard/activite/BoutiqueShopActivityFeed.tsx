'use client'

import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import {
  buildShopRecentActivity,
  formatBoutiqueRelativeTime,
  type BoutiqueOrderView,
} from '@/lib/boutique-order-view'

type Props = {
  orders: BoutiqueOrderView[]
  onSelectOrder: (orderId: string) => void
}

export function BoutiqueShopActivityFeed({ orders, onSelectOrder }: Props) {
  const activity = useMemo(() => buildShopRecentActivity(orders), [orders])

  return (
    <div className="boutique-shop-activity">
      <div className="boutique-shop-activity__body">
        {activity.length === 0 ? (
          <div className="boutique-shop-activity__empty">
            <Activity className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Aucune activité enregistrée pour le moment.</p>
          </div>
        ) : (
          <ol className="boutique-shop-activity__list">
            {activity.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="boutique-shop-activity__item"
                  onClick={() => onSelectOrder(item.orderId)}
                >
                  <span className="boutique-shop-activity__dot" aria-hidden="true" />
                  <span className="boutique-shop-activity__content">
                    <span className="boutique-shop-activity__row">
                      <span className="boutique-shop-activity__event">{item.title}</span>
                      <time className="boutique-shop-activity__when" dateTime={item.at}>
                        {formatBoutiqueRelativeTime(item.at)}
                      </time>
                    </span>
                    <span className="boutique-shop-activity__order">
                      {item.orderRef} · {item.customer}
                    </span>
                    {item.detail ? (
                      <span className="boutique-shop-activity__detail">{item.detail}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
