'use server'

import { revalidatePath } from 'next/cache'
import { createOwnerMessageReply } from '@ibee/supabase'
import { requireDashboardContext } from '@/lib/dashboard-context'

export async function sendMessageReplyAction(input: { threadKey: string; body: string }) {
  const body = input.body.trim()
  if (!body || body.length > 2000) {
    return { ok: false as const, error: 'Message invalide.' }
  }

  const ctx = await requireDashboardContext()

  try {
    await createOwnerMessageReply(ctx.supabase, {
      entity_id: ctx.entity.id,
      owner_user_id: ctx.user.id,
      owner_name: ctx.entity.display_name?.trim() || 'Compte projet',
      owner_email: ctx.user.email ?? 'owner@ibee.app',
      thread_key: input.threadKey,
      body,
    })

    revalidatePath('/dashboard/messages')
    return { ok: true as const }
  } catch (err) {
    console.error('[sendMessageReplyAction]', err)
    return { ok: false as const, error: 'Envoi impossible.' }
  }
}
