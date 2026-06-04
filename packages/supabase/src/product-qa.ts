import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type QuestionInsert = Database['public']['Tables']['product_questions']['Insert']
type AnswerInsert = Database['public']['Tables']['product_answers']['Insert']

// ---------------------------------------------------------------------------
// Lecture publique
// ---------------------------------------------------------------------------

/**
 * Liste les questions publiées d'un produit avec leurs réponses publiées.
 * Tri par date décroissante par défaut.
 */
export async function listPublishedQuestions(
  client: SupabaseClient<Database>,
  productId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = opts

  const { data, error } = await client
    .from('product_questions')
    .select('*, product_answers(*)')
    .eq('product_id', productId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Questions — acheteur/utilisateur
// ---------------------------------------------------------------------------

/**
 * Pose une question sur un produit. Le status est omis (défaut DB = 'pending').
 * L'utilisateur doit fournir son propre user_id (vérifié par RLS WITH CHECK).
 */
export async function askQuestion(
  client: SupabaseClient<Database>,
  data: { product_id: string; asker_user_id: string; question_text: string }
) {
  const insert: QuestionInsert = {
    product_id: data.product_id,
    asker_user_id: data.asker_user_id,
    question_text: data.question_text,
    // status intentionnellement omis : défaut DB = 'pending'
  }

  const { data: question, error } = await client
    .from('product_questions')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return question
}

/**
 * Supprime une question posée par l'utilisateur connecté.
 * Les réponses sont supprimées en cascade par la DB.
 */
export async function deleteMyQuestion(
  client: SupabaseClient<Database>,
  questionId: string
) {
  const { error } = await client
    .from('product_questions')
    .delete()
    .eq('id', questionId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Réponses — owner ou utilisateur authentifié
// ---------------------------------------------------------------------------

/**
 * Répond à une question. Le status par défaut DB est 'published'.
 * Le champ is_seller est calculé par trigger DB (true si answerer_user_id =
 * entity.user_id du produit) — ne jamais le passer en paramètre.
 */
export async function answerQuestion(
  client: SupabaseClient<Database>,
  data: { question_id: string; answerer_user_id: string; answer_text: string }
) {
  const insert: AnswerInsert = {
    question_id: data.question_id,
    answerer_user_id: data.answerer_user_id,
    answer_text: data.answer_text,
    // is_seller est calculé par trigger DB — ne pas le passer
    // status intentionnellement omis : défaut DB = 'published'
  }

  const { data: answer, error } = await client
    .from('product_answers')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return answer
}

/**
 * Supprime une réponse postée par l'utilisateur connecté.
 */
export async function deleteMyAnswer(
  client: SupabaseClient<Database>,
  answerId: string
) {
  const { error } = await client
    .from('product_answers')
    .delete()
    .eq('id', answerId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Modération owner (lecture tous statuts)
// ---------------------------------------------------------------------------

/**
 * Liste toutes les questions d'un produit (tous statuts) pour modération
 * owner depuis le dashboard. Requiert client authentifié ; RLS restreint
 * à l'owner du produit.
 *
 * TODO: La modération (changement de status) passera par RPC
 * `moderate_product_question` (SECURITY DEFINER, phase RPC). Même doctrine
 * que product_reviews — pas de policy owner_update pour éviter le full-row
 * override via RLS.
 */
export async function listQuestionsForModeration(
  client: SupabaseClient<Database>,
  productId: string,
  opts: {
    status?: Database['public']['Enums']['product_question_status']
    limit?: number
    offset?: number
  } = {}
) {
  const { limit = 50, offset = 0 } = opts

  let query = client
    .from('product_questions')
    .select('*, product_answers(*)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Liste toutes les réponses d'une question (tous statuts) pour modération
 * owner.
 *
 * TODO: La modération du statut d'une réponse passera par RPC
 * `moderate_product_answer` (SECURITY DEFINER, phase RPC).
 */
export async function listAnswersForModeration(
  client: SupabaseClient<Database>,
  questionId: string
) {
  const { data, error } = await client
    .from('product_answers')
    .select('*')
    .eq('question_id', questionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}
