'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import type { BoutiqueProductLine } from '@/lib/boutique-order-view'
import { ActiviteCatalogThumb } from './ActiviteCatalogThumb'

type Props = {
  products: BoutiqueProductLine[]
}

function ProductRow({ product }: { product: BoutiqueProductLine }) {
  return (
    <li className="boutique-product-row">
      <ActiviteCatalogThumb imageUrl={product.imageUrl} alt="" />

      <div className="boutique-product-row__main">
        <p className="boutique-product-row__name" title={product.title}>
          {product.title}
        </p>
        <p className="boutique-product-row__type">
          {product.type === 'digital' ? 'Digital' : 'Physique'}
        </p>
      </div>

      <Link href="/dashboard/site" className="boutique-product-row__link">
        Gérer
      </Link>
    </li>
  )
}

export function BoutiqueProductsPanel({ products }: Props) {
  const physicalCount = products.filter((product) => product.type === 'physical').length
  const digitalCount = products.length - physicalCount

  return (
    <div className="boutique-side-products">
      <header className="boutique-side-products__head">
        <p className="boutique-side-products__subtitle">
          {products.length > 0
            ? `${products.length} produit${products.length > 1 ? 's' : ''}`
            : 'Aucun produit publié'}
          {products.length > 0
            ? ` · ${physicalCount} physique${physicalCount > 1 ? 's' : ''} · ${digitalCount} ${digitalCount > 1 ? 'digitaux' : 'digital'}`
            : ''}
        </p>
      </header>

      <div className="boutique-side-products__body">
        {products.length === 0 ? (
          <div className="boutique-side-products__empty">
            <ShoppingBag className="h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p>Publiez un produit pour le voir ici.</p>
          </div>
        ) : (
          <ul className="boutique-product-list">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
