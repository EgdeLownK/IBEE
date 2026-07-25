import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReview, deleteMyReview, updateMyReview } from '@ibee/supabase'

function validateReview(rating: unknown, content: unknown, title: unknown): string | null {
  if (typeof rating !== 'number' || rating < 1 || rating > 5) return 'Note invalide (1 à 5).'
  if (typeof content !== 'string' || content.trim().length < 20) {
    return 'L’avis doit contenir au moins 20 caractères.'
  }
  if (content.trim().length > 5000) return 'L’avis est trop long.'
  if (title != null && typeof title === 'string' && title.length > 80) {
    return 'Le titre ne doit pas dépasser 80 caractères.'
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Vous devez être connecté pour laisser un avis.' },
      { status: 401 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { productId, rating, content, title, variantId } = body
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ error: 'Produit manquant.' }, { status: 400 })
  }

  const err = validateReview(rating, content, title)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  try {
    const review = await createReview(supabase, {
      product_id: productId,
      buyer_user_id: user.id,
      rating: rating as number,
      content: String(content).trim(),
      title: typeof title === 'string' ? title.trim() || null : null,
      variant_id: typeof variantId === 'string' ? variantId : null,
    })

    return NextResponse.json({ success: true, pending: true, review })
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json(
        { error: 'Vous avez déjà laissé un avis sur ce produit.' },
        { status: 409 },
      )
    }
    console.error('[api/product-reviews] POST', err)
    return NextResponse.json({ error: 'Erreur lors de l’envoi de l’avis.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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

  const { reviewId, rating, content, title } = body
  if (!reviewId || typeof reviewId !== 'string') {
    return NextResponse.json({ error: 'Avis manquant.' }, { status: 400 })
  }

  const err = validateReview(rating, content, title)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  try {
    const review = await updateMyReview(supabase, reviewId, {
      rating: rating as number,
      content: String(content).trim(),
      title: typeof title === 'string' ? title.trim() || null : null,
    })
    return NextResponse.json({ success: true, pending: true, review })
  } catch (err) {
    console.error('[api/product-reviews] PATCH', err)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
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

  const { reviewId } = body
  if (!reviewId || typeof reviewId !== 'string') {
    return NextResponse.json({ error: 'Avis manquant.' }, { status: 400 })
  }

  try {
    await deleteMyReview(supabase, reviewId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/product-reviews] DELETE', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  }
}
