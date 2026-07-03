import { ProfileShell } from '@ibee/ui-react/profile'
import { DetailTopBar } from '@/components/public/DetailTopBar'
import { BookingWidget } from '@/components/public/detail/BookingWidget'
import { DetailEntityStrip } from '@/components/public/detail/DetailEntityStrip'
import type { PublicBookingData } from '@/lib/load-public-booking'

interface Props {
  data: PublicBookingData
}

export function BookingPage({ data }: Props) {
  return (
    <main className="profile-page">
      <DetailTopBar backHref={data.backHref} title={`Réserver : ${data.service.title}`} />
      <ProfileShell>
        <DetailEntityStrip
          displayName={data.entity.display_name}
          avatarUrl={data.entity.avatar_url}
          profileHref={data.profileHref}
          title={data.service.title}
          subtitle={data.locationLabel}
        />
        <BookingWidget
          entity={data.entity}
          service={data.service}
          bookerName={data.bookerName}
          bookerEmail={data.bookerEmail}
          priceText={data.priceText}
          chargeLabel={data.chargeLabel}
          needsPayment={data.needsPayment}
          cancellationPolicyLabel={data.cancellationPolicyLabel}
          locationLabel={data.locationLabel}
          confirmedBaseHref={data.confirmedBaseHref}
        />
      </ProfileShell>
    </main>
  )
}
