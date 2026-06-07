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
  entityId: string
): Promise<EntityFile[]> {
  const { data, error } = await client
    .from('entity_files')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

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
