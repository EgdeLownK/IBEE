import { ProfileShell } from '@ibee/ui-react/profile'
import { CommentsList } from './CommentsList'
import { DetailTopBar } from './DetailTopBar'
import { PublicationDetail } from './PublicationDetail'
import { PublicationDetailHeader } from './PublicationDetailHeader'
import type { PublicPublicationData } from '@/lib/load-public-publication'

interface Props {
  data: PublicPublicationData
}

export function PublicationDetailPage({ data }: Props) {
  return (
    <article className="profile-page">
      <ProfileShell>
        <DetailTopBar
          backHref={data.backHref}
          title={`Voir le profil de ${data.entity.display_name}`}
        />

        <PublicationDetailHeader
          title={data.publication.title}
          subtitle={data.relativeDate}
          publishedAt={data.publishedAt}
          dateTitle={data.fullDate}
          displayName={data.entity.display_name}
          avatarUrl={data.entity.avatar_url}
          profileHref={data.profileHref}
        />

        <PublicationDetail
          content={data.publication.content}
          media={data.publication.publication_media}
          commentsCount={data.publication.comments_count}
          entityId={data.entity.id}
          publicationId={data.publication.id}
          shareUrl={data.publicationUrl}
        />

        <div className="px-[22px] pb-6">
          <CommentsList
            comments={data.comments}
            commentsCount={data.publication.comments_count}
            publicationId={data.publication.id}
            entitySlug={data.entity.slug}
            publicationSlug={data.publication.slug}
            isAuthenticated={data.isAuthenticated}
            userId={data.userId}
            publicationOwnerUserId={data.entity.user_id}
          />
        </div>
      </ProfileShell>
    </article>
  )
}
