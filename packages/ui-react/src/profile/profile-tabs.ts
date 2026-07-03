import {
  BookOpen,
  CalendarDays,
  House,
  Newspaper,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export const PROFILE_TAB_LABELS: Record<string, string> = {
  home: 'Accueil',
  shop: 'Shop',
  appointments: 'Service',
  events: 'Event',
  news: 'News',
  history: 'Histoire',
}

export const PROFILE_TAB_ICONS: Record<string, LucideIcon> = {
  home: House,
  shop: ShoppingBag,
  appointments: CalendarDays,
  events: Zap,
  news: Newspaper,
  history: BookOpen,
}

export const PROFILE_TAB_ORDER = [
  'home',
  'news',
  'shop',
  'appointments',
  'events',
  'history',
] as const

/** Onglets activité : ordre dynamique selon l'ajout (position menu). */
export const PROFILE_ACTIVITY_TAB_TYPES = ['shop', 'appointments', 'events'] as const

export type ProfileTabType = (typeof PROFILE_TAB_ORDER)[number]
