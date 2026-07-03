'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  entitySlug: string
  productSlug: string
  variantId?: string | null
  disabled?: boolean
  label?: string
  className?: string
}

export function ProductBuyButton({
  entitySlug,
  productSlug,
  variantId = null,
  disabled = false,
  label = 'Acheter',
  className = 'detail-entity-strip__cta',
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    if (disabled || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entitySlug,
          productSlug,
          variantId,
          quantity: 1,
        }),
      })

      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Impossible de démarrer le paiement.')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={className}
        disabled={disabled || loading}
        onClick={handleBuy}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
            Redirection…
          </>
        ) : (
          label
        )}
      </button>
      {error && (
        <p className="m-0 max-w-[220px] text-right text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
