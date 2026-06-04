'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getEntityByUserId,
  getClientById,
  updateClient,
  deleteClient,
} from '@ibee/supabase'

const updateClientSchema = z.object({
  name: z.string().max(200).trim().optional(),
  phone: z
    .string()
    .max(50)
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v ?? null)),
  notes: z
    .string()
    .max(5000)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v ?? null)),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
})

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

async function ensureOwnership(clientId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Non authentifié' }

  const entity = await getEntityByUserId(supabase, user.id)
  if (!entity) return { ok: false as const, error: 'Profil introuvable' }

  const client = await getClientById(supabase, clientId)
  if (!client) return { ok: false as const, error: 'Client introuvable' }
  if (client.entity_id !== entity.id) {
    return { ok: false as const, error: 'Accès refusé' }
  }

  return { ok: true as const, supabase }
}

export async function updateClientAction(
  id: string,
  input: z.input<typeof updateClientSchema>
): Promise<ActionResult> {
  const parsed = updateClientSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Données invalides' }

  const check = await ensureOwnership(id)
  if (!check.ok) return { success: false, error: check.error }

  try {
    await updateClient(check.supabase, id, parsed.data)
    revalidatePath(`/dashboard/site/clients/${id}`)
    revalidatePath('/dashboard/site/clients')
    return { success: true }
  } catch (err) {
    console.error('[updateClient]', err)
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const check = await ensureOwnership(id)
  if (!check.ok) return { success: false, error: check.error }

  try {
    await deleteClient(check.supabase, id)
    revalidatePath('/dashboard/site/clients')
    return { success: true }
  } catch (err) {
    console.error('[deleteClient]', err)
    return { success: false, error: 'Erreur lors de la suppression' }
  }
}
