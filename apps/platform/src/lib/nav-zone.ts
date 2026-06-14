export type NavZone = 'home' | 'messages' | 'activity' | 'profile-web' | 'personal-account'

const ACCOUNT_PATH_PREFIXES = ['/dashboard/site/general', '/dashboard/drive'] as const

export function getNavZone(pathname: string, isPersonalMode: boolean): NavZone {
  if (pathname === '/' || pathname.startsWith('/explore')) return 'home'
  if (pathname.includes('/message')) return 'messages'

  if (pathname.startsWith('/notifications')) {
    return isPersonalMode ? 'personal-account' : 'activity'
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

export function shouldShowSidebar(zone: NavZone): boolean {
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
