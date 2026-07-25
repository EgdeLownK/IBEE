'use client'

import Link from 'next/link'
import { Download, FileDigit } from 'lucide-react'
import { formatBoutiqueMoney, type BoutiqueDigitalProductLine } from '@/lib/boutique-order-view'
import { useActivityOverlay } from './ActivityOverlayProvider'

type Props = {
  digitalProducts: BoutiqueDigitalProductLine[]
}

function formatLabel(format: string | null): string {
  if (!format) return 'Fichier'
  return format.toUpperCase()
}

export function BoutiqueDigitalPanel({ digitalProducts }: Props) {
  const { openOverlay } = useActivityOverlay()
  const totalSales = digitalProducts.reduce((sum, product) => sum + product.salesCount, 0)

  return (
    <div className="boutique-side-digital">
      <header className="boutique-side-digital__head">
        <div>
          <p className="boutique-side-digital__subtitle">
            {digitalProducts.length > 0
              ? `${digitalProducts.length} produit${digitalProducts.length > 1 ? 's' : ''} ${digitalProducts.length > 1 ? 'digitaux' : 'digital'}`
              : 'Aucun produit digital publié'}
            {totalSales > 0 ? ` · ${totalSales} vente${totalSales > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="boutique-inbox__stock-link"
          onClick={() => openOverlay('product')}
        >
          Ajouter
        </button>
      </header>

      <div className="boutique-side-digital__body">
        {digitalProducts.length === 0 ? (
          <div className="boutique-side-digital__empty">
            <FileDigit className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Publiez un produit digital pour le voir ici.</p>
            <button
              type="button"
              className="boutique-dash__head-btn"
              onClick={() => openOverlay('product')}
            >
              Ajouter un produit digital
            </button>
          </div>
        ) : (
          <ul className="boutique-digital-list">
            {digitalProducts.map((product) => (
              <li key={product.id} className="boutique-digital-row">
                <div className="boutique-digital-row__main">
                  <p className="boutique-digital-row__name">{product.title}</p>
                  <div className="boutique-digital-row__meta">
                    <span className="boutique-digital-row__format">
                      {formatLabel(product.format)}
                    </span>
                    <span className="boutique-digital-row__price">
                      {formatBoutiqueMoney(product.priceCents, product.currency)}
                    </span>
                  </div>
                </div>

                <div className="boutique-digital-row__stats">
                  <p className="boutique-digital-row__sales">
                    {product.salesCount} vente{product.salesCount > 1 ? 's' : ''}
                  </p>
                  {product.revenueCents > 0 ? (
                    <p className="boutique-digital-row__revenue">
                      {formatBoutiqueMoney(product.revenueCents, product.currency)}
                    </p>
                  ) : null}
                </div>

                <p className="boutique-digital-row__ready">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Prêt à livrer
                </p>

                <Link href="/dashboard/site" className="boutique-digital-row__link">
                  Gérer
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
