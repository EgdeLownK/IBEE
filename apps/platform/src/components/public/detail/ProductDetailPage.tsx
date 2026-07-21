import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import type { PublicProductData } from '@/lib/load-public-product'
import { DetailEntityStrip } from './DetailEntityStrip'
import { ProductDetail } from './ProductDetail'
import { ProductFaq } from './ProductFaq'
import { ProductReviewsList } from './ProductReviewsList'
import { RelatedContent } from './RelatedContent'

interface Props {
  data: PublicProductData
}

export function ProductDetailPage({ data }: Props) {
  return (
    <main className="profile-page">
      <div className="flex justify-center items-start gap-8 mx-auto w-full max-w-[1152px] xl:px-8 lg:px-4">
        <ProfileShell>
          <DetailTopBar backHref={data.backHref} title={`Voir le profil de ${data.entity.display_name}`} />



        <ProductDetail
          product={data.product}
          categoryName={data.categoryName}
          bulletPoints={data.bulletPoints}
          contentBlocks={data.contentBlocks}
          saleActive={data.saleActive}
          customDetails={data.customDetails}
          aggregates={data.aggregates}
          entitySlug={data.entity.slug}
          hasNews={data.hasNews}
        />

        <div className="product-related pb-2">
          <RelatedContent title={`Autres contenus de ${data.entity.display_name}`} items={data.profileRelated} />
          <RelatedContent title="À découvrir aussi" items={data.similarRelated} />
        </div>

        <div className="product-sections px-[22px] pt-2 pb-6">
          <section className="product-major-section">
            <h2 className="product-major-section__title">Questions &amp; avis</h2>
            <div className="product-major-section__body">
              <ProductFaq faq={data.faq} />
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

      <aside id="buybox-portal" className="hidden lg:block w-[320px] shrink-0 sticky top-8 bg-surface border border-border shadow-shell rounded-2xl p-6" />
      </div>
    </main>
  )
}
