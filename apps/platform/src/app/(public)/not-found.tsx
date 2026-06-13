import Link from 'next/link'

export default function PublicNotFound() {
  return (
    <main className="home-stage">
      <div className="home-stage__inner">
        <h1 className="home-stage__title">Page introuvable</h1>
        <p className="home-stage__lead">
          Cette page n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link href="/" className="home-stage__cta">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
