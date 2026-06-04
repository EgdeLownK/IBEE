import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { askQuestion, answerQuestion, deleteMyQuestion, deleteMyAnswer } from '@ibee/supabase'

/**
 * API Q&A produit — pattern comments.ts.
 * Auth requise. RLS gère l'autorisation.
 *
 * Questions : status='pending' (défaut DB) → modération, le client affiche une
 * confirmation "en attente" (pas de reload visible).
 * Réponses : status='published' (défaut DB), is_seller calculé par trigger →
 * visible immédiatement, le client peut reload.
 *
 * action: 'question' | 'answer' | 'delete-question' | 'delete-answer'
 * Pas de purge cache (cache.ts n'a pas de purgeProductCache).
 */

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 }) }

  const { action } = body

  try {
    if (action === 'question') {
      const { productId, questionText } = body
      const text = typeof questionText === 'string' ? questionText.trim() : ''
      // CHECK DB : question_text 10..500
      if (!productId) return new Response(JSON.stringify({ error: 'Produit manquant.' }), { status: 400 })
      if (text.length < 10 || text.length > 500) {
        return new Response(JSON.stringify({ error: 'La question doit contenir entre 10 et 500 caractères.' }), { status: 400 })
      }
      const question = await askQuestion(authClient, {
        product_id: productId,
        asker_user_id: user.id,
        question_text: text,
      })
      return new Response(JSON.stringify({ success: true, pending: true, question }))
    }

    if (action === 'answer') {
      const { questionId, answerText } = body
      const text = typeof answerText === 'string' ? answerText.trim() : ''
      // CHECK DB : answer_text >= 5
      if (!questionId) return new Response(JSON.stringify({ error: 'Question manquante.' }), { status: 400 })
      if (text.length < 5) {
        return new Response(JSON.stringify({ error: 'La réponse doit contenir au moins 5 caractères.' }), { status: 400 })
      }
      // is_seller calculé par trigger DB — ne pas le passer
      const answer = await answerQuestion(authClient, {
        question_id: questionId,
        answerer_user_id: user.id,
        answer_text: text,
      })
      return new Response(JSON.stringify({ success: true, pending: false, answer }))
    }

    return new Response(JSON.stringify({ error: 'Action inconnue.' }), { status: 400 })
  } catch (err) {
    console.error('[api/product-questions] POST', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de l’envoi.' }), { status: 500 })
  }
}

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 }) }

  const { action, questionId, answerId } = body

  try {
    if (action === 'delete-question') {
      if (!questionId) return new Response(JSON.stringify({ error: 'Question manquante.' }), { status: 400 })
      await deleteMyQuestion(authClient, questionId) // RLS : question du user
      return new Response(JSON.stringify({ success: true }))
    }
    if (action === 'delete-answer') {
      if (!answerId) return new Response(JSON.stringify({ error: 'Réponse manquante.' }), { status: 400 })
      await deleteMyAnswer(authClient, answerId) // RLS : réponse du user
      return new Response(JSON.stringify({ success: true }))
    }
    return new Response(JSON.stringify({ error: 'Action inconnue.' }), { status: 400 })
  } catch (err) {
    console.error('[api/product-questions] DELETE', err)
    return new Response(JSON.stringify({ error: 'Erreur lors de la suppression.' }), { status: 500 })
  }
}
