import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { answerQuestion, askQuestion, deleteMyAnswer, deleteMyQuestion } from '@ibee/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { action } = body

  try {
    if (action === 'question') {
      const { productId, questionText } = body
      const text = typeof questionText === 'string' ? questionText.trim() : ''
      if (!productId || typeof productId !== 'string') {
        return NextResponse.json({ error: 'Produit manquant.' }, { status: 400 })
      }
      if (text.length < 10 || text.length > 500) {
        return NextResponse.json(
          { error: 'La question doit contenir entre 10 et 500 caractères.' },
          { status: 400 },
        )
      }
      const question = await askQuestion(supabase, {
        product_id: productId,
        asker_user_id: user.id,
        question_text: text,
      })
      return NextResponse.json({ success: true, pending: true, question })
    }

    if (action === 'answer') {
      const { questionId, answerText } = body
      const text = typeof answerText === 'string' ? answerText.trim() : ''
      if (!questionId || typeof questionId !== 'string') {
        return NextResponse.json({ error: 'Question manquante.' }, { status: 400 })
      }
      if (text.length < 5) {
        return NextResponse.json(
          { error: 'La réponse doit contenir au moins 5 caractères.' },
          { status: 400 },
        )
      }
      const answer = await answerQuestion(supabase, {
        question_id: questionId,
        answerer_user_id: user.id,
        answer_text: text,
      })
      return NextResponse.json({ success: true, pending: false, answer })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (err) {
    console.error('[api/product-questions] POST', err)
    return NextResponse.json({ error: 'Erreur lors de l’envoi.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { action, questionId, answerId } = body

  try {
    if (action === 'delete-question') {
      if (!questionId || typeof questionId !== 'string') {
        return NextResponse.json({ error: 'Question manquante.' }, { status: 400 })
      }
      await deleteMyQuestion(supabase, questionId)
      return NextResponse.json({ success: true })
    }
    if (action === 'delete-answer') {
      if (!answerId || typeof answerId !== 'string') {
        return NextResponse.json({ error: 'Réponse manquante.' }, { status: 400 })
      }
      await deleteMyAnswer(supabase, answerId)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (err) {
    console.error('[api/product-questions] DELETE', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  }
}
