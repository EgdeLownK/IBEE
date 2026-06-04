import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId } from '@ibee/supabase'

// Images : on conserve avif (déjà accepté par l'overlay existant) en plus des
// formats listés au cahier des charges V2 (jpeg/png/webp/gif).
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 Mo
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 Mo

// NOTE : la durée (≤ 3 min) et la résolution (≤ 1080p) de la vidéo sont
// validées CÔTÉ CLIENT (lecture de metadata <video> avant upload). Le serveur
// ne plafonne ici que le type MIME et la taille en octets.

export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

  // Vérification owner : on s'assure que l'utilisateur a bien une entity
  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'Profil introuvable.' }), { status: 404 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Requête invalide.' }), { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'Aucun fichier fourni.' }), { status: 400 })
  }

  // Détermine le type (image vs vidéo) depuis le MIME en premier, puis branche
  // le plafond de taille en conséquence.
  let mediaType: 'image' | 'video'
  if (IMAGE_TYPES.includes(file.type)) {
    mediaType = 'image'
  } else if (VIDEO_TYPES.includes(file.type)) {
    mediaType = 'video'
  } else {
    return new Response(
      JSON.stringify({ error: 'Format non supporté (image jpeg/png/webp/gif ou vidéo mp4/webm).' }),
      { status: 400 }
    )
  }

  if (mediaType === 'image' && file.size > MAX_IMAGE_BYTES) {
    return new Response(JSON.stringify({ error: 'L\'image ne doit pas dépasser 10 Mo.' }), { status: 400 })
  }
  if (mediaType === 'video' && file.size > MAX_VIDEO_BYTES) {
    return new Response(JSON.stringify({ error: 'La vidéo ne doit pas dépasser 200 Mo.' }), { status: 400 })
  }

  // Réutilise le bucket publication-media (pas de bucket product-media dédié).
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${user.id}/${crypto.randomUUID()}/${mediaType}.${ext}`

  const { error: uploadError } = await authClient.storage
    .from('publication-media')
    .upload(path, file, { contentType: file.type })

  if (uploadError) {
    console.error('[api/product-upload] upload', uploadError)
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'envoi du fichier.' }), { status: 500 })
  }

  const { data } = authClient.storage.from('publication-media').getPublicUrl(path)

  return new Response(JSON.stringify({ success: true, url: data.publicUrl, type: mediaType }))
}
