import { PROFILE_TAB_ICONS, PROFILE_TAB_LABELS } from '@ibee/ui-react/profile'
import type { LucideIcon } from 'lucide-react'

export type ActivityModuleKey = 'shop' | 'appointments' | 'events'

export type ActivityModuleDefinition = {
  key: ActivityModuleKey
  label: string
  href: string
  icon: LucideIcon
  matchPath: (pathname: string) => boolean
}

const SHOP_PATHS = ['/dashboard/boutique', '/dashboard/commandes']
const SERVICE_PATHS = [
  '/dashboard/service',
  '/dashboard/rendez-vous',
]
const EVENT_PATHS = ['/dashboard/billetterie', '/dashboard/participants', '/dashboard/billetterie/check-in']

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix))
}

export const ACTIVITY_MODULE_DEFINITIONS: ActivityModuleDefinition[] = [
  {
    key: 'shop',
    label: PROFILE_TAB_LABELS.shop,
    href: '/dashboard/boutique',
    icon: PROFILE_TAB_ICONS.shop,
    matchPath: (pathname) => matchesPrefix(pathname, SHOP_PATHS),
  },
  {
    key: 'appointments',
    label: PROFILE_TAB_LABELS.appointments,
    href: '/dashboard/service',
    icon: PROFILE_TAB_ICONS.appointments,
    matchPath: (pathname) => matchesPrefix(pathname, SERVICE_PATHS),
  },
  {
    key: 'events',
    label: PROFILE_TAB_LABELS.events,
    href: '/dashboard/billetterie',
    icon: PROFILE_TAB_ICONS.events,
    matchPath: (pathname) => matchesPrefix(pathname, EVENT_PATHS),
  },
]

export function getActivityModuleLabel(key: ActivityModuleKey): string {
  return PROFILE_TAB_LABELS[key]
}

export function resolveActiveActivityModules(capabilities: ActivityCapabilitiesView): ActivityModuleDefinition[] {
  return ACTIVITY_MODULE_DEFINITIONS.filter((module) => capabilities[module.key])
}

export type ActivityCapabilitiesView = {
  shop: boolean
  appointments: boolean
  events: boolean
}

export function getActiveModuleFromPath(
  pathname: string,
  capabilities: ActivityCapabilitiesView
): ActivityModuleDefinition | null {
  return (
    resolveActiveActivityModules(capabilities).find((module) => module.matchPath(pathname)) ?? null
  )
}

export const ACTIVITY_HUB_PATH = '/dashboard'
export const ACTIVITY_STUDIO_PATH = '/dashboard/site'

export function resolveActivityLandingPath(capabilities: ActivityCapabilitiesView): string {
  const active = resolveActiveActivityModules(capabilities)
  return active[0]?.href ?? ACTIVITY_STUDIO_PATH
}

/** @deprecated Le hub n'a plus d'UI — la route ne sert qu'à rediriger. */
export function isActivityHubPath(pathname: string): boolean {
  return pathname === ACTIVITY_HUB_PATH
}
