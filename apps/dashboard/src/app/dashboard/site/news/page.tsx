'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

export default function NewsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('toast') === 'updated') {
      toast.success('Publication mise à jour')
      router.replace('/dashboard/site/news')
    }
    if (searchParams.get('toast') === 'created') {
      toast.success('Publication créée avec succès')
      router.replace('/dashboard/site/news')
    }
  }, [searchParams, router])

  return (
    <div className="mx-auto max-w-[800px] p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">News</h1>
          <p className="mt-1 text-sm text-neutral-500">Gérez vos publications.</p>
        </div>
        <a
          href="/dashboard/site/news/new"
          className="inline-flex items-center gap-2 rounded-lg bg-cta-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Nouvelle News
        </a>
      </div>

      <div className="text-center py-16">
        <p className="text-sm text-neutral-400">
          La liste de vos publications apparaîtra ici après l’application des migrations.
        </p>
      </div>
    </div>
  )
}
