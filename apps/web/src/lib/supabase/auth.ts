import { createServerClient } from '@agora/supabase/auth/server'
import type { AstroCookies } from 'astro'

export function createAuthClient(request: Request, cookies: AstroCookies) {
  return createServerClient({
    cookies: {
      getAll() {
        const header = request.headers.get('Cookie') ?? ''
        return header
          .split(';')
          .reduce<{ name: string; value: string }[]>((acc, pair) => {
            const idx = pair.indexOf('=')
            if (idx > 0) {
              acc.push({
                name: pair.slice(0, idx).trim(),
                value: pair.slice(idx + 1).trim(),
              })
            }
            return acc
          }, [])
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options as Parameters<AstroCookies['set']>[2])
        })
      },
    },
  })
}
