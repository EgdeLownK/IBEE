import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { loadHomeFeedInitialPage } from '@/lib/load-home-feed'
import { HomeFeed } from '@/components/public/home/HomeFeed'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'IBEE — Accueil',
  description: 'Découvre produits, événements et services des solopreneurs sur IBEE.',
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    title: 'IBEE — Accueil',
    description: 'Découvre produits, événements et services des solopreneurs sur IBEE.',
    url: getSiteUrl(),
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default async function PublicHomePage() {
  const initial = await loadHomeFeedInitialPage()
  return <HomeFeed initial={initial} />
}
