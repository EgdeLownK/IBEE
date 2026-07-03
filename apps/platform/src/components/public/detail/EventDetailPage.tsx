import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import type { PublicEventData } from '@/lib/load-public-event'
import { DetailEntityStrip } from './DetailEntityStrip'
import { EntityDetailBody } from './EntityDetailBody'
import { EventParticipationCta } from './EventParticipationCta'
import { ProductFaq } from './ProductFaq'
import { RelatedContent } from './RelatedContent'
import { embedProfileHref } from '@/lib/embed-public-urls'

interface Props {
  data: PublicEventData
  embedMode?: boolean
}

export function EventDetailPage({ data, embedMode = false }: Props) {
  const subtitle = [`${data.dayChip} ${data.monthChip}`, data.locLabel].filter(Boolean).join(' · ')

  return (
    <main className="profile-page">
      <ProfileShell>
        <DetailTopBar backHref={data.backHref} title={`Voir le profil de ${data.entity.display_name}`} />

        <DetailEntityStrip
          displayName={data.entity.display_name}
          avatarUrl={data.entity.avatar_url}
          bannerUrl={data.entity.banner_url}
          profileHref={data.profileHref}
          title={data.event.title}
          subtitle={subtitle}
          ctaSlot={
            data.statusAvailable ? (
              <EventParticipationCta
                eventId={data.event.id}
                entityId={data.entity.id}
                entitySlug={data.entity.slug}
                eventSlug={data.event.slug}
                statusAvailable={data.statusAvailable}
                isAuthenticated={data.isAuthenticated}
                messageEnabled={data.messageEnabled}
                messageHref={data.messageHref}
                bookerName={data.bookerName}
                bookerEmail={data.bookerEmail}
                initialRegistered={data.viewerRegistration != null}
                hasActivities={data.hasActivities}
                activities={data.activities}
                registrationTarget={data.registrationTarget}
              />
            ) : null
          }
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
          profileBaseHref={embedMode ? embedProfileHref(data.entity.slug) : undefined}
        />

        {data.hasActivities && data.activities.length > 0 ? (
          <div className="product-sections px-[22px] pt-2 pb-2">
            <section className="product-major-section">
              <h2 className="product-major-section__title">Places</h2>
              <div className="product-major-section__body">
                <ul className="event-program-list">
                  {data.activities.map((activity) => (
                    <li key={activity.id} className="event-program-list__item">
                      <div className="event-program-list__main">
                        <strong className="event-program-list__title">{activity.title}</strong>
                        <span className="event-program-list__slot">{activity.slotLabel}</span>
                      </div>
                      {activity.remaining != null ? (
                        <span className="event-program-list__places">
                          {activity.isFull ? 'Complet' : `${activity.remaining} place${activity.remaining > 1 ? 's' : ''}`}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}

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
