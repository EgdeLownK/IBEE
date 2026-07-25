'use client'

import { Trash2, Plus } from 'lucide-react'
import { useState } from 'react'
import { AddressAutocomplete } from '../AddressAutocomplete'
import type { ProductCreateFormState } from '../types'

type Props = {
  form: ProductCreateFormState
  updateForm: (fn: (prev: ProductCreateFormState) => ProductCreateFormState) => void
  onChange: (patch: Partial<ProductCreateFormState>) => void
}

export function StepTypeSpecific({ form, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<'bullets' | 'details'>('bullets')

  function err(field: string) {
    return form.fieldErrors[field]
  }

  function addBullet() {
    if (form.bullets.length >= 8) return
    onChange({ bullets: [...form.bullets, ''] })
  }

  function addDetailCategory() {
    onChange({
      customDetails: [...form.customDetails, { category: '', items: [{ label: '', value: '' }] }],
    })
  }

  function addDetailItem(catIndex: number) {
    const copy = [...form.customDetails]
    const cat = { ...copy[catIndex]! }
    cat.items = [...cat.items, { label: '', value: '' }]
    copy[catIndex] = cat
    onChange({ customDetails: copy })
  }

  return (
    <section className="pco__stage">
      {form.type === 'digital' ? (
        <>
          <p className="pco__hint-block">
            Le téléversement de fichiers pour les produits digitaux n&apos;est pas disponible pour
            le moment.
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
              Décoche pour limiter le nombre de licences vendues (ex. places à un atelier en
              replay).
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
        </>
      ) : (
        <>
          <div className="pco__field border-b border-neutral-200 pb-8">
            <span className="pco__label mb-3">
              Modes de remise <span className="pco__req">*</span>
            </span>
            <div className="flex flex-col gap-3 md:flex-row">
              <label
                className={`flex-1 flex flex-col cursor-pointer border p-4 rounded-md transition-all ${form.inPersonEnabled ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.inPersonEnabled}
                    onChange={(e) => onChange({ inPersonEnabled: e.target.checked })}
                    className="accent-neutral-900 w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Main propre</span>
                </div>
                <span className="text-xs text-neutral-500 mt-1 pl-7">Remise en main propre</span>
              </label>
              <label
                className={`flex-1 flex flex-col cursor-pointer border p-4 rounded-md transition-all ${form.pickupEnabled ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.pickupEnabled}
                    onChange={(e) => onChange({ pickupEnabled: e.target.checked })}
                    className="accent-neutral-900 w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Click & Collect</span>
                </div>
                <span className="text-xs text-neutral-500 mt-1 pl-7">Retrait en boutique</span>
              </label>
              <label
                className={`flex-1 flex flex-col cursor-pointer border p-4 rounded-md transition-all ${form.deliveryEnabled ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.deliveryEnabled}
                    onChange={(e) => onChange({ deliveryEnabled: e.target.checked })}
                    className="accent-neutral-900 w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Livraison</span>
                </div>
                <span className="text-xs text-neutral-500 mt-1 pl-7">Expédition au client</span>
              </label>
            </div>
            {form.pickupEnabled ? (
              <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-md animate-in fade-in slide-in-from-top-2">
                <label className="pco__label" htmlFor="pco-pickup">
                  Lieu de retrait pour le Click-and-collect <span className="pco__req">*</span>
                </label>
                <AddressAutocomplete
                  id="pco-pickup"
                  className="pco__input mt-1"
                  placeholder="Ville, point de retrait..."
                  value={form.physicalPickupLocation}
                  onChange={(val) => onChange({ physicalPickupLocation: val })}
                />
                {err('physical_pickup_location') ? (
                  <p className="pco__error mt-1">{err('physical_pickup_location')}</p>
                ) : null}
              </div>
            ) : null}
            {err('pickup_enabled') ? (
              <p className="pco__error mt-2">{err('pickup_enabled')}</p>
            ) : null}
          </div>
        </>
      )}

      <div className="pco__field mt-6">
        <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              activeTab === 'bullets'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => setActiveTab('bullets')}
          >
            Points forts
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              activeTab === 'details'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Informations produits
          </button>
        </div>

        {activeTab === 'bullets' && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-700">
                Points forts <span className="pco__hint">(max 8, 100 car. chacun)</span>{' '}
                <span className="pco__counter">{form.bullets.length}/8</span>
              </span>
              {form.bullets.length < 8 ? (
                <button
                  type="button"
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                  onClick={addBullet}
                >
                  <Plus className="h-3 w-3" /> Ajouter un point
                </button>
              ) : null}
            </div>
            <div className="pco__bullets">
              {form.bullets.map((b, i) => (
                <div key={i} className="pco__bullet-row">
                  <input
                    type="text"
                    maxLength={100}
                    className="pco__input"
                    placeholder="Ex : Livraison sous 48 h"
                    value={b}
                    onChange={(e) => {
                      const copy = [...form.bullets]
                      copy[i] = e.target.value
                      onChange({ bullets: copy })
                    }}
                  />
                  <button
                    type="button"
                    className="pco__icon-btn"
                    aria-label="Supprimer"
                    onClick={() => onChange({ bullets: form.bullets.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {err('bullet_points') ? (
              <p className="pco__error mt-2">{err('bullet_points')}</p>
            ) : null}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-700">Informations produits</span>
              <button
                type="button"
                className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                onClick={addDetailCategory}
              >
                <Plus className="h-3 w-3" /> Ajouter un groupe d&apos;informations
              </button>
            </div>
            <div className="pco__attr-pairs mt-3 flex flex-col gap-6">
              {form.customDetails.map((cat, catIndex) => (
                <div
                  key={catIndex}
                  className="bg-neutral-50 p-4 rounded-md border border-neutral-200"
                >
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      maxLength={40}
                      className="pco__input font-medium"
                      placeholder="Nom du groupe (ex: Spécifications)"
                      value={cat.category}
                      onChange={(e) => {
                        const copy = [...form.customDetails]
                        copy[catIndex] = { ...cat, category: e.target.value }
                        onChange({ customDetails: copy })
                      }}
                    />
                    <button
                      type="button"
                      className="pco__icon-btn bg-white"
                      aria-label="Supprimer ce groupe"
                      onClick={() =>
                        onChange({
                          customDetails: form.customDetails.filter((_, j) => j !== catIndex),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pl-4 border-l-2 border-neutral-200">
                    {cat.items.map((d, i) => (
                      <div key={i} className="pco__pair-row !mt-0">
                        <input
                          type="text"
                          maxLength={40}
                          className="pco__input bg-white"
                          placeholder="Libellé (ex: Poids)"
                          value={d.label}
                          onChange={(e) => {
                            const copy = [...form.customDetails]
                            const updatedCat = { ...cat, items: [...cat.items] }
                            updatedCat.items[i] = { ...d, label: e.target.value }
                            copy[catIndex] = updatedCat
                            onChange({ customDetails: copy })
                          }}
                        />
                        <input
                          type="text"
                          maxLength={100}
                          className="pco__input bg-white"
                          placeholder="Valeur (ex: 200g)"
                          value={d.value}
                          onChange={(e) => {
                            const copy = [...form.customDetails]
                            const updatedCat = { ...cat, items: [...cat.items] }
                            updatedCat.items[i] = { ...d, value: e.target.value }
                            copy[catIndex] = updatedCat
                            onChange({ customDetails: copy })
                          }}
                        />
                        <button
                          type="button"
                          className="pco__icon-btn bg-white"
                          aria-label="Supprimer"
                          onClick={() => {
                            const copy = [...form.customDetails]
                            const updatedCat = {
                              ...cat,
                              items: cat.items.filter((_, j) => j !== i),
                            }
                            copy[catIndex] = updatedCat
                            onChange({ customDetails: copy })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 w-fit mt-1"
                      onClick={() => addDetailItem(catIndex)}
                    >
                      <Plus className="h-3 w-3" /> Ajouter une information
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {err('custom_details') ? (
              <p className="pco__error mt-2">{err('custom_details')}</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
