'use client'

import { Plus, Trash2, X } from 'lucide-react'
import { useState, useEffect } from 'react'
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

function OptionRow({
  opt,
  index,
  onChangeName,
  onChangeValues,
}: {
  opt: { name: string; values: string[] }
  index: number
  onChangeName: (v: string) => void
  onChangeValues: (v: string[]) => void
}) {
  const [val, setVal] = useState('')

  useEffect(() => {
    if (opt.name === '' && opt.values.length === 0) {
      setVal('')
    }
  }, [opt.name, opt.values.length])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const v = val.trim()
      if (v && !opt.values.includes(v)) {
        onChangeValues([...opt.values, v])
      }
      setVal('')
    } else if (e.key === 'Backspace' && val === '' && opt.values.length > 0) {
      const copy = [...opt.values]
      copy.pop()
      onChangeValues(copy)
    }
  }

  function removeValue(index: number) {
    const copy = [...opt.values]
    copy.splice(index, 1)
    onChangeValues(copy)
  }

  return (
    <div className="flex gap-3 items-start">
      <input
        type="text"
        placeholder="Nom (ex: Couleur)"
        className="pco__input flex-1"
        value={opt.name}
        onChange={(e) => onChangeName(e.target.value)}
      />
      <div 
        className="pco__input flex-[2] flex flex-wrap gap-1 items-center cursor-text !py-1 min-h-[38px]" 
        onClick={() => document.getElementById(`opt-input-${index}`)?.focus()}
      >
        {opt.values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 bg-neutral-100 text-sm px-2 py-0.5 rounded border border-neutral-200">
            {v}
            <button type="button" onClick={() => removeValue(i)} className="text-neutral-500 hover:text-neutral-900"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          id={`opt-input-${index}`}
          type="text"
          placeholder={opt.values.length === 0 ? "Valeurs (ex: Rouge)" : ""}
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
    let offset = 0
    for (let i = 0; i < vi; i++) {
      const v = form.variants[i]!
      offset += (v.subVariants && v.subVariants.length > 0) ? v.subVariants.length : 1
    }
    const currentCount = (form.variants[vi]!.subVariants && form.variants[vi]!.subVariants!.length > 0) 
      ? form.variants[vi]!.subVariants!.length 
      : 1
    
    for (let i = 0; i < currentCount; i++) {
      const idx = offset + i
      for (const key of Object.keys(form.fieldErrors)) {
         if (key.startsWith(`variants_${idx}_`)) {
            return "Une erreur est présente dans cette variante ou ses sous-variantes (prix, stock, sku ou attribut manquant)."
         }
      }
    }
    return null
  }

  function addDetail() {
    if (form.customDetails.length >= 8) return
    onChange({ customDetails: [...form.customDetails, { label: '', value: '' }] })
  }

  function handleOptionNameChange(index: number, name: string) {
    const copy = [...form.variantOptions]
    copy[index] = { ...copy[index]!, name }
    onChange({ variantOptions: copy })
  }

  function generateVariants() {
    const validOptions = form.variantOptions.map((o, i) => {
      const vals = [...o.values]
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

    // recursive combination
    const combine = (options: typeof validOptions, currentIndex: number): {key: string; value: string}[][] => {
      if (currentIndex === options.length) return [[]]
      const currentOpt = options[currentIndex]!
      const subsequent = combine(options, currentIndex + 1)
      const results: {key: string; value: string}[][] = []
      // Use "Variante" as default name if empty
      const keyName = currentOpt.name.trim() || 'Variante'
      for (const val of currentOpt.values) {
        for (const sub of subsequent) {
          results.push([{ key: keyName, value: val }, ...sub])
        }
      }
      return results
    }

    const combinations = combine(validOptions, 0)
    const newVariantsToAdd = combinations.map((pairs) => {
      return { id: nextId('v'), pairs, sku: '', price: '', stock: '' }
    })
    
    // Append to existing variants, respecting max 20
    const combinedVariants = [...form.variants, ...newVariantsToAdd].slice(0, 20)

    onChange({ 
      variants: combinedVariants,
      variantOptions: [{ name: '', values: [] }] // Reset input
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
      <div className="pco__field">
        <label className="pco__label">Condition du produit</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="condition"
              value="new"
              checked={form.physicalCondition === 'new'}
              onChange={() => onChange({ physicalCondition: 'new' })}
              className="accent-neutral-900"
            />
            <span className="text-sm">Neuf</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="condition"
              value="good"
              checked={form.physicalCondition !== 'new'}
              onChange={() => onChange({ physicalCondition: 'good' })}
              className="accent-neutral-900"
            />
            <span className="text-sm">D'occasion</span>
          </label>
        </div>
        {err('physical_condition') ? <p className="pco__error">{err('physical_condition')}</p> : null}
      </div>

      <div className="pco__field mt-8">
        <span className="pco__label">
          Variantes <span className="pco__hint">(ex: Taille, Couleur)</span>
        </span>

        {/* Generator */}
        <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 mb-6">
          <h4 className="text-sm font-medium mb-3">Options du produit</h4>
          <div className="flex flex-col gap-3">
            {form.variantOptions.slice(0, 1).map((opt, i) => (
              <OptionRow
                key={i}
                opt={opt}
                index={i}
                onChangeName={(name) => handleOptionNameChange(i, name)}
                onChangeValues={(values) => {
                  const copy = [...form.variantOptions]
                  copy[i] = { ...copy[i]!, values }
                  onChange({ variantOptions: copy })
                }}
              />
            ))}
            <button 
              type="button" 
              className="mt-2 py-2 px-4 bg-neutral-900 text-white text-sm rounded-md hover:bg-neutral-800 transition w-full"
              onClick={generateVariants}
            >
              Ajouter à la liste (max 20)
            </button>
          </div>
        </div>

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
      price: v.price || '',
      stock: '',
      sku: '',
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
  }

  return (
    <div className="pco__variant-card !p-3">
      <div className="flex justify-between items-center mb-3">
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
        <button
          type="button"
          className="pco__icon-btn shrink-0 text-red-500 hover:bg-red-50"
          onClick={() => onChange({ variants: form.variants.filter((x) => x.id !== v.id) })}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="pt-2">
        {(!v.subVariants || v.subVariants.length === 0) && (
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

        <div className="border border-neutral-200 rounded-md p-3 bg-white mt-2">
          <h5 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
            Générer des sous-variantes
          </h5>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="pco__input !py-1.5 text-sm w-full"
              placeholder="Nom (ex: Taille)"
              value={subOptName}
              onChange={(e) => setSubOptName(e.target.value)}
            />
            <div className="border border-neutral-200 rounded-md p-2 bg-neutral-50">
              <div className="flex flex-wrap gap-1 mb-1">
                {subOptValues.map((val, vi) => (
                  <span key={vi} className="inline-flex items-center gap-1 bg-white border border-neutral-200 text-xs px-2 py-1 rounded-md">
                    {val}
                    <button
                      type="button"
                      onClick={() => setSubOptValues(subOptValues.filter((_, i) => i !== vi))}
                    >
                      <X className="h-3 w-3 text-neutral-400 hover:text-neutral-900" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="bg-transparent text-sm w-full outline-none placeholder:text-neutral-400"
                placeholder="Valeurs (ex: S, M, L...)"
                value={currentSubVal}
                onChange={(e) => setCurrentSubVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
              />
            </div>
            <button
              type="button"
              className="py-1.5 px-3 bg-neutral-100 text-neutral-900 text-sm font-medium rounded-md hover:bg-neutral-200 transition"
              onClick={generateSubVariants}
              disabled={!subOptName.trim() || subOptValues.length === 0}
            >
              Ajouter à la liste
            </button>
          </div>
        </div>
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
