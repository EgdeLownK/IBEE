'use client'

import { useState } from 'react'
import { MessagesSquare, Star, ArrowLeft, Lock } from 'lucide-react'

type ReviewStatus = 'pending' | 'published' | 'hidden' | 'flagged'
type QuestionStatus = 'pending' | 'published' | 'hidden'

export type ReviewItem = {
  id: string
  productTitle: string
  rating: number
  title: string | null
  content: string
  status: ReviewStatus
  createdAt: string
}

export type QuestionItem = {
  id: string
  productTitle: string
  questionText: string
  status: QuestionStatus
  answersCount: number
  createdAt: string
}

type Props = {
  reviews: ReviewItem[]
  questions: QuestionItem[]
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-warning/10 text-warning' },
  published: { label: 'Publié', className: 'bg-success/10 text-success' },
  hidden: { label: 'Masqué', className: 'bg-neutral-200 text-neutral-500' },
  flagged: { label: 'Signalé', className: 'bg-error/10 text-error' },
}

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-500' }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
}

function DisabledModerationButton() {
  return (
    <button
      type="button"
      disabled
      title="Modération bientôt disponible"
      className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-400 opacity-70"
    >
      <Lock className="h-3.5 w-3.5" />
      Modération bientôt disponible
    </button>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CommunityModeration({ reviews, questions }: Props) {
  const [tab, setTab] = useState<'reviews' | 'questions'>('reviews')

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1000px] items-center gap-3 px-6">
          <a href="/dashboard/site/products" className="flex text-neutral-400 transition hover:text-accent" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <h1 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <span className="text-accent"><MessagesSquare className="h-[18px] w-[18px]" aria-hidden /></span>
            Communauté
          </h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-6 py-8">
        <div className="rounded-lg border border-neutral-100 bg-accent-soft/30 px-4 py-3 text-xs text-neutral-600">
          La modération (publier, masquer, répondre) sera disponible dans une prochaine phase. Cet espace est en lecture seule.
        </div>

        <div className="flex gap-8 border-b border-neutral-100">
          {([
            { key: 'reviews', label: 'Avis', count: reviews.length },
            { key: 'questions', label: 'Questions', count: questions.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative py-4 text-xs font-bold transition ${tab === t.key ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              {t.label}
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">{t.count}</span>
              {tab === t.key && <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>

        {tab === 'reviews' ? (
          reviews.length === 0 ? (
            <EmptyState label="Aucun avis pour le moment" />
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-neutral-100 bg-neutral-0 p-5 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-warning text-warning' : 'text-neutral-200'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-neutral-400">{r.productTitle}</span>
                      </div>
                      {r.title && <p className="mt-1 text-sm font-semibold text-neutral-900">{r.title}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600">{r.content}</p>
                  <div className="mt-3"><DisabledModerationButton /></div>
                </div>
              ))}
            </div>
          )
        ) : questions.length === 0 ? (
          <EmptyState label="Aucune question pour le moment" />
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-neutral-100 bg-neutral-0 p-5 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <span className="text-xs text-neutral-400">{q.productTitle}</span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={q.status} />
                    <span className="text-xs text-neutral-400">{formatDate(q.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-neutral-900">{q.questionText}</p>
                <p className="mt-1 text-xs text-neutral-400">{q.answersCount} réponse{q.answersCount > 1 ? 's' : ''}</p>
                <div className="mt-3"><DisabledModerationButton /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-0 py-16 text-center">
      <MessagesSquare className="h-10 w-10 text-neutral-300" />
      <p className="text-sm font-semibold text-neutral-600">{label}</p>
    </div>
  )
}
