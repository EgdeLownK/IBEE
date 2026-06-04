import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  listProductsByEntity,
  listReviewsForModeration,
  listQuestionsForModeration,
} from '@ibee/supabase'
import { CommunityModeration, type ReviewItem, type QuestionItem } from './CommunityModeration'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) redirect('/login')

  // Pas de helper "tous les avis/questions de l'entity" : on liste les produits
  // puis on agrège les helpers per-product (listReviews/QuestionsForModeration).
  const products = await listProductsByEntity(supabase, entity.id, { limit: 200 })
  const productTitle = new Map(products.map((p) => [p.id, p.title]))

  const [reviewsNested, questionsNested] = await Promise.all([
    Promise.all(products.map((p) => listReviewsForModeration(supabase, p.id, { limit: 100 }))),
    Promise.all(products.map((p) => listQuestionsForModeration(supabase, p.id, { limit: 100 }))),
  ])

  const reviews: ReviewItem[] = reviewsNested.flat().map((r) => ({
    id: r.id,
    productTitle: productTitle.get(r.product_id) ?? 'Produit',
    rating: r.rating,
    title: r.title,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
  }))

  const questions: QuestionItem[] = questionsNested.flat().map((q) => ({
    id: q.id,
    productTitle: productTitle.get(q.product_id) ?? 'Produit',
    questionText: q.question_text,
    status: q.status,
    answersCount: (q.product_answers ?? []).length,
    createdAt: q.created_at,
  }))

  // Tri global par date décroissante (les helpers trient déjà par produit).
  reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return <CommunityModeration reviews={reviews} questions={questions} />
}
