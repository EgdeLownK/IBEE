'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingBag, Plus, Trash2, Package, FileDown, Tag, MessagesSquare } from 'lucide-react'
import { deleteProductAction, setProductStatusAction } from './actions'

type ProductRow = {
  id: string
  title: string
  slug: string
  type: 'digital' | 'physical'
  status: 'draft' | 'published' | 'archived'
  price_cents: number
  currency: string
  physical_stock_quantity: number | null
  media: string[]
}

type Props = {
  products: ProductRow[]
  toastMessage?: string
}

const STATUS_FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'published', label: 'Publiés' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'archived', label: 'Archivés' },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['key']

const STATUS_BADGES: Record<ProductRow['status'], { label: string; className: string }> = {
  published: { label: 'Publié', className: 'bg-success/10 text-success' },
  draft: { label: 'Brouillon', className: 'bg-neutral-100 text-neutral-600' },
  archived: { label: 'Archivé', className: 'bg-neutral-200 text-neutral-500' },
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

export function ProductsHome({ products, toastMessage }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!toastMessage) return
    toast.success(toastMessage)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('toast')
      window.history.replaceState(null, '', url.toString())
    }
  }, [toastMessage])

  const filtered = useMemo(
    () => (filter === 'all' ? products : products.filter((p) => p.status === filter)),
    [products, filter]
  )

  const counts = useMemo(
    () => ({
      all: products.length,
      published: products.filter((p) => p.status === 'published').length,
      draft: products.filter((p) => p.status === 'draft').length,
      archived: products.filter((p) => p.status === 'archived').length,
    }),
    [products]
  )

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return
    setBusyId(id)
    const result = await deleteProductAction({ productId: id })
    setBusyId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Produit supprimé.')
    router.refresh()
  }

  async function handleStatus(id: string, status: ProductRow['status']) {
    setBusyId(id)
    const result = await setProductStatusAction({ productId: id, status })
    setBusyId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Statut mis à jour.')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <h1 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <span className="text-accent">
              <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
            </span>
            Mes produits
          </h1>
          <div className="flex gap-3">
            <a
              href="/dashboard/site/products/codes"
              className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400"
            >
              <Tag className="h-4 w-4" />
              Codes promo
            </a>
            <a
              href="/dashboard/site/products/community"
              className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400"
            >
              <MessagesSquare className="h-4 w-4" />
              Communauté
            </a>
            <a
              href="/dashboard/site/products/new"
              className="flex items-center gap-2 rounded-md bg-cta-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cta-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nouveau produit
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8">
        {/* Filtres statut */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                filter === f.key
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-20 text-center">
            <ShoppingBag className="h-10 w-10 text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-600">Aucun produit pour le moment</p>
            <a
              href="/dashboard/site/products/new"
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-cta-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cta-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Créer mon premier produit
            </a>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-0 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  <th className="px-6 py-4">Produit</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Prix</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const badge = STATUS_BADGES[p.status]
                  return (
                    <tr key={p.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60">
                      <td className="px-6 py-4">
                        <a
                          href={`/dashboard/site/products/${p.id}/edit`}
                          className="flex items-center gap-3"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100 text-neutral-400">
                            {p.media[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.media[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5" />
                            )}
                          </span>
                          <span className="font-semibold text-neutral-900">{p.title}</span>
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-600">
                          {p.type === 'digital' ? (
                            <>
                              <FileDown className="h-3 w-3" /> Numérique
                            </>
                          ) : (
                            <>
                              <Package className="h-3 w-3" /> Physique
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums text-neutral-900">
                        {formatPrice(p.price_cents, p.currency)}
                      </td>
                      <td className="px-6 py-4 tabular-nums text-neutral-600">
                        {p.type === 'physical' ? (p.physical_stock_quantity ?? 0) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={p.status}
                            disabled={busyId === p.id}
                            onChange={(e) => handleStatus(p.id, e.target.value as ProductRow['status'])}
                            className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 disabled:opacity-50"
                            aria-label="Changer le statut"
                          >
                            <option value="draft">Brouillon</option>
                            <option value="published">Publié</option>
                            <option value="archived">Archivé</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={busyId === p.id}
                            aria-label="Supprimer"
                            className="flex rounded-md p-2 text-neutral-400 transition hover:bg-error/10 hover:text-error disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
