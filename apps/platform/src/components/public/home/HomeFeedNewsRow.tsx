import Image from 'next/image'
import Link from 'next/link'
import type { HomeFeedNewsItem } from '@ibee/shared'

type Props = {
  items: HomeFeedNewsItem[]
}

export function HomeFeedNewsRow({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="home-feed-row home-feed-row--news" aria-label="News">
      <div className="home-feed-row__head">
        <h2 className="home-feed-row__title">News</h2>
      </div>
      <div className="home-feed-row__track">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="home-feed-news-card">
            <span className="home-feed-news-card__media">
              <Image
                src={item.imageUrl}
                alt=""
                width={300}
                height={200}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </span>
            <span className="home-feed-news-card__body">
              <span className="home-feed-news-card__author truncate">
                {item.entity.displayName}
              </span>
              <span className="home-feed-news-card__title">{item.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
