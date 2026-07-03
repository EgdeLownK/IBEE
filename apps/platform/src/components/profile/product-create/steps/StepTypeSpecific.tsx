'use client'

import { Plus, Trash2 } from 'lucide-react'
import { PHYSICAL_CONDITIONS } from '@ibee/shared'
import type { ProductCreateFormState } from '../types'
import { nextId } from '../utils'

type Props = {
  form: ProductCreateFormState
  updateForm: (fn: (prev: ProductCreateFormState) => ProductCreateFormState) => void
  onChange: (patch: Partial<ProductCreateFormState>) => void
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  very_good: 'Très bon état',
  good: 'Bon état',
  acceptable: 'Correct',
}

export function StepTypeSpecific({ form, onChange }: Props) {
  function err(field: string) {
    return form.fieldErrors[field]
  }

  function variantErr(index: number, suffix = 'attributes') {
    return form.fieldErrors[`variants_${index}_${suffix}`]
  }

  function addVariant() {
    if (form.variants.length >= 20) return
    onChange({
      variants: [
        ...form.variants,
        { id: nextId('v'), pairs: [{ key: '', value: '' }], sku: '', price: '', stock: '' },
      ],
    })
  }

  function addDetail() {
    if (form.customDetails.length >= 8) return
    onChange({ customDetails: [...form.customDetails, { label: '', value: '' }] })
  }

  if (form.type === 'digital') {
    return (
      <section className="pco__stage">
        <p className="pco__hint-block">
          Le téléversement de fichiers pour les produits digitaux n&apos;est pas disponible pour le
          moment.
        </p>
        {err('digital_file_id') ? <p className="pco__error">{err('digital_file_id')}</p> : null}

        <div className="pco__field">
          <label className="pco__check-row">
            <input
              type="checkbox"
              checked={form.digitalStockUnlimited}
              onChange={(e) => onChange({ digitalStockUnlimited: e.target.checked })}
            />
            <span>Ventes illimitées</span>
          </label>
          <p className="pco__hint">
            Décoche pour limiter le nombre de licences vendues (ex. places à un atelier en replay).
          </p>
        </div>

        {!form.digitalStockUnlimited ? (
          <div className="pco__field">
            <label className="pco__label" htmlFor="pco-digital-stock">
              Quantité disponible
            </label>
            <input
              id="pco-digital-stock"
              type="number"
              min={0}
              step={1}
              className="pco__input"
              value={form.physicalStockQuantity}
              onChange={(e) => onChange({ physicalStockQuantity: e.target.value })}
            />
            {err('digital_stock_quantity') ? (
              <p className="pco__error">{err('digital_stock_quantity')}</p>
            ) : null}
          </div>
        ) : null}

        <div className="pco__field">
          <span className="pco__label">
            Détails personnalisés{' '}
            <span className="pco__hint">(max 8 — ex : Licence, Mises à jour…)</span>{' '}
            <span className="pco__counter">{form.customDetails.length}/8</span>
          </span>
          <div className="pco__attr-pairs">
            {form.customDetails.map((d, i) => (
              <div key={i} className="pco__pair-row">
                <input
                  type="text"
                  maxLength={40}
                  className="pco__input"
                  placeholder="Libellé"
                  value={d.label}
                  onChange={(e) => {
                    const copy = [...form.customDetails]
                    copy[i] = { ...copy[i]!, label: e.target.value }
                    onChange({ customDetails: copy })
                  }}
                />
                <input
                  type="text"
                  maxLength={100}
                  className="pco__input"
                  placeholder="Valeur"
                  value={d.value}
                  onChange={(e) => {
                    const copy = [...form.customDetails]
                    copy[i] = { ...copy[i]!, value: e.target.value }
                    onChange({ customDetails: copy })
                  }}
                />
                <button
                  type="button"
                  className="pco__icon-btn"
                  aria-label="Supprimer"
                  onClick={() =>
                    onChange({ customDetails: form.customDetails.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {form.customDetails.length < 8 ? (
            <button type="button" className="pco__add-btn" onClick={addDetail}>
              <Plus className="h-4 w-4" /> Ajouter un détail
            </button>
          ) : null}
          {err('custom_details') ? <p className="pco__error">{err('custom_details')}</p> : null}
        </div>
      </section>
    )
  }

  return (
    <section className="pco__stage">
      <div className="pco__row">
        <div className="pco__field">
          <label className="pco__label" htmlFor="pco-stock">
            Quantité en stock
          </label>
          <input
            id="pco-stock"
            type="number"
            min={0}
            step={1}
            className="pco__input"
            value={form.physicalStockQuantity}
            onChange={(e) => onChange({ physicalStockQuantity: e.target.value })}
          />
          {err('physical_stock_quantity') ? (
            <p className="pco__error">{err('physical_stock_quantity')}</p>
          ) : null}
        </div>
        <div className="pco__field">
          <label className="pco__label" htmlFor="pco-condition">
            État
          </label>
          <select
            id="pco-condition"
            className="pco__input"
            value={form.physicalCondition}
            onChange={(e) =>
              onChange({
                physicalCondition: e.target.value as ProductCreateFormState['physicalCondition'],
              })
            }
          >
            {PHYSICAL_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          {err('physical_condition') ? <p className="pco__error">{err('physical_condition')}</p> : null}
        </div>
      </div>

      <div className="pco__field">
        <span className="pco__label">
          Variantes <span className="pco__hint">(max 20, optionnel)</span>
        </span>
        <div className="pco__variants">
          {form.variants.map((v, vi) => (
            <div key={v.id} className="pco__variant-card">
              <div className="pco__variant-head">
                <span className="pco__variant-title">Variante {vi + 1}</span>
                <button
                  type="button"
                  className="pco__icon-btn"
                  aria-label="Supprimer la variante"
                  onClick={() =>
                    onChange({ variants: form.variants.filter((x) => x.id !== v.id) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {v.pairs.map((p, pi) => (
                <div key={pi} className="pco__pair-row">
                  <input
                    type="text"
                    maxLength={40}
                    className="pco__input"
                    placeholder="Attribut (ex : Taille)"
                    value={p.key}
                    onChange={(e) => {
                      const variants = form.variants.map((x) => {
                        if (x.id !== v.id) return x
                        const pairs = [...x.pairs]
                        pairs[pi] = { ...pairs[pi]!, key: e.target.value }
                        return { ...x, pairs }
                      })
                      onChange({ variants })
                    }}
                  />
                  <input
                    type="text"
                    maxLength={40}
                    className="pco__input"
                    placeholder="Valeur (ex : M)"
                    value={p.value}
                    onChange={(e) => {
                      const variants = form.variants.map((x) => {
                        if (x.id !== v.id) return x
                        const pairs = [...x.pairs]
                        pairs[pi] = { ...pairs[pi]!, value: e.target.value }
                        return { ...x, pairs }
                      })
                      onChange({ variants })
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="pco__add-btn pco__add-btn--inline"
                onClick={() => {
                  const variants = form.variants.map((x) =>
                    x.id === v.id ? { ...x, pairs: [...x.pairs, { key: '', value: '' }] } : x
                  )
                  onChange({ variants })
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Attribut
              </button>
              <div className="pco__row">
                <input
                  type="text"
                  maxLength={80}
                  className="pco__input"
                  placeholder="SKU (optionnel)"
                  value={v.sku}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, sku: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pco__input"
                  placeholder="Prix variante €"
                  value={v.price}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, price: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="pco__input"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, stock: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
              </div>
              {variantErr(vi) ? <p className="pco__error">{variantErr(vi)}</p> : null}
            </div>
          ))}
        </div>
        {form.variants.length < 20 ? (
          <button type="button" className="pco__add-btn" onClick={addVariant}>
            <Plus className="h-4 w-4" /> Ajouter une variante
          </button>
        ) : null}
        {err('variants') ? <p className="pco__error">{err('variants')}</p> : null}
      </div>
    </section>
  )
}
