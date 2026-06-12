import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/site-url'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'IBEE — Accueil',
  description: 'Bienvenue sur IBEE, la plateforme des solopreneurs.',
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    title: 'IBEE — Accueil',
    description: 'Bienvenue sur IBEE, la plateforme des solopreneurs.',
    url: getSiteUrl(),
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function PublicHomePage() {
  return (
    <main className="home-stage">
      <div className="home-stage__inner">
        <h1 className="home-stage__title">IBEE — Home</h1>
        <p className="home-stage__lead">
          Ton feed personnalisé arrive bientôt. En attendant, explore les profiles publiés.
        </p>
        <Link href="/explore" className="home-stage__cta">
          Explorer les profiles
        </Link>
      </div>
    </main>
  )
}
