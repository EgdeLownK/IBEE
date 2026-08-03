import { AvatarCropperModal } from '@ibee/ui-react';

// Overlay plein écran (`fixed inset-0`) — une seule story, il n'y a pas
// d'état alternatif significatif à composer statiquement (le cadrage est
// piloté par interaction souris, non simulable dans une preview statique).
//
// Le wrapper `.ds-single` du harness de preview n'a pas de hauteur propre
// (aucun contenu en flux normal — le seul enfant est `position: fixed`, donc
// hors flux). `fixed inset-0` se retrouve alors ancré à une hauteur de
// containing block quasi nulle, et la modale (centrée en flex) rend hors
// cadre. Un frère en flux normal avec une hauteur explicite donne au
// wrapper une hauteur réelle contre laquelle `inset-0` peut se résoudre.
export function Default() {
  return (
    <div style={{ minHeight: 900 }}>
      <AvatarCropperModal
        imageSrc="https://picsum.photos/seed/avatar-crop-source/900/900"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </div>
  );
}
