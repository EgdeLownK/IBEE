export type NavZone = 'home' | 'messages' | 'activity' | 'profile-web' | 'personal-account'

const ACCOUNT_PATH_PREFIXES = ['/dashboard/site/general', '/dashboard/compte'] as const

export function getNavZone(pathname: string, isPersonalMode: boolean): NavZone {
  if (pathname === '/' || pathname.startsWith('/explore')) return 'home'
  if (pathname.startsWith('/dashboard/messages')) return 'messages'
  if (pathname.includes('/message') && !pathname.startsWith('/dashboard')) return 'messages'

  if (pathname.startsWith('/dashboard/compte')) return 'personal-account'

  if (pathname.startsWith('/notifications')) {
    return isPersonalMode ? 'personal-account' : 'activity'
  }

  if (pathname.startsWith('/dashboard/analyse') || pathname.startsWith('/dashboard/activite/revenus')) {
    return 'profile-web'
  }

  if (pathname.startsWith('/dashboard/activite')) {
    return 'activity'
  }

  if (isPersonalMode && isAccountPath(pathname)) {
    return 'personal-account'
  }

  if (pathname.startsWith('/dashboard')) return 'profile-web'

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 1 && !isReservedPublicSegment(segments[0])) {
    return 'profile-web'
  }

  return 'home'
}

export function shouldShowSidebar(zone: NavZone, isAuthenticated = false): boolean {
  if (zone === 'home') return isAuthenticated
  if (zone === 'activity') return false
  return zone === 'profile-web' || zone === 'personal-account'
}

function isAccountPath(pathname: string): boolean {
  return ACCOUNT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isReservedPublicSegment(segment: string): boolean {
  return [
    'login',
    'explore',
    'notifications',
    'profile-preview',
    'api',
    'dashboard',
  ].includes(segment)
}

/** Pages publiques sans header IBEE ni menu (ex. QR entrée événement). */
export function isPublicChromelessPath(pathname: string): boolean {
  return /\/events\/[^/]+\/entree\/?$/.test(pathname)
}
