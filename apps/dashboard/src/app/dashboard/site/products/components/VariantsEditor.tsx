'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Power } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@ibee/ui-react'
import { createVariantAction, deleteVariantAction, updateVariantAction } from '../actions'

export type VariantDraft = {
  id: string
  attributesLabel: string // ex: "Taille: M, Couleur: Rouge"
  sku: string | null
  price_cents_override: number | null
  stock_quantity: number
  is_active: boolean
}

type Props = {
  productId: string
  initialVariants: VariantDraft[]
}

function formatPrice(cents: number | null): string {
  if (cents === null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function VariantsEditor({ productId, initialVariants }: Props) {
  const router = useRouter()
  const [variants, setVariants] = useState<VariantDraft[]>(initialVariants)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  // Champs du formulaire d'ajout
  const [attrName, setAttrName] = useState('')
  const [attrValue, setAttrValue] = useState('')
  const [sku, setSku] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [stock, setStock] = useState('0')

  function resetForm() {
    setAttrName('')
    setAttrValue('')
    setSku('')
    setPriceInput('')
    setStock('0')
  }

  async function handleAdd() {
    if (!attrName.trim() || !attrValue.trim()) {
      toast.error('Renseignez au moins un attribut (nom et valeur).')
      return
    }
    setBusy(true)
    const priceOverride = priceInput.trim()
      ? Math.round(parseFloat(priceInput.replace(',', '.')) * 100)
      : null
    const stockN = parseInt(stock || '0', 10)
    const result = await createVariantAction({
      productId,
      attributes: { [attrName.trim()]: attrValue.trim() },
      sku: sku.trim() || null,
      price_cents_override: priceOverride && priceOverride > 0 ? priceOverride : null,
      stock_quantity: isNaN(stockN) ? 0 : stockN,
      is_active: true,
    })
    setBusy(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setVariants((prev) => [
      ...prev,
      {
        id: result.id!,
        attributesLabel: `${attrName.trim()}: ${attrValue.trim()}`,
        sku: sku.trim() || null,
        price_cents_override: priceOverride && priceOverride > 0 ? priceOverride : null,
        stock_quantity: isNaN(stockN) ? 0 : stockN,
        is_active: true,
      },
    ])
    resetForm()
    setAdding(false)
    toast.success('Variante ajoutée.')
    router.refresh()
  }

  async function handleUpdateStock(variantId: string, raw: string) {
    const stockN = parseInt(raw || '0', 10)
    const next = isNaN(stockN) || stockN < 0 ? 0 : stockN
    const current = variants.find((v) => v.id === variantId)
    if (!current || current.stock_quantity === next) return
    setBusy(true)
    const result = await updateVariantAction({ variantId, productId, stock_quantity: next })
    setBusy(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, stock_quantity: next } : v)))
    toast.success('Stock mis à jour.')
    router.refresh()
  }

  async function handleToggleActive(variant: VariantDraft) {
    setBusy(true)
    const result = await updateVariantAction({ variantId: variant.id, productId, is_active: !variant.is_active })
    setBusy(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setVariants((prev) => prev.map((v) => (v.id === variant.id ? { ...v, is_active: !variant.is_active } : v)))
    toast.success(variant.is_active ? 'Variante désactivée.' : 'Variante activée.')
    router.refresh()
  }

  async function handleDelete(variantId: string) {
    setBusy(true)
    const result = await deleteVariantAction({ variantId, productId })
    setBusy(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId))
    toast.success('Variante supprimée.')
    router.refresh()
  }

  return (
    <div>
      {variants.length > 0 ? (
        <div className="mb-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
          {variants.map((v) => (
            <div key={v.id} className={`flex items-center justify-between px-4 py-3 text-sm ${v.is_active ? '' : 'opacity-50'}`}>
              <div>
                <span className="font-semibold text-neutral-900">{v.attributesLabel}</span>
                {v.sku && <span className="ml-2 text-xs text-neutral-400">SKU {v.sku}</span>}
                {!v.is_active && <span className="ml-2 text-xs font-medium text-neutral-400">Inactive</span>}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                  Stock :
                  <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={v.stock_quantity}
                    disabled={busy}
                    onBlur={(e) => handleUpdateStock(v.id, e.target.value.replace(/[^\d]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    className="w-14 rounded-md border border-neutral-200 px-2 py-1 text-center text-xs text-neutral-700 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
                  />
                </label>
                <span className="text-xs font-semibold text-neutral-700">{formatPrice(v.price_cents_override)}</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(v)}
                  disabled={busy}
                  aria-label={v.is_active ? 'Désactiver la variante' : 'Activer la variante'}
                  className={`flex rounded-md p-1.5 transition disabled:opacity-50 ${v.is_active ? 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700' : 'text-success hover:bg-success/10'}`}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v.id)}
                  disabled={busy}
                  aria-label="Supprimer la variante"
                  className="flex rounded-md p-1.5 text-neutral-400 transition hover:bg-error/10 hover:text-error disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-neutral-400">Aucune variante. Les variantes sont optionnelles.</p>
      )}

      {adding ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Input variant="subtle" value={attrName} onChange={(e) => setAttrName(e.target.value)} placeholder="Attribut (ex : Taille)" />
            <Input variant="subtle" value={attrValue} onChange={(e) => setAttrValue(e.target.value)} placeholder="Valeur (ex : M)" />
            <Input variant="subtle" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU (optionnel)" />
            <Input variant="subtle" value={priceInput} onChange={(e) => setPriceInput(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="Prix spécifique € (optionnel)" />
            <Input variant="subtle" value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="Stock" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-cta-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-cta-primary-hover disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); resetForm() }}
              className="rounded-md px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400"
        >
          <Plus className="h-4 w-4" />
          Ajouter une variante
        </button>
      )}
    </div>
  )
}
