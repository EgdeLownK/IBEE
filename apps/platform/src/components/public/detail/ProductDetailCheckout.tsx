'use client'

import { useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import type { PublicProductData } from '@/lib/load-public-product'
import { mapProductDataForEmbed } from '@/lib/embed-public-urls'
import { ProductBuyButton } from './ProductBuyButton'
import { ProductDetail } from './ProductDetail'
import { ProductFaq } from './ProductFaq'
import { ProductReviewsList } from './ProductReviewsList'
import { RelatedContent } from './RelatedContent'

type CheckoutState = {
  priceText: string | null
  variantId: string | null
  canBuy: boolean
  isScheduled?: boolean
}

interface Props {
  data: PublicProductData
  embedMode?: boolean | 'dashboard'
}

export function ProductDetailCheckout({ data: initialData, embedMode = false }: Props) {
  const [checkout, setCheckout] = useState<CheckoutState>({
    priceText: null,
    variantId: null,
    canBuy: false,
  })

  const data = embedMode
    ? mapProductDataForEmbed(initialData, embedMode === 'dashboard' ? 'dashboard' : 'preview')
    : initialData

  return (
    <main className="profile-page">
      <div className="flex justify-center items-start gap-8 mx-auto w-full max-w-[1152px] xl:px-8 lg:px-4">
        <ProfileShell>
          <DetailTopBar backHref={data.backHref} title={`Voir le profil de ${data.entity.display_name}`} />

          <ProductDetail
            buyBoxSlot={
              <ProductBuyButton
                entitySlug={data.entity.slug}
                productSlug={data.product.slug}
                variantId={checkout.variantId}
                disabled={!checkout.canBuy}
                label={checkout.isScheduled ? "Bientôt disponible" : "Acheter"}
              />
            }
            product={data.product}
            categoryName={data.categoryName}
            bulletPoints={data.bulletPoints}
            contentBlocks={data.contentBlocks}
            saleActive={data.saleActive}
            customDetails={data.customDetails}
            aggregates={data.aggregates}
            entitySlug={data.entity.slug}
            hasNews={data.hasNews}
            newsItems={data.newsItems}
            embedMode={embedMode}
            onCheckoutStateChange={setCheckout}
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

        <div className="product-detail-sidebar hidden lg:block sticky top-24 w-[360px] shrink-0 self-start bg-surface border border-border shadow-shell rounded-2xl p-6">
          <div id="buybox-portal" />
        </div>
      </div>
    </main>
  )
}
