import { revalidatePath } from 'next/cache'
import { getRevalidatePaths, type RevalidatePathsOptions } from '@ibee/supabase'

/** Invalide les pages publiques Next.js (profil, home, détail si slug fourni). */
export function revalidatePublicPaths(entitySlug: string, options?: RevalidatePathsOptions) {
  for (const path of getRevalidatePaths(entitySlug, options)) {
    revalidatePath(path)
  }
}

type AfterEntityMutationOptions = RevalidatePathsOptions & {
  /** Chemins studio additionnels (ex. `/dashboard/site/general`). */
  studioExtras?: string[]
}

/** Studio + pages publiques après mutation entity. */
export function revalidateAfterEntityMutation(
  entitySlug: string,
  options?: AfterEntityMutationOptions,
) {
  const { studioExtras, ...publicOptions } = options ?? {}
  revalidatePublicPaths(entitySlug, publicOptions)
  revalidatePath('/dashboard/site')
  for (const path of studioExtras ?? []) {
    revalidatePath(path)
  }
}
