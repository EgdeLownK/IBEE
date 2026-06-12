'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { markAllAsRead, markAsRead } from '@ibee/supabase'

export async function markAllNotificationsReadAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const }

  await markAllAsRead(supabase, user.id)
  revalidatePath('/dashboard', 'layout')
  return { ok: true as const }
}

export async function markNotificationReadAction(notificationId: string) {
  if (!notificationId) return { ok: false as const }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const }

  await markAsRead(supabase, notificationId)
  revalidatePath('/dashboard', 'layout')
  return { ok: true as const }
}
