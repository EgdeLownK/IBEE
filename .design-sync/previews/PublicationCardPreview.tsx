import { PublicationCardPreview } from '@ibee/ui-react';

export function Empty() {
  return <PublicationCardPreview title="" content={null} imageUrls={[]} />;
}

export function TextOnly() {
  return (
    <PublicationCardPreview
      title="Nouvelle offre disponible cette semaine"
      content={
        'Je viens d\'ouvrir 3 créneaux supplémentaires pour des séances de coaching individuel. ' +
        'N\'hésitez pas à me contacter si vous êtes intéressé·e — premier échange offert.'
      }
      imageUrls={[]}
    />
  );
}

export function WithImages() {
  return (
    <PublicationCardPreview
      title="Retour sur le shooting studio du week-end"
      content="Merci à toute l'équipe pour cette belle session ! Quelques clichés en avant-première."
      imageUrls={[
        'https://picsum.photos/seed/pub-shoot-1/800/450',
        'https://picsum.photos/seed/pub-shoot-2/800/450',
        'https://picsum.photos/seed/pub-shoot-3/800/450',
      ]}
    />
  );
}
