import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import type { PublicEventData } from '@/lib/load-public-event'
import { DetailEntityStrip } from './DetailEntityStrip'
import { EntityDetailBody } from './EntityDetailBody'
import { EventRegistrationWidget } from './EventRegistrationWidget'
import { ProductFaq } from './ProductFaq'
import { RelatedContent } from './RelatedContent'

interface Props {
  data: PublicEventData
}

export function EventDetailPage({ data }: Props) {
  const subtitle = [`${data.dayChip} ${data.monthChip}`, data.locLabel].filter(Boolean).join(' · ')

  return (
    <main className="profile-page">
      <ProfileShell>
        <DetailTopBar backHref={data.backHref} title={`Voir le profil de ${data.entity.display_name}`} />

        <DetailEntityStrip
          displayName={data.entity.display_name}
          avatarUrl={data.entity.avatar_url}
          profileHref={data.profileHref}
          title={data.event.title}
          subtitle={subtitle}
        />

        <EntityDetailBody
          title={data.event.title}
          media={data.eventMedia}
          stats={data.stats}
          detailRows={data.detailRows}
          entitySlug={data.entity.slug}
          entityKind="event"
          contentBlocks={data.detailContentBlocks}
          fallbackText={data.event.description}
          hasNews={data.hasNews}
        />

        <EventRegistrationWidget
          eventId={data.event.id}
          statusAvailable={data.statusAvailable}
          initialName={data.bookerName}
          initialEmail={data.bookerEmail}
        />

        <div className="product-related pb-2">
          <RelatedContent title={`Autres contenus de ${data.entity.display_name}`} items={data.profileRelated} />
          <RelatedContent title="À découvrir aussi" items={data.similarRelated} />
        </div>

        {data.faq.length > 0 && (
          <div className="product-sections px-[22px] pt-2 pb-6">
            <section className="product-major-section">
              <h2 className="product-major-section__title">Questions</h2>
              <div className="product-major-section__body">
                <ProductFaq faq={data.faq} emptyLabel="Pas encore de FAQ pour cet événement." />
              </div>
            </section>
          </div>
        )}
      </ProfileShell>
    </main>
  )
}
