import type { APIRoute } from 'astro'
import { createAuthClient } from '../../lib/supabase/auth'
import { getEntityByUserId, listEntityFiles, createEntityFile } from '@ibee/supabase'

// Fichiers vendeur (pré-Drive) — bucket privé product-files.
// Un fichier payant n'est JAMAIS public : pas de getPublicUrl ici, et le
// storage_path n'est pas renvoyé au client (la livraison acheteur se fera
// par lien signé, chantier paiement).
const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200 Mo (aligné sur la vidéo produit)

type FileDto = {
  id: string
  name: string
  mime_type: string | null
  size_bytes: number
  created_at: string
}

function toDto(row: {
  id: string
  name: string
  mime_type: string | null
  size_bytes: number
  created_at: string
}): FileDto {
  return {
    id: row.id,
    name: row.name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
  }
}

/** Liste des fichiers du vendeur connecté (picker "Mes fichiers"). */
export const GET: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

  const entity = await getEntityByUserId(authClient, user.id)
  if (!entity) {
    return new Response(JSON.stringify({ error: 'Profil introuvable.' }), { status: 404 })
  }

  try {
    const files = await listEntityFiles(authClient, entity.id)
    return new Response(JSON.stringify({ files: files.map(toDto) }))
  } catch (err) {
    console.error('[api/entity-files] list', err)
    return new Response(JSON.stringify({ error: 'Erreur lors du chargement des fichiers.' }), { status: 500 })
  }
}

/** Upload direct d'un fichier vers le bucket privé + entrée au catalogue. */
export const POST: APIRoute = async ({ request, cookies }) => {
  const authClient = createAuthClient(request, cookies)
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Vous devez être connecté.' }), { status: 401 })
  }

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
  if (!(file instanceof File) || file.size === 0) {
    return new Response(JSON.stringify({ error: 'Aucun fichier fourni.' }), { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return new Response(JSON.stringify({ error: 'Le fichier ne doit pas dépasser 200 Mo.' }), { status: 400 })
  }

  // Path sous le préfixe {user_id}/ — exigé par les storage policies du bucket.
  // Le nom original vit en BDD (entity_files.name) ; le path reste opaque.
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await authClient.storage
    .from('product-files')
    .upload(path, file, { contentType: file.type || 'application/octet-stream' })

  if (uploadError) {
    console.error('[api/entity-files] upload', uploadError)
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'envoi du fichier.' }), { status: 500 })
  }

  try {
    const created = await createEntityFile(authClient, {
      entity_id: entity.id,
      name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    return new Response(JSON.stringify({ success: true, file: toDto(created) }))
  } catch (err) {
    // Catalogue KO → on ne laisse pas un fichier orphelin dans le bucket.
    console.error('[api/entity-files] insert', err)
    await authClient.storage.from('product-files').remove([path]).catch(() => {})
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'enregistrement du fichier.' }), { status: 500 })
  }
}
