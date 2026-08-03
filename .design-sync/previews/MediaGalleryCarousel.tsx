import { MediaGalleryCarousel } from '@ibee/ui-react';

export function MultipleImages() {
  return (
    <div style={{ maxWidth: 480 }}>
      <MediaGalleryCarousel
        title="Développeur Fullstack React — Paris"
        media={[
          { url: 'https://picsum.photos/seed/job-media-1/900/600', media_type: 'image' },
          { url: 'https://picsum.photos/seed/job-media-2/900/600', media_type: 'image' },
          { url: 'https://picsum.photos/seed/job-media-3/900/600', media_type: 'image' },
        ]}
      />
    </div>
  );
}

export function SingleImage() {
  return (
    <div style={{ maxWidth: 480 }}>
      <MediaGalleryCarousel
        title="Consultant SEO freelance"
        media={[{ url: 'https://picsum.photos/seed/job-media-single/900/600', media_type: 'image' }]}
      />
    </div>
  );
}
