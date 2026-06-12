'use client'

import { Download, Package } from 'lucide-react'
import type { ProductCreateFormState, ProductType } from './types'

type Props = {
  form: ProductCreateFormState
  onSelectType: (type: ProductType) => void
}

export function StepTypeSelect({ form, onSelectType }: Props) {
  return (
    <section className="pco__stage">
      <p className="pco__stage-intro">Quel type de produit veux-tu créer ?</p>
      <div className="pco__type-grid">
        <button
          type="button"
          className="pco__type-card"
          onClick={() => onSelectType('physical')}
        >
          <span className="pco__type-icon" aria-hidden="true">
            <Package className="h-6 w-6" />
          </span>
          <span className="pco__type-name">Produit physique</span>
          <span className="pco__type-desc">Stock, retrait ou livraison, variantes</span>
        </button>
        <button
          type="button"
          className="pco__type-card"
          onClick={() => onSelectType('digital')}
        >
          <span className="pco__type-icon" aria-hidden="true">
            <Download className="h-6 w-6" />
          </span>
          <span className="pco__type-name">Produit digital</span>
          <span className="pco__type-desc">Fichier livré par téléchargement</span>
        </button>
      </div>
      {form.fieldErrors.type ? (
        <p className="pco__error" role="alert">
          {form.fieldErrors.type}
        </p>
      ) : null}
    </section>
  )
}
