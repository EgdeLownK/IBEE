import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type EntityFolder = Database['public']['Tables']['entity_folders']['Row']
type EntityFolderInsert = Database['public']['Tables']['entity_folders']['Insert']

export async function listEntityFolders(
  client: SupabaseClient<Database>,
  entityId: string,
  parentId: string | null = null,
): Promise<EntityFolder[]> {
  let query = client
    .from('entity_folders')
    .select('*')
    .eq('entity_id', entityId)
    .order('name', { ascending: true })

  query = parentId
    ? query.eq('parent_id', parentId)
    : query.is('parent_id', null)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listAllEntityFolders(
  client: SupabaseClient<Database>,
  entityId: string,
): Promise<EntityFolder[]> {
  const { data, error } = await client
    .from('entity_folders')
    .select('*')
    .eq('entity_id', entityId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getEntityFolderById(
  client: SupabaseClient<Database>,
  folderId: string,
): Promise<EntityFolder | null> {
  const { data, error } = await client
    .from('entity_folders')
    .select('*')
    .eq('id', folderId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createEntityFolder(
  client: SupabaseClient<Database>,
  input: EntityFolderInsert,
): Promise<EntityFolder> {
  const { data, error } = await client
    .from('entity_folders')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEntityFolder(
  client: SupabaseClient<Database>,
  folderId: string,
  patch: Partial<Pick<EntityFolder, 'name' | 'parent_id'>>,
): Promise<EntityFolder> {
  const { data, error } = await client
    .from('entity_folders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', folderId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEntityFolder(
  client: SupabaseClient<Database>,
  folderId: string,
): Promise<void> {
  const { error } = await client.from('entity_folders').delete().eq('id', folderId)
  if (error) throw error
}

export async function countEntityFolderChildren(
  client: SupabaseClient<Database>,
  folderId: string,
): Promise<{ subfolders: number; files: number }> {
  const [foldersRes, filesRes] = await Promise.all([
    client
      .from('entity_folders')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', folderId),
    client
      .from('entity_files')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folderId),
  ])

  if (foldersRes.error) throw foldersRes.error
  if (filesRes.error) throw filesRes.error

  return {
    subfolders: foldersRes.count ?? 0,
    files: filesRes.count ?? 0,
  }
}

export async function sumUserDriveBytes(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data: entities, error: entitiesError } = await client
    .from('entity')
    .select('id')
    .eq('user_id', userId)

  if (entitiesError) throw entitiesError
  const entityIds = (entities ?? []).map((row) => row.id)
  if (entityIds.length === 0) return 0

  const { data, error } = await client
    .from('entity_files')
    .select('size_bytes')
    .in('entity_id', entityIds)

  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0)
}
