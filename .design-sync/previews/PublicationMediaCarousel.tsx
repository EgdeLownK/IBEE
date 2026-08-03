import { PublicationMediaCarousel } from '@ibee/ui-react';

export function SingleImage() {
  return (
    <div style={{ maxWidth: 480 }}>
      <PublicationMediaCarousel
        fullWidth
        media={[
          { url: 'https://picsum.photos/seed/pub-media-single/800/450', width: 800, height: 450 },
        ]}
      />
    </div>
  );
}

export function MultiImage() {
  return (
    <div style={{ maxWidth: 480 }}>
      <PublicationMediaCarousel
        fullWidth
        media={[
          { url: 'https://picsum.photos/seed/pub-media-1/800/450', width: 800, height: 450 },
          { url: 'https://picsum.photos/seed/pub-media-2/800/450', width: 800, height: 450 },
          { url: 'https://picsum.photos/seed/pub-media-3/800/450', width: 800, height: 450 },
        ]}
      />
    </div>
  );
}

export function DetailNonFullWidth() {
  return (
    <div style={{ maxWidth: 420 }}>
      <PublicationMediaCarousel
        media={[
          { url: 'https://picsum.photos/seed/pub-media-detail-1/600/800', width: 600, height: 800 },
          { url: 'https://picsum.photos/seed/pub-media-detail-2/800/600', width: 800, height: 600 },
        ]}
      />
    </div>
  );
}
