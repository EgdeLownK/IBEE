'use client'

import { useState } from 'react'
import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import type { PublicProductData } from '@/lib/load-public-product'
import { DetailEntityStrip } from './DetailEntityStrip'
import { ProductBuyButton } from './ProductBuyButton'
import { ProductDetail } from './ProductDetail'
import { ProductFaq } from './ProductFaq'
import { ProductReviewsList } from './ProductReviewsList'
import { RelatedContent } from './RelatedContent'

type CheckoutState = {
  priceText: string | null
  variantId: string | null
  canBuy: boolean
}

interface Props {
  data: PublicProductData
  embedMode?: boolean
}

export function ProductDetailCheckout({ data, embedMode = false }: Props) {
  const [checkout, setCheckout] = useState<CheckoutState>({
    priceText: null,
    variantId: null,
    canBuy: false,
  })

  return (
    <main className="profile-page">
      <ProfileShell>
        <DetailTopBar backHref={data.backHref} title={`Voir le profil de ${data.entity.display_name}`} />

        <DetailEntityStrip
          displayName={data.entity.display_name}
          avatarUrl={data.entity.avatar_url}
          bannerUrl={data.entity.banner_url}
          profileHref={data.profileHref}
          title={data.product.title}
          subtitle={data.subtitle}
          priceText={checkout.priceText}
          ctaSlot={
            <ProductBuyButton
              entitySlug={data.entity.slug}
              productSlug={data.product.slug}
              variantId={checkout.variantId}
              disabled={!checkout.canBuy}
            />
          }
        />

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
    </main>
  )
}
