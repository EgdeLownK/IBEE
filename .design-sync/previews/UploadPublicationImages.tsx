import { useState } from 'react';
import { UploadPublicationImages, type ImageItem } from '@ibee/ui-react';

// `file: File` ne peut pas être instancié de façon réaliste dans une preview
// statique (pas de vrai fichier disque) — seul `previewUrl`/`uploading`/
// `error` pilotent le rendu, `file` est castée pour satisfaire le typage.
const fakeFile = {} as File;

export function Empty() {
  const [images, setImages] = useState<ImageItem[]>([]);
  return (
    <div style={{ maxWidth: 480 }}>
      <UploadPublicationImages
        images={images}
        onImagesChange={setImages}
        onUpload={async () => 'https://picsum.photos/seed/uploaded/400/400'}
      />
    </div>
  );
}

export function WithImages() {
  const [images, setImages] = useState<ImageItem[]>([
    { id: '1', file: fakeFile, previewUrl: 'https://picsum.photos/seed/pub-img-1/400/400', uploading: false, uploadedUrl: 'https://picsum.photos/seed/pub-img-1/400/400' },
    { id: '2', file: fakeFile, previewUrl: 'https://picsum.photos/seed/pub-img-2/400/400', uploading: false, uploadedUrl: 'https://picsum.photos/seed/pub-img-2/400/400' },
    { id: '3', file: fakeFile, previewUrl: 'https://picsum.photos/seed/pub-img-3/400/400', uploading: false, uploadedUrl: 'https://picsum.photos/seed/pub-img-3/400/400' },
  ]);
  return (
    <div style={{ maxWidth: 480 }}>
      <UploadPublicationImages
        images={images}
        onImagesChange={setImages}
        onUpload={async () => 'https://picsum.photos/seed/uploaded/400/400'}
      />
    </div>
  );
}

export function UploadingAndError() {
  const [images, setImages] = useState<ImageItem[]>([
    { id: '1', file: fakeFile, previewUrl: 'https://picsum.photos/seed/pub-img-4/400/400', uploading: false, uploadedUrl: 'https://picsum.photos/seed/pub-img-4/400/400' },
    { id: '2', file: fakeFile, previewUrl: 'https://picsum.photos/seed/pub-img-5/400/400', uploading: true },
    { id: '3', file: fakeFile, previewUrl: 'https://picsum.photos/seed/pub-img-6/400/400', uploading: false, error: "Échec de l'upload" },
  ]);
  return (
    <div style={{ maxWidth: 480 }}>
      <UploadPublicationImages
        images={images}
        onImagesChange={setImages}
        onUpload={async () => 'https://picsum.photos/seed/uploaded/400/400'}
      />
    </div>
  );
}
