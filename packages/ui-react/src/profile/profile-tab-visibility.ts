import {
  PROFILE_ACTIVITY_TAB_TYPES,
  PROFILE_TAB_ORDER,
  type ProfileTabType,
} from './profile-tabs'

export type ProfileTabContent = {
  publicationsCount: number
  shopProductsCount: number
  playlistServicesCount: number
  playlistEventsCount: number
  historyBlocksCount: number
}

const ACTIVITY_TAB_SET = new Set<string>(PROFILE_ACTIVITY_TAB_TYPES)

export function hasProfileTabContent(
  tab: ProfileTabType,
  content: ProfileTabContent
): boolean {
  switch (tab) {
    case 'home':
      return true
    case 'news':
      return content.publicationsCount > 0
    case 'shop':
      return content.shopProductsCount > 0
    case 'appointments':
      return content.playlistServicesCount > 0
    case 'events':
      return content.playlistEventsCount > 0
    case 'history':
      return content.historyBlocksCount > 0
    default:
      return false
  }
}

function isActivityTab(tab: string): tab is ProfileTabType {
  return ACTIVITY_TAB_SET.has(tab)
}

/** Shop / Service / Event dans l'ordre d'ajout (position entity_menu_sections). */
function orderedActivityTabsFromMenu(
  menuSections: readonly { type: string }[]
): ProfileTabType[] {
  const seen = new Set<string>()
  const ordered: ProfileTabType[] = []
  for (const section of menuSections) {
    if (!isActivityTab(section.type) || seen.has(section.type)) continue
    seen.add(section.type)
    ordered.push(section.type)
  }
  return ordered
}

/** Studio : onglets activité avec contenu mais sans section menu → fin du bloc, ordre fixe. */
function activityTabsWithStudioFallback(
  menuSections: readonly { type: string }[],
  mode: 'public' | 'studio',
  content: ProfileTabContent
): ProfileTabType[] {
  const fromMenu = orderedActivityTabsFromMenu(menuSections)
  if (mode === 'public') return fromMenu

  const fromMenuSet = new Set(fromMenu)
  const extras = PROFILE_ACTIVITY_TAB_TYPES.filter(
    (tab) => !fromMenuSet.has(tab) && hasProfileTabContent(tab, content)
  )
  return [...fromMenu, ...extras]
}

/**
 * Public : onglet visible si contenu ET section menu active (non masquée).
 * Studio (owner/équipe) : onglet visible dès qu'il y a du contenu, même si masqué.
 *
 * Ordre : Accueil → News → Shop/Service/Event (ordre d'ajout) → Histoire.
 */
export function getVisibleProfileTabs(
  mode: 'public' | 'studio',
  menuSections: Iterable<{ type: string }>,
  content: ProfileTabContent
): ProfileTabType[] {
  const menuList = [...menuSections]
  const menuSet = new Set(menuList.map((s) => s.type))

  const isVisible = (tab: ProfileTabType): boolean => {
    if (!hasProfileTabContent(tab, content)) return false
    if (mode === 'studio') return true
    if (tab === 'home') return true
    return menuSet.has(tab)
  }

  const result: ProfileTabType[] = []

  if (isVisible('home')) result.push('home')
  if (isVisible('news')) result.push('news')

  for (const tab of activityTabsWithStudioFallback(menuList, mode, content)) {
    if (isVisible(tab)) result.push(tab)
  }

  if (isVisible('history')) result.push('history')

  return result
}

export function profileTabContentFromLists(lists: {
  publications?: readonly unknown[]
  shopProducts?: readonly unknown[]
  playlistServices?: readonly unknown[]
  playlistEvents?: readonly unknown[]
  historyBlocks?: readonly unknown[]
}): ProfileTabContent {
  return {
    publicationsCount: lists.publications?.length ?? 0,
    shopProductsCount: lists.shopProducts?.length ?? 0,
    playlistServicesCount: lists.playlistServices?.length ?? 0,
    playlistEventsCount: lists.playlistEvents?.length ?? 0,
    historyBlocksCount: lists.historyBlocks?.length ?? 0,
  }
}

/** Ordre canonique (fallback / docs) — activité en ordre fixe. */
export { PROFILE_TAB_ORDER }
