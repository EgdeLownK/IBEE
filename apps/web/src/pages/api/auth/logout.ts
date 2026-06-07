import type { APIRoute } from 'astro'
import { createAuthClient } from '../../../lib/supabase/auth'

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const authClient = createAuthClient(request, cookies)
  // Ignorer l'erreur éventuelle (session déjà expirée) : on redirige quand même.
  await authClient.auth.signOut()

  // Retour sur la page d'origine — même origine uniquement (pas d'open redirect).
  const referer = request.headers.get('Referer')
  let target = '/'
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.origin === new URL(request.url).origin) {
        target = refererUrl.pathname + refererUrl.search
      }
    } catch {
      // Referer illisible → fallback '/'
    }
  }
  return redirect(target, 303)
}
