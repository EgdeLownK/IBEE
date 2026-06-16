/** Données dashboard owner (privées, changent souvent) */
export const DASHBOARD_PRIVATE_CACHE = 'private, max-age=60, stale-while-revalidate=300'

/** Données publiques (profil, produits, events) */
export const PUBLIC_CACHE = 'public, max-age=300, stale-while-revalidate=3600'

/** Données temps-réel (notifications, signed URLs) */
export const PRIVATE_NO_STORE = 'private, no-store'
