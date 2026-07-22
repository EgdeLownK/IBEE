'use server'

import { createClient } from '@/lib/supabase/server'
import { createJobApplication } from '@ibee/supabase'

export type ApplyFormInput = {
  offer_id: string
  first_name: string
  last_name: string
  email: string
  message?: string
}

export async function createJobApplicationAction(
  input: ApplyFormInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    await createJobApplication(supabase, {
      offer_id: input.offer_id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      message: input.message ?? null,
      applicant_user_id: user?.id ?? null,
    })
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Une erreur est survenue.'
    return { error: message }
  }
}
