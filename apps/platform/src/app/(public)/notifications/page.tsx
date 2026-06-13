import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function NotificationsPage() {
  return (
    <main className="home-stage">
      <div className="home-stage__inner">
        <h1 className="home-stage__title">Activité</h1>
        <p className="home-stage__lead">
          Le fil de notifications arrive bientôt sur Next.js.
        </p>
        <Link href="/" className="home-stage__cta">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
