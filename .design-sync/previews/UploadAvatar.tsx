import { UploadAvatar } from '@ibee/ui-react';

export function WithAvatar() {
  return (
    <UploadAvatar
      currentAvatarUrl="https://picsum.photos/seed/upload-avatar-current/300/300"
      displayName="Camille Berthier"
      onUpload={async () => {}}
      onDelete={async () => {}}
    />
  );
}

export function NoAvatarPatternFallback() {
  return (
    <UploadAvatar
      currentAvatarUrl={null}
      displayName="Julien Roche"
      onUpload={async () => {}}
      onDelete={async () => {}}
    />
  );
}
