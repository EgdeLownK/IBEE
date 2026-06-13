import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePublicPaths } from '@/lib/revalidate-public'
import { createComment, deleteComment } from '@ibee/supabase'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour commenter.' }, { status: 401 })
  }

  const body = await request.json()
  const { publicationId, content, entitySlug, publicationSlug } = body

  if (!publicationId || !content || !entitySlug || !publicationSlug) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
  }

  const trimmed = String(content).trim()
  if (trimmed.length === 0 || trimmed.length > 2000) {
    return NextResponse.json(
      { error: 'Le commentaire doit contenir entre 1 et 2000 caractères.' },
      { status: 400 }
    )
  }

  try {
    const comment = await createComment(supabase, publicationId, user.id, trimmed)

    revalidatePublicPaths(entitySlug, { publicationSlug })

    return NextResponse.json({ success: true, comment })
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string }
    if (pgErr?.code === '42501' || pgErr?.message?.includes('check_comment_rate_limit')) {
      return NextResponse.json(
        { error: 'Veuillez attendre une minute avant de poster un nouveau commentaire.' },
        { status: 429 }
      )
    }
    console.error('[api/comments] POST', err)
    return NextResponse.json({ error: 'Erreur lors de la publication du commentaire.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { commentId, entitySlug, publicationSlug } = body

  if (!commentId || !entitySlug || !publicationSlug) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
  }

  try {
    await deleteComment(supabase, commentId)

    revalidatePublicPaths(entitySlug, { publicationSlug })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/comments] DELETE', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  }
}
