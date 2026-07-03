'use client'

import { useState } from 'react'
import { Activity, Package, ShoppingBag } from 'lucide-react'
import {
  countLowStockItems,
  type BoutiqueOrderView,
  type BoutiqueProductLine,
  type BoutiqueStockLine,
} from '@/lib/boutique-order-view'
import { BoutiqueProductsPanel } from './BoutiqueProductsPanel'
import { BoutiqueShopActivityFeed } from './BoutiqueShopActivityFeed'
import { BoutiqueStockPanel } from './BoutiqueStockPanel'

type Tab = 'activity' | 'products' | 'stock'

type Props = {
  orders: BoutiqueOrderView[]
  products: BoutiqueProductLine[]
  stockItems: BoutiqueStockLine[]
  onSelectOrder: (orderId: string) => void
}

export function BoutiqueSidePanel({ orders, products, stockItems, onSelectOrder }: Props) {
  const [tab, setTab] = useState<Tab>('activity')
  const lowStockCount = countLowStockItems(stockItems)

  return (
    <div className="boutique-side-panel">
      <nav className="boutique-side-panel__nav" aria-label="Panneau boutique">
        <button
          type="button"
          className={`boutique-side-panel__tab${tab === 'activity' ? ' is-active' : ''}`}
          onClick={() => setTab('activity')}
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          Activité récente
        </button>
        <button
          type="button"
          className={`boutique-side-panel__tab${tab === 'products' ? ' is-active' : ''}`}
          onClick={() => setTab('products')}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Produits
        </button>
        <button
          type="button"
          className={`boutique-side-panel__tab${tab === 'stock' ? ' is-active' : ''}`}
          onClick={() => setTab('stock')}
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          Stock
          {lowStockCount > 0 ? (
            <span className="boutique-side-panel__badge">{lowStockCount}</span>
          ) : null}
        </button>
      </nav>

      <div className="boutique-side-panel__content">
        {tab === 'activity' ? (
          <BoutiqueShopActivityFeed orders={orders} onSelectOrder={onSelectOrder} />
        ) : tab === 'products' ? (
          <BoutiqueProductsPanel products={products} />
        ) : (
          <BoutiqueStockPanel stockItems={stockItems} />
        )}
      </div>
    </div>
  )
}
