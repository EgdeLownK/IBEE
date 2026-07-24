// Détermine si un produit est encore programmé (published_at dans le futur).
// Extrait du composant ProductDetail pour ne jamais appeler Date.now() dans le
// corps de rendu (react-hooks/purity) et pour être testable indépendamment.

export function isProductScheduled(publishedAt: string | null, now: number): boolean {
  if (!publishedAt) return false
  return new Date(publishedAt).getTime() > now
}

// Délai en ms avant que la programmation ne se termine, ou null si déjà passée /
// pas de date de publication. Utilisé pour programmer un timer côté client qui
// bascule isScheduled à false sans attendre un re-render déclenché ailleurs.
export function msUntilScheduled(publishedAt: string | null, now: number): number | null {
  if (!publishedAt) return null
  const delay = new Date(publishedAt).getTime() - now
  return delay > 0 ? delay : null
}
