import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import type { PublicServiceData } from '@/lib/load-public-service'
import { DetailEntityStrip } from './DetailEntityStrip'
import { EntityDetailBody } from './EntityDetailBody'
import { ProductFaq } from './ProductFaq'
import { ProductReviewsList } from './ProductReviewsList'
import { RelatedContent } from './RelatedContent'
import { embedProfileHref, mapServiceDataForEmbed } from '@/lib/embed-public-urls'

interface Props {
  data: PublicServiceData
  embedMode?: boolean | 'dashboard'
}

export function ServiceDetailPage({ data: initialData, embedMode = false }: Props) {
  const data = embedMode
    ? mapServiceDataForEmbed(initialData, embedMode === 'dashboard' ? 'dashboard' : 'preview')
    : initialData
  const subtitle = [`${data.service.duration_minutes} min`, data.locLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="profile-page">
      <ProfileShell>
        <DetailTopBar
          backHref={data.backHref}
          title={`Voir le profil de ${data.entity.display_name}`}
        />

        <DetailEntityStrip
          displayName={data.entity.display_name}
          avatarUrl={data.entity.avatar_url}
          bannerUrl={data.entity.banner_url}
          profileHref={data.profileHref}
          title={data.service.title}
          subtitle={subtitle}
          priceText={data.priceText}
          ctaHref={data.bookingHref}
          ctaLabel="Réserver"
        />

        <EntityDetailBody
          title={data.service.title}
          media={data.serviceMedia}
          stats={data.stats}
          ctaHref={data.bookingHref}
          ctaLabel="Réserver"
          detailRows={data.detailRows}
          entitySlug={data.entity.slug}
          entityKind="service"
          contentBlocks={data.detailContentBlocks}
          hasNews={data.hasNews}
          profileBaseHref={embedMode ? embedProfileHref(data.entity.slug) : undefined}
        />

        <div className="product-related pb-2">
          <RelatedContent
            title={`Autres contenus de ${data.entity.display_name}`}
            items={data.profileRelated}
          />
          <RelatedContent title="À découvrir aussi" items={data.similarRelated} />
        </div>

        <div className="product-sections px-[22px] pt-2 pb-6">
          <section className="product-major-section">
            <h2 className="product-major-section__title">Questions &amp; avis</h2>
            <div className="product-major-section__body">
              <ProductFaq faq={data.faq} emptyLabel="Pas encore de FAQ pour ce service." />
              <ProductReviewsList
                reviews={data.reviews}
                aggregates={data.aggregates}
                distribution={data.distribution}
                activeRatings={data.activeRatings}
                activeSort={data.activeSort}
                basePath={data.basePath}
              />
            </div>
          </section>
        </div>
      </ProfileShell>
    </main>
  )
}
