'use client'

import { Plus, Trash2, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PHYSICAL_CONDITIONS } from '@ibee/shared'
import { AddressAutocomplete } from '../AddressAutocomplete'
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

function OptionRow({
  opt,
  index,
  onChangeName,
  onChangeValues,
}: {
  opt: { name?: string; values?: string[] }
  index: number
  onChangeName: (v: string) => void
  onChangeValues: (v: string[]) => void
}) {
  const [val, setVal] = useState('')
  const optName = opt.name || ''
  const optValues = opt.values || []

  useEffect(() => {
    if (optName === '' && optValues.length === 0) {
      setVal('')
    }
  }, [optName, optValues.length])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const v = val.trim()
      if (v && !optValues.includes(v)) {
        onChangeValues([...optValues, v])
      }
      setVal('')
    } else if (e.key === 'Backspace' && val === '' && optValues.length > 0) {
      const copy = [...optValues]
      copy.pop()
      onChangeValues(copy)
    }
  }

  function removeValue(indexToRemove: number) {
    const copy = [...optValues]
    copy.splice(indexToRemove, 1)
    onChangeValues(copy)
  }

  return (
    <div className="flex gap-3 items-start">
      <input
        type="text"
        placeholder="Nom (ex: Couleur)"
        className="pco__input flex-1"
        value={optName}
        onChange={(e) => onChangeName(e.target.value)}
      />
      <div 
        className="pco__input flex-[2] flex flex-wrap gap-1 items-center cursor-text !py-1 min-h-[38px]" 
        onClick={() => document.getElementById(`opt-input-${index}`)?.focus()}
      >
        {optValues.map((v, i) => (
          <span key={i} className="flex items-center gap-1 bg-neutral-100 text-sm px-2 py-0.5 rounded border border-neutral-200">
            {v}
            <button type="button" onClick={() => removeValue(i)} className="text-neutral-500 hover:text-neutral-900"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          id={`opt-input-${index}`}
          type="text"
          placeholder={optValues.length === 0 ? "Valeurs (ex: Rouge)" : ""}
          className="flex-1 bg-transparent border-none outline-none min-w-[80px] text-sm"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}

export function StepTypeSpecific({ form, onChange }: Props) {
  function err(field: string) {
    return form.fieldErrors[field]
  }

  function variantErr(vi: number) {
    for (const key of Object.keys(form.fieldErrors)) {
      if (key.startsWith(`variants_${vi}_`)) {
        return "Une erreur est présente dans cette variante ou ses sous-variantes (prix, stock, sku, attribut manquant, prix remisé)."
      }
    }
    return null
  }

  function handleOptionNameChange(index: number, name: string) {
    const copy = [...form.variantOptions]
    copy[index] = { ...copy[index]!, name }
    onChange({ variantOptions: copy })
  }

  function generateVariants() {
    const maxOpts = form.variationMode === 'subvariants' ? 2 : 1
    const defaultOpts = form.variationMode === 'subvariants' ? [{ name: '', values: [] }, { name: '', values: [] }] : [{ name: '', values: [] }]
    const optsToProcess = (form.variantOptions.length >= maxOpts ? form.variantOptions : defaultOpts).slice(0, maxOpts)
    
    const validOptions = optsToProcess.map((o, i) => {
      const vals = [...(o.values || [])]
      const input = document.getElementById(`opt-input-${i}`) as HTMLInputElement
      if (input && input.value.trim()) {
        const v = input.value.trim()
        if (!vals.includes(v)) vals.push(v)
      }
      return { ...o, values: vals }
    }).filter(o => o.values.length > 0)

    if (validOptions.length === 0) {
      return
    }

    let newVariantsToAdd: typeof form.variants = []

    if (form.variationMode === 'subvariants' && validOptions.length === 2) {
      const key1 = validOptions[0]!.name.trim() || 'Option 1'
      const key2 = validOptions[1]!.name.trim() || 'Option 2'
      
      newVariantsToAdd = validOptions[0]!.values.map(val1 => {
        const subVariants = validOptions[1]!.values.map(val2 => {
          return { id: nextId('sv'), key: key2, value: val2, sku: '', price: '', stock: '', promoEnabled: false, salePrice: '', saleEndsAt: '' }
        })
        return { id: nextId('v'), pairs: [{ key: key1, value: val1 }], sku: '', price: '', stock: '', promoEnabled: false, salePrice: '', saleEndsAt: '', subVariants }
      })
    } else {
      const combine = (options: typeof validOptions, currentIndex: number): {key: string; value: string}[][] => {
        if (currentIndex === options.length) return [[]]
        const currentOpt = options[currentIndex]!
        const subsequent = combine(options, currentIndex + 1)
        const results: {key: string; value: string}[][] = []
        const keyName = currentOpt.name.trim() || 'Variante'
        for (const val of currentOpt.values) {
          for (const sub of subsequent) {
            results.push([{ key: keyName, value: val }, ...sub])
          }
        }
        return results
      }

      const combinations = combine(validOptions, 0)
      newVariantsToAdd = combinations.map((pairs) => {
        return { id: nextId('v'), pairs, sku: '', price: '', stock: '', promoEnabled: false, salePrice: '', saleEndsAt: '' }
      })
    }
    
    // Append to existing variants, respecting max 20
    const combinedVariants = [...form.variants, ...newVariantsToAdd].slice(0, 20)

    onChange({ 
      variants: combinedVariants,
      variantOptions: form.variationMode === 'subvariants' ? [{ name: '', values: [] }, { name: '', values: [] }] : [{ name: '', values: [] }] // Reset input
    })
    
    // Clear DOM inputs
    form.variantOptions.forEach((_, i) => {
      const input = document.getElementById(`opt-input-${i}`) as HTMLInputElement
      if (input) input.value = ''
    })
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

      </section>
    )
  }

  return (
    <section className="pco__stage">
      {form.type === 'physical' ? (
        <div className="pco__field border-b border-neutral-200 pb-8">
          <span className="pco__label mb-3">
            Modes de remise <span className="pco__req">*</span>
          </span>
          <div className="flex flex-col gap-3 md:flex-row">
            <label className={`flex-1 flex flex-col cursor-pointer border p-4 rounded-md transition-all ${form.inPersonEnabled ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
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
            <label className={`flex-1 flex flex-col cursor-pointer border p-4 rounded-md transition-all ${form.pickupEnabled ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
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
            <label className={`flex-1 flex flex-col cursor-pointer border p-4 rounded-md transition-all ${form.deliveryEnabled ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
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
          {err('pickup_enabled') ? <p className="pco__error mt-2">{err('pickup_enabled')}</p> : null}
        </div>
      ) : null}

      <div className="pco__field">
        <label className="pco__label mb-3">Type d'article</label>
        <div className="flex bg-neutral-100 p-1 rounded-lg mb-6">
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              form.audience === 'men'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => onChange({ audience: 'men' })}
          >
            Homme
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              form.audience === 'women'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => onChange({ audience: 'women' })}
          >
            Femme
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${
              form.audience === 'unisex'
                ? 'bg-white shadow-sm text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            onClick={() => onChange({ audience: 'unisex' })}
          >
            Mixte
          </button>
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${form.variationMode === 'unique' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={() => onChange({ variationMode: 'unique' })}
          >
            Article unique
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${form.variationMode === 'variants' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={() => onChange({ variationMode: 'variants' })}
          >
            Avec variantes
          </button>
          <button
            type="button"
            className={`flex-1 text-sm font-medium py-2 px-2 md:px-4 rounded-md transition-all ${form.variationMode === 'subvariants' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            onClick={() => onChange({ variationMode: 'subvariants' })}
          >
            Variantes multiples
          </button>
        </div>
        <div className="mt-3 px-1 text-sm text-neutral-500">
          {form.variationMode === 'unique' && <p>Un seul article sans variantes (ex: un livre, une oeuvre originale).</p>}
          {form.variationMode === 'variants' && <p>Un article avec un choix simple (ex: T-shirt noir décliné en différentes tailles).</p>}
          {form.variationMode === 'subvariants' && <p>Un article avec un choix double (ex: T-shirt avec des déclinaisons de couleurs, et pour chaque couleur différentes tailles).</p>}
        </div>
      </div>

      {form.variationMode === 'unique' && (
        <div className="bg-neutral-50 p-5 rounded-md border border-neutral-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="pco__label">Prix (€) <span className="pco__req">*</span></label>
              <input type="number" min={0} step={0.01} className="pco__input" value={form.price} onChange={(e) => onChange({ price: e.target.value })} />
              {err('price') ? <p className="pco__error text-xs">{err('price')}</p> : null}
            </div>
            <div className="flex-1">
              <label className="pco__label">Stock</label>
              <input type="number" min={0} step={1} className="pco__input" value={form.physicalStockQuantity} onChange={(e) => onChange({ physicalStockQuantity: e.target.value })} />
              {err('physical_stock_quantity') ? <p className="pco__error text-xs">{err('physical_stock_quantity')}</p> : null}
            </div>
          </div>
          
          <div className="pco__field mb-4">
            <label className="pco__label">Condition du produit</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={form.physicalCondition === 'new'} onChange={() => onChange({ physicalCondition: 'new' })} className="accent-neutral-900" />
                <span className="text-sm">Neuf</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={form.physicalCondition !== 'new'} onChange={() => onChange({ physicalCondition: 'good' })} className="accent-neutral-900" />
                <span className="text-sm">D'occasion</span>
              </label>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-4 mt-2">
            <label className="pco__check">
              <input type="checkbox" checked={form.promoEnabled} onChange={(e) => onChange({ promoEnabled: e.target.checked })} />
              <span className="font-medium text-sm">Activer une promotion</span>
            </label>
            {form.promoEnabled && (
              <div className="flex gap-4 mt-3 pl-6">
                <div className="flex-1">
                  <label className="pco__label">Prix remisé (€)</label>
                  <input type="number" min={0} step={0.01} className="pco__input" value={form.salePrice} onChange={(e) => onChange({ salePrice: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="pco__label">Date de fin (optionnel)</label>
                  <input type="date" className="pco__input" value={form.saleEndsAt ? new Date(form.saleEndsAt).toISOString().split('T')[0] : ''} onChange={(e) => onChange({ saleEndsAt: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {form.variationMode !== 'unique' && (
        <div className="pco__field animate-in fade-in slide-in-from-top-4">
          <span className="pco__label mb-2">
            Générateur de variantes principales
          </span>

          {/* Generator */}
          {form.variationMode === 'variants' ? (
            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 mb-6">
              <h4 className="text-sm font-medium mb-3">
                Option de l'article (ex: Taille)
              </h4>
              <div className="flex flex-col gap-3">
                {(() => {
                  const optsToRender = (form.variantOptions.length >= 1 ? form.variantOptions : [{ name: '', values: [] }]).slice(0, 1)
                  return optsToRender.map((opt, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <OptionRow
                        opt={opt}
                        index={i}
                        onChangeName={(name) => handleOptionNameChange(i, name)}
                        onChangeValues={(values) => {
                          const copy = [...form.variantOptions]
                          if (!copy[i]) copy[i] = { name: '', values: [] }
                          copy[i] = { ...copy[i]!, values }
                          onChange({ variantOptions: copy })
                        }}
                      />
                    </div>
                  ))
                })()}
                <button 
                  type="button" 
                  className="mt-2 py-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition w-full"
                  onClick={generateVariants}
                >
                  Générer
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <button 
                type="button" 
                className="py-2 px-4 bg-neutral-100 text-neutral-900 border border-neutral-200 text-sm font-medium rounded-md hover:bg-neutral-200 transition w-full flex items-center justify-center gap-2"
                onClick={() => {
                  const newVariant = {
                    id: nextId('v'),
                    pairs: [{ key: '', value: '' }],
                    sku: '', price: '', stock: '1',
                    subVariants: []
                  }
                  onChange({ variants: [...form.variants, newVariant] })
                }}
              >
                <Plus className="h-4 w-4" /> Ajouter un groupe de variantes
              </button>
            </div>
          )}

          {form.variants.length > 0 && (
            <div className="pco__variants">
              <h4 className="text-sm font-medium mb-3">Variantes générées</h4>
              {form.variants.map((v, vi) => (
                <VariantCard 
                  key={v.id}
                  v={v}
                  vi={vi}
                  form={form}
                  onChange={onChange}
                  errorMsg={variantErr(vi)}
                />
              ))}
            </div>
          )}
          {err('variants') ? <p className="pco__error">{err('variants')}</p> : null}
        </div>
      )}

    </section>
  )
}

export function VariantCard({
  v,
  vi,
  form,
  onChange,
  errorMsg,
}: {
  v: import('../types').VariantDraft
  vi: number
  form: import('../types').ProductCreateFormState
  onChange: (u: Partial<import('../types').ProductCreateFormState>) => void
  errorMsg?: string | null
}) {
  const [subOptName, setSubOptName] = useState('')
  const [subOptValues, setSubOptValues] = useState<string[]>([])
  const [currentSubVal, setCurrentSubVal] = useState('')
  const [subPrice, setSubPrice] = useState('')
  const [subStock, setSubStock] = useState('')
  const [subSku, setSubSku] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addVal()
    }
  }

  function handleBlur() {
    addVal()
  }

  function addVal() {
    const val = currentSubVal.trim()
    if (val && !subOptValues.includes(val)) {
      setSubOptValues([...subOptValues, val])
      setCurrentSubVal('')
    }
  }

  function generateSubVariants() {
    if (!subOptName.trim() || subOptValues.length === 0) return

    const newSubs = subOptValues.map((val) => ({
      id: nextId('sub'),
      key: subOptName.trim(),
      value: val,
      price: subPrice || v.price || '',
      stock: subStock || '',
      sku: subSku || '',
      condition: v.condition || 'good'
    }))

    const variants = form.variants.map((x) => {
      if (x.id !== v.id) return x
      return { ...x, subVariants: [...(x.subVariants || []), ...newSubs] }
    })
    onChange({ variants })
    
    // Reset generator
    setSubOptName('')
    setSubOptValues([])
    setCurrentSubVal('')
    setSubPrice('')
    setSubStock('')
    setSubSku('')
  }

  return (
    <div className="pco__variant-card !p-3">
      <div className="flex justify-between items-center mb-3">
        {form.variationMode === 'subvariants' ? (
          <input
            type="text"
            className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none p-0.5 w-full transition-colors font-semibold"
            placeholder="Nom du groupe (ex: Modèle, Couleur)"
            value={v.pairs[0]?.key || ''}
            onChange={(e) => {
              const variants = form.variants.map((x) => {
                if (x.id !== v.id) return x
                const pairs = [...x.pairs]
                if (!pairs[0]) pairs[0] = { key: '', value: '' }
                pairs[0].key = e.target.value
                return { ...x, pairs }
              })
              onChange({ variants })
            }}
          />
        ) : (
          <div className="flex items-center gap-1 font-semibold text-sm">
            <input
              type="text"
              className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none p-0.5 w-24 transition-colors"
              placeholder="Attribut"
              value={v.pairs[0]?.key || ''}
              onChange={(e) => {
                const variants = form.variants.map((x) => {
                  if (x.id !== v.id) return x
                  const pairs = [...x.pairs]
                  if (!pairs[0]) pairs[0] = { key: '', value: '' }
                  pairs[0].key = e.target.value
                  return { ...x, pairs }
                })
                onChange({ variants })
              }}
            />
            <span className="text-neutral-400 mx-1">:</span>
            <input
              type="text"
              className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none p-0.5 w-28 transition-colors"
              placeholder="Valeur"
              value={v.pairs[0]?.value || ''}
              onChange={(e) => {
                const variants = form.variants.map((x) => {
                  if (x.id !== v.id) return x
                  const pairs = [...x.pairs]
                  if (!pairs[0]) pairs[0] = { key: '', value: '' }
                  pairs[0].value = e.target.value
                  return { ...x, pairs }
                })
                onChange({ variants })
              }}
            />
          </div>
        )}
        <button
          type="button"
          className="pco__icon-btn shrink-0 text-red-500 hover:bg-red-50 ml-2"
          onClick={() => onChange({ variants: form.variants.filter((x) => x.id !== v.id) })}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="pt-2">
        {form.variationMode !== 'subvariants' && (!v.subVariants || v.subVariants.length === 0) && (
          <>
            <div className="flex gap-2 mb-3">
              <input
              type="number"
              min={0}
              step={0.01}
              className="pco__input !py-1.5 text-sm"
              placeholder="Prix (€)"
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
              className="pco__input !py-1.5 text-sm w-20"
              placeholder="Stock"
              value={v.stock}
              onChange={(e) => {
                const variants = form.variants.map((x) =>
                  x.id === v.id ? { ...x, stock: e.target.value } : x
                )
                onChange({ variants })
              }}
            />
            <input
              type="text"
              maxLength={80}
              className="pco__input !py-1.5 text-sm"
              placeholder="SKU"
              value={v.sku}
              onChange={(e) => {
                const variants = form.variants.map((x) =>
                  x.id === v.id ? { ...x, sku: e.target.value } : x
                )
                onChange({ variants })
              }}
            />
            {form.physicalCondition !== 'new' && (
              <select
                className="pco__input !py-1.5 text-sm min-w-[120px]"
                value={v.condition || 'good'}
                onChange={(e) => {
                  const variants = form.variants.map((x) =>
                    x.id === v.id ? { ...x, condition: e.target.value } : x
                  )
                  onChange({ variants })
                }}
              >
                {PHYSICAL_CONDITIONS.filter(c => c !== 'new').map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-2 border-t border-neutral-100 pt-2">
            <label className="pco__check">
              <input
                type="checkbox"
                checked={v.promoEnabled || false}
                onChange={(e) => {
                  const variants = form.variants.map((x) =>
                    x.id === v.id ? { ...x, promoEnabled: e.target.checked } : x
                  )
                  onChange({ variants })
                }}
              />
              <span className="font-medium text-xs">Promotion</span>
            </label>
            {v.promoEnabled && (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pco__input !py-1 text-sm w-24 bg-white"
                  placeholder="Prix remisé"
                  value={v.salePrice || ''}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, salePrice: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
                <input
                  type="date"
                  className="pco__input !py-1 text-sm w-36 bg-white"
                  value={v.saleEndsAt ? new Date(v.saleEndsAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const variants = form.variants.map((x) =>
                      x.id === v.id ? { ...x, saleEndsAt: e.target.value } : x
                    )
                    onChange({ variants })
                  }}
                />
              </div>
            )}
          </div>
        </>
        )}

        {v.subVariants && v.subVariants.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            {v.subVariants.map((sub, si) => (
              <SubVariantCard 
                key={sub.id} 
                sub={sub} 
                si={si} 
                v={v} 
                form={form} 
                onChange={onChange} 
              />
            ))}
          </div>
        )}

        {form.variationMode === 'subvariants' && (
          <div className="border border-neutral-200 rounded-md p-3 bg-white mt-2">
            <h5 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
              Ajouter une sous-variante
            </h5>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="pco__input !py-1.5 text-sm w-full"
                placeholder="Valeur (ex: S, M, Bleu...)"
                value={currentSubVal}
                onChange={(e) => setCurrentSubVal(e.target.value)}
              />
              <div className="flex gap-2 mt-1">
                <input
                  type="number" min={0} step={0.01}
                  className="pco__input !py-1.5 text-sm flex-1"
                  placeholder="Prix (€)"
                  value={subPrice}
                  onChange={(e) => setSubPrice(e.target.value)}
                />
                <input
                  type="number" min={0} step={1}
                  className="pco__input !py-1.5 text-sm flex-1"
                  placeholder="Stock"
                  value={subStock}
                  onChange={(e) => setSubStock(e.target.value)}
                />
                <input
                  type="text"
                  maxLength={80}
                  className="pco__input !py-1.5 text-sm flex-1"
                  placeholder="SKU"
                  value={subSku}
                  onChange={(e) => setSubSku(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="mt-2 py-1.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition w-full"
                onClick={() => {
                  if (!currentSubVal.trim()) return
                  const newSub = {
                    id: nextId('sub'),
                    key: v.pairs[0]?.key || '',
                    value: currentSubVal.trim(),
                    price: subPrice || '',
                    stock: subStock || '',
                    sku: subSku || '',
                    condition: v.condition || 'good'
                  }
                  const variants = form.variants.map(x => {
                    if (x.id !== v.id) return x
                    return { ...x, subVariants: [...(x.subVariants || []), newSub] }
                  })
                  onChange({ variants })
                  setCurrentSubVal('')
                  setSubPrice('')
                  setSubStock('')
                  setSubSku('')
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        )}
      </div>
      {errorMsg ? <p className="pco__error mt-2">{errorMsg}</p> : null}
    </div>
  )
}

function SubVariantCard({
  sub,
  si,
  v,
  form,
  onChange,
}: {
  sub: NonNullable<import('../types').VariantDraft['subVariants']>[number]
  si: number
  v: import('../types').VariantDraft
  form: import('../types').ProductCreateFormState
  onChange: (u: Partial<import('../types').ProductCreateFormState>) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-neutral-50 rounded-md border border-neutral-200 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="pco__icon-btn mr-1 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-1 font-medium text-sm">
            <input
              type="text"
              maxLength={40}
              className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none p-0.5 w-24 transition-colors"
              placeholder="Ex: Taille"
              value={sub.key}
              onChange={(e) => {
                const variants = form.variants.map((x) => {
                  if (x.id !== v.id) return x
                  const subs = [...(x.subVariants || [])]
                  subs[si] = { ...subs[si]!, key: e.target.value }
                  return { ...x, subVariants: subs }
                })
                onChange({ variants })
              }}
            />
            <span className="text-neutral-400 mx-1">:</span>
            <input
              type="text"
              maxLength={40}
              className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none p-0.5 w-28 transition-colors"
              placeholder="Ex: M"
              value={sub.value}
              onChange={(e) => {
                const variants = form.variants.map((x) => {
                  if (x.id !== v.id) return x
                  const subs = [...(x.subVariants || [])]
                  subs[si] = { ...subs[si]!, value: e.target.value }
                  return { ...x, subVariants: subs }
                })
                onChange({ variants })
              }}
            />
          </div>
        </div>
        <button
          type="button"
          className="pco__icon-btn shrink-0 text-red-500 hover:bg-red-50"
          onClick={() => {
            const variants = form.variants.map((x) => {
              if (x.id !== v.id) return x
              const subs = (x.subVariants || []).filter((_, idx) => idx !== si)
              return { ...x, subVariants: subs }
            })
            onChange({ variants })
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pl-6">
          <input
            type="number"
            min={0}
            step={0.01}
            className="pco__input !py-1 text-sm w-24 bg-white"
            placeholder="Prix (€)"
            value={sub.price}
            onChange={(e) => {
              const variants = form.variants.map((x) => {
                if (x.id !== v.id) return x
                const subs = [...(x.subVariants || [])]
                subs[si] = { ...subs[si]!, price: e.target.value }
                return { ...x, subVariants: subs }
              })
              onChange({ variants })
            }}
          />
          <input
            type="number"
            min={0}
            step={1}
            className="pco__input !py-1 text-sm w-20 bg-white"
            placeholder="Stock"
            value={sub.stock}
            onChange={(e) => {
              const variants = form.variants.map((x) => {
                if (x.id !== v.id) return x
                const subs = [...(x.subVariants || [])]
                subs[si] = { ...subs[si]!, stock: e.target.value }
                return { ...x, subVariants: subs }
              })
              onChange({ variants })
            }}
          />
          <input
            type="text"
            maxLength={80}
            className="pco__input !py-1 text-sm w-32 bg-white"
            placeholder="SKU"
            value={sub.sku}
            onChange={(e) => {
              const variants = form.variants.map((x) => {
                if (x.id !== v.id) return x
                const subs = [...(x.subVariants || [])]
                subs[si] = { ...subs[si]!, sku: e.target.value }
                return { ...x, subVariants: subs }
              })
              onChange({ variants })
            }}
          />
          {form.physicalCondition !== 'new' && (
            <select
              className="pco__input !py-1 text-sm min-w-[120px] bg-white"
              value={sub.condition || 'good'}
              onChange={(e) => {
                const variants = form.variants.map((x) => {
                  if (x.id !== v.id) return x
                  const subs = [...(x.subVariants || [])]
                  subs[si] = { ...subs[si]!, condition: e.target.value }
                  return { ...x, subVariants: subs }
                })
                onChange({ variants })
              }}
            >
              {PHYSICAL_CONDITIONS.filter(c => c !== 'new').map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
