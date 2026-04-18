/**
 * Détection cross-bundler des variables d'environnement Supabase.
 *
 * - Next.js (webpack/turbopack) remplace statiquement process.env.NEXT_PUBLIC_*
 * - Astro (Vite) remplace statiquement import.meta.env.PUBLIC_*
 *
 * L'ordre de vérification garantit que chaque bundler trouve ses propres
 * variables en premier, même si l'autre branche contient du code mort.
 *
 * Les @ts-ignore sur import.meta.env sont nécessaires : TypeScript standard
 * ne connaît pas cette propriété (extension Vite). Sans effet dans Astro
 * où les types Vite sont déjà chargés.
 */

export function getSupabaseEnv(): { url: string; anonKey: string } {
  // Next.js: process.env.NEXT_PUBLIC_* (remplacé par webpack au build)
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_SUPABASE_URL
  ) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  }

  // Astro/Vite: import.meta.env.PUBLIC_* (remplacé par Vite au build)
  // @ts-ignore — import.meta.env est une extension Vite, inconnue du tsconfig Node.js
  if (import.meta.env?.PUBLIC_SUPABASE_URL) {
    return {
      // @ts-ignore
      url: import.meta.env.PUBLIC_SUPABASE_URL,
      // @ts-ignore
      anonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    }
  }

  throw new Error(
    'Supabase environment variables not found. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (Next.js) ' +
      'or PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY (Astro).'
  )
}
