import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type EntityFile = Database['public']['Tables']['entity_files']['Row']
type EntityFileInsert = Database['public']['Tables']['entity_files']['Insert']

// ---------------------------------------------------------------------------
// Fichiers vendeur (pré-Drive) — entity_files
// Catalogue des fichiers uploadés par une entity dans le bucket privé
// product-files. RLS owner-only : jamais lisibles publiquement.
// Utilisé par l'overlay produit digital (upload direct + réutilisation),
// et par la future section Drive.
// ---------------------------------------------------------------------------

/**
 * Liste les fichiers d'une entity, du plus récent au plus ancien.
 */
export async function listEntityFiles(
  client: SupabaseClient<Database>,
  entityId: string,
  options?: { folderId?: string | null },
): Promise<EntityFile[]> {
  let query = client
    .from('entity_files')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (options && 'folderId' in options) {
    query = options.folderId
      ? query.eq('folder_id', options.folderId)
      : query.is('folder_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Récupère un fichier par id, ou null s'il n'existe pas (ou n'est pas
 * visible par ce client — RLS owner-only).
 */
export async function getEntityFileById(
  client: SupabaseClient<Database>,
  fileId: string
): Promise<EntityFile | null> {
  const { data, error } = await client
    .from('entity_files')
    .select('*')
    .eq('id', fileId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Enregistre les métadonnées d'un fichier déjà uploadé dans le bucket
 * product-files. L'upload storage lui-même est fait par l'appelant
 * (route /api/entity-files) — ce helper ne gère que le catalogue.
 */
export async function createEntityFile(
  client: SupabaseClient<Database>,
  input: EntityFileInsert
): Promise<EntityFile> {
  const { data, error } = await client
    .from('entity_files')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function sumEntityFilesBytes(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<number> {
  const { data, error } = await client
    .from('entity_files')
    .select('size_bytes')
    .eq('entity_id', entityId)

  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0)
}

export async function listEntityFileIdsLinkedToProducts(
  client: SupabaseClient<Database>,
  entityId: string
): Promise<Set<string>> {
  const { data, error } = await client
    .from('products')
    .select('digital_file_id')
    .eq('entity_id', entityId)
    .not('digital_file_id', 'is', null)

  if (error) throw error
  const ids = new Set<string>()
  for (const row of data ?? []) {
    if (row.digital_file_id) ids.add(row.digital_file_id)
  }
  return ids
}

export async function isEntityFileLinkedToProduct(
  client: SupabaseClient<Database>,
  fileId: string
): Promise<boolean> {
  const { count, error } = await client
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('digital_file_id', fileId)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function deleteEntityFileRecord(
  client: SupabaseClient<Database>,
  fileId: string
): Promise<void> {
  const { error } = await client.from('entity_files').delete().eq('id', fileId)
  if (error) throw error
}

export async function updateEntityFile(
  client: SupabaseClient<Database>,
  fileId: string,
  patch: Partial<Pick<EntityFile, 'name' | 'storage_path' | 'mime_type' | 'size_bytes' | 'folder_id'>>
): Promise<EntityFile> {
  const { data, error } = await client
    .from('entity_files')
    .update(patch)
    .eq('id', fileId)
    .select()
    .single()

  if (error) throw error
  return data
}
