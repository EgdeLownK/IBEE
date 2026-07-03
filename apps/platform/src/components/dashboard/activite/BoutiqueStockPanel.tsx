'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import type { BoutiqueStockLine } from '@/lib/boutique-order-view'
import { ActiviteCatalogThumb } from './ActiviteCatalogThumb'

type Props = {
  stockItems: BoutiqueStockLine[]
}

function StockRow({ item }: { item: BoutiqueStockLine }) {
  const current = item.qty ?? 0
  const total = item.totalQty ?? 0
  const fillPercent = item.unlimited
    ? 100
    : total > 0
      ? Math.min(100, Math.round((current / total) * 100))
      : 0

  const barTone = item.unlimited
    ? 'is-unlimited'
    : current === 0
      ? 'is-empty'
      : item.isLow
        ? 'is-low'
        : fillPercent >= 70
          ? 'is-good'
          : 'is-mid'

  return (
    <li className={`boutique-stock-row${item.isLow && !item.unlimited ? ' is-low' : ''}`}>
      <ActiviteCatalogThumb imageUrl={item.imageUrl} alt="" />
      <div className="boutique-stock-row__main">
      <div className="boutique-stock-row__head">
        <p className="boutique-stock-row__name" title={item.name}>
          {item.name}
        </p>
        <p className="boutique-stock-row__type">
          {item.productType === 'digital' ? 'Digital' : 'Physique'}
        </p>
      </div>

      <div className="boutique-stock-row__progress">
        <div className="boutique-stock-row__counts">
          {item.unlimited ? (
            <span className="boutique-stock-row__unlimited">Illimité</span>
          ) : (
            <>
              <span className="boutique-stock-row__current">{current}</span>
              <span className="boutique-stock-row__sep">/</span>
              <span className="boutique-stock-row__total">{total}</span>
            </>
          )}
        </div>
        <div
          className={`boutique-stock-row__meter ${barTone}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={item.unlimited ? 100 : total}
          aria-valuenow={item.unlimited ? 100 : current}
          aria-label={
            item.unlimited
              ? `Stock illimité pour ${item.name}`
              : `Stock ${current} sur ${total} pour ${item.name}`
          }
        >
          <span className="boutique-stock-row__fill" style={{ width: `${fillPercent}%` }} />
        </div>
      </div>
      </div>
    </li>
  )
}

export function BoutiqueStockPanel({ stockItems }: Props) {
  const lowCount = stockItems.filter((item) => item.isLow).length

  return (
    <div className="boutique-side-stock">
      <header className="boutique-side-stock__head">
        <div>
          <p className="boutique-side-stock__subtitle">
            {stockItems.length > 0
              ? `${stockItems.length} référence${stockItems.length > 1 ? 's' : ''}`
              : 'Aucun produit publié'}
            {lowCount > 0 ? ` · ${lowCount} en alerte` : ''}
          </p>
        </div>
        <Link href="/dashboard/site" className="boutique-inbox__stock-link">
          Catalogue
        </Link>
      </header>

      <div className="boutique-side-stock__body">
        {stockItems.length === 0 ? (
          <div className="boutique-side-stock__empty">
            <Package className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Publiez un produit pour gérer le stock ici.</p>
          </div>
        ) : (
          <ul className="boutique-stock-list">
            {stockItems.map((item) => (
              <StockRow key={item.key} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
