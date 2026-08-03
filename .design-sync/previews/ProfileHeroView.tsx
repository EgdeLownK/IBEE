import { ProfileHeroView } from '@ibee/ui-react/profile';

export function WithAvatar() {
  return (
    <ProfileHeroView
      displayName="Camille Berthier"
      role="Coach en développement professionnel"
      bio="J'accompagne les indépendants et cadres en transition dans la structuration de leur projet professionnel. 10 ans d'expérience en cabinet RH."
      avatarUrl="https://picsum.photos/seed/camille-berthier/200/200"
      followersCount={342}
      readOnly={false}
      onAddContent={() => {}}
      onEditProfile={() => {}}
    />
  );
}

export function NoAvatarInitialsFallback() {
  return (
    <ProfileHeroView
      displayName="Julien Roche"
      role="Consultant SEO freelance"
      bio={null}
      avatarUrl={null}
      followersCount={0}
      readOnly={false}
      onAddContent={() => {}}
      onEditProfile={() => {}}
    />
  );
}

export function ReadOnly() {
  return (
    <ProfileHeroView
      displayName="Amandine Fontaine"
      role="Photographe événementiel"
      bio="Mariages, portraits et événements d'entreprise partout en Île-de-France."
      avatarUrl="https://picsum.photos/seed/amandine-fontaine/200/200"
      followersCount={12800}
      readOnly
    />
  );
}
