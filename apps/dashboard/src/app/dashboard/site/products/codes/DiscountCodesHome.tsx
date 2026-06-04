'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Plus, Trash2, Pencil, Loader2, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@ibee/ui-react'
import {
  createDiscountCodeAction,
  updateDiscountCodeAction,
  deleteDiscountCodeAction,
  type DiscountCodeInput,
} from '../actions'

type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping'
type AppliesTo = 'all_products' | 'specific_products' | 'specific_categories'

export type DiscountCodeRow = {
  id: string
  code: string
  type: DiscountType
  value: number
  applies_to: AppliesTo
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  max_uses_total: number | null
  max_uses_per_user: number
  min_purchase_cents: number | null
  productIds: string[]
  categories: string[]
}

export type ProductOption = { id: string; title: string }

type Props = {
  codes: DiscountCodeRow[]
  products: ProductOption[]
}

const TYPE_LABELS: Record<DiscountType, string> = {
  percentage: 'Pourcentage',
  fixed_amount: 'Montant fixe',
  free_shipping: 'Livraison offerte',
}

const APPLIES_LABELS: Record<AppliesTo, string> = {
  all_products: 'Tous les produits',
  specific_products: 'Produits spécifiques',
  specific_categories: 'Catégories spécifiques',
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DiscountCodesHome({ codes, products }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<DiscountCodeRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce code promo ?')) return
    setBusyId(id)
    const result = await deleteDiscountCodeAction({ codeId: id })
    setBusyId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Code promo supprimé.')
    router.refresh()
  }

  const showForm = creating || editing !== null

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1000px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a href="/dashboard/site/products" className="flex text-neutral-400 transition hover:text-accent" aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <h1 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <span className="text-accent"><Tag className="h-[18px] w-[18px]" aria-hidden /></span>
              Codes promo
            </h1>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-md bg-cta-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cta-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nouveau code
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-6 py-8">
        {showForm ? (
          <DiscountCodeForm
            products={products}
            initial={editing}
            onCancel={() => { setCreating(false); setEditing(null) }}
            onSaved={() => { setCreating(false); setEditing(null); router.refresh() }}
          />
        ) : codes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-20 text-center">
            <Tag className="h-10 w-10 text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-600">Aucun code promo</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-0 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Valeur</th>
                  <th className="px-6 py-4">Cible</th>
                  <th className="px-6 py-4">Actif</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60">
                    <td className="px-6 py-4 font-mono font-bold text-neutral-900">{c.code}</td>
                    <td className="px-6 py-4 text-neutral-600">{TYPE_LABELS[c.type]}</td>
                    <td className="px-6 py-4 tabular-nums text-neutral-700">
                      {c.type === 'percentage' ? `${c.value}%` : c.type === 'fixed_amount' ? `${(c.value / 100).toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500">{APPLIES_LABELS[c.applies_to]}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.is_active ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-500'}`}>
                        {c.is_active ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setEditing(c)} aria-label="Modifier" className="flex rounded-md p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(c.id)} disabled={busyId === c.id} aria-label="Supprimer" className="flex rounded-md p-2 text-neutral-400 transition hover:bg-error/10 hover:text-error disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function DiscountCodeForm({
  products,
  initial,
  onCancel,
  onSaved,
}: {
  products: ProductOption[]
  initial: DiscountCodeRow | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [type, setType] = useState<DiscountType>(initial?.type ?? 'percentage')
  const [valueInput, setValueInput] = useState(
    initial ? (initial.type === 'fixed_amount' ? (initial.value / 100).toString() : initial.value.toString()) : ''
  )
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(initial?.applies_to ?? 'all_products')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initial?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initial?.ends_at ?? null))
  const [maxTotal, setMaxTotal] = useState(initial?.max_uses_total?.toString() ?? '')
  const [maxPerUser, setMaxPerUser] = useState((initial?.max_uses_per_user ?? 1).toString())
  const [minPurchase, setMinPurchase] = useState(initial?.min_purchase_cents ? (initial.min_purchase_cents / 100).toString() : '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initial?.productIds ?? [])
  const [categoriesInput, setCategoriesInput] = useState((initial?.categories ?? []).join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    setErrors({})
    const valueNum =
      type === 'free_shipping'
        ? 0
        : type === 'fixed_amount'
        ? Math.round(parseFloat(valueInput.replace(',', '.') || '0') * 100)
        : Math.round(parseFloat(valueInput.replace(',', '.') || '0'))

    if (type !== 'free_shipping' && (!valueInput.trim() || isNaN(valueNum) || valueNum <= 0)) {
      setErrors({ value: 'Valeur invalide' })
      return
    }

    const input: DiscountCodeInput = {
      code: code.trim(),
      type,
      value: valueNum,
      applies_to: appliesTo,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      max_uses_total: maxTotal.trim() ? parseInt(maxTotal, 10) : null,
      max_uses_per_user: parseInt(maxPerUser || '1', 10) || 1,
      min_purchase_cents: minPurchase.trim() ? Math.round(parseFloat(minPurchase.replace(',', '.')) * 100) : null,
      is_active: isActive,
      productIds: appliesTo === 'specific_products' ? selectedProducts : [],
      categories:
        appliesTo === 'specific_categories'
          ? categoriesInput.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
    }

    setSubmitting(true)
    try {
      const result = initial
        ? await updateDiscountCodeAction({ ...input, codeId: initial.id })
        : await createDiscountCodeAction(input)
      if (!result.success) {
        setErrors(result.fieldErrors ?? { _global: result.error })
        toast.error(result.error)
        return
      }
      toast.success(initial ? 'Code mis à jour.' : 'Code créé.')
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">{initial ? 'Modifier le code' : 'Nouveau code promo'}</h2>
        <button type="button" onClick={onCancel} aria-label="Fermer" className="flex rounded-full p-1.5 text-neutral-400 hover:bg-neutral-50">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" error={!!errors.code} />
            {errors.code && <p className="mt-1 text-xs text-error">{errors.code}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as DiscountType)} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
              {(Object.keys(TYPE_LABELS) as DiscountType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
        </div>

        {type !== 'free_shipping' && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">
              {type === 'percentage' ? 'Pourcentage (%)' : 'Montant (€)'}
            </label>
            <Input value={valueInput} onChange={(e) => setValueInput(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder={type === 'percentage' ? '10' : '5,00'} error={!!errors.value} />
            {errors.value && <p className="mt-1 text-xs text-error">{errors.value}</p>}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">S'applique à</label>
          <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as AppliesTo)} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
            {(Object.keys(APPLIES_LABELS) as AppliesTo[]).map((a) => <option key={a} value={a}>{APPLIES_LABELS[a]}</option>)}
          </select>
        </div>

        {appliesTo === 'specific_products' && (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
            <p className="mb-2 text-xs font-semibold text-neutral-600">Produits concernés</p>
            {products.length === 0 ? (
              <p className="text-xs text-neutral-400">Aucun produit disponible.</p>
            ) : (
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    {p.title}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {appliesTo === 'specific_categories' && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Catégories (séparées par des virgules)</label>
            <Input value={categoriesInput} onChange={(e) => setCategoriesInput(e.target.value)} placeholder="E-books, Templates" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Début (optionnel)</label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Fin (optionnel)</label>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} error={!!errors.ends_at} />
            {errors.ends_at && <p className="mt-1 text-xs text-error">{errors.ends_at}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Usages max total</label>
            <Input value={maxTotal} onChange={(e) => setMaxTotal(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="Illimité" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Usages / client</label>
            <Input value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="1" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-600">Achat min (€)</label>
            <Input value={minPurchase} onChange={(e) => setMinPurchase(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Code actif
        </label>

        {errors._global && <p className="text-sm text-error">{errors._global}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-cta-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cta-primary-hover disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initial ? 'Enregistrer' : 'Créer le code'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-600">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
