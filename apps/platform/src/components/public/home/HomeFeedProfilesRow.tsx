import Image from 'next/image'
import Link from 'next/link'
import type { HomeFeedProfile } from '@ibee/shared'

type Props = {
  items: HomeFeedProfile[]
}

export function HomeFeedProfilesRow({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="home-feed-row home-feed-row--profiles" aria-label="Profils recommandés">
      <div className="home-feed-row__head">
        <h2 className="home-feed-row__title">Profils recommandés</h2>
      </div>
      <div className="home-feed-row__track">
        {items.map((item) => (
          <Link key={item.slug} href={`/${item.slug}`} className="home-feed-profile-card">
            <span className="home-feed-profile-card__avatar" aria-hidden="true">
              <Image
                src={item.avatarUrl}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </span>
            <span className="home-feed-profile-card__name truncate">{item.displayName}</span>
            {item.role ? (
              <span className="home-feed-profile-card__role truncate">{item.role}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
