import 'server-only'

import {
  getClientsByEntity,
  groupMessagesIntoThreads,
  listEntityMessages,
  type MessageThread,
} from '@ibee/supabase'
import { requireDashboardContext } from '@/lib/dashboard-context'

export type MessagesDashboardData = {
  threads: MessageThread[]
  ownerName: string
  ownerEmail: string
}

function isMissingMessagesTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error ? String(error.message) : ''
  return (
    message.includes('entity_messages') &&
    (message.includes('does not exist') || message.includes('schema cache'))
  )
}

export async function loadMessagesDashboardData(): Promise<MessagesDashboardData> {
  const ctx = await requireDashboardContext()

  try {
    const [messages, clients] = await Promise.all([
      listEntityMessages(ctx.supabase, ctx.entity.id),
      getClientsByEntity(ctx.supabase, ctx.entity.id),
    ])

    const clientEmails = new Set(
      clients.map((c) => c.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e)),
    )

    return {
      threads: groupMessagesIntoThreads(messages, clientEmails),
      ownerName: ctx.entity.display_name?.trim() || 'Vous',
      ownerEmail: ctx.user.email ?? '',
    }
  } catch (error) {
    if (isMissingMessagesTable(error)) {
      return {
        threads: [],
        ownerName: ctx.entity.display_name?.trim() || 'Vous',
        ownerEmail: ctx.user.email ?? '',
      }
    }
    throw error
  }
}
