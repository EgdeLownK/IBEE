import { ProfileHeroReact } from '@ibee/ui-react';

export function WithAvatar() {
  return (
    <ProfileHeroReact
      displayName="Camille Berthier"
      role="Coach en développement professionnel"
      location="Lyon, France"
      bio="J'accompagne les indépendants et cadres en transition dans la structuration de leur projet professionnel. 10 ans d'expérience en cabinet RH."
      avatarUrl="https://picsum.photos/seed/camille-berthier-hero/600/600"
      createdAt="2022-03-14T00:00:00.000Z"
    />
  );
}

export function NoAvatarPatternFallback() {
  return (
    <ProfileHeroReact
      displayName="Julien Roche"
      role="Consultant SEO freelance"
      location={null}
      bio={null}
      avatarUrl={null}
      createdAt="2024-09-01T00:00:00.000Z"
    />
  );
}

export function MinimalNoBioNoLocation() {
  return (
    <ProfileHeroReact
      displayName="Amandine Fontaine"
      role="Photographe événementiel"
      location={null}
      bio={null}
      avatarUrl="https://picsum.photos/seed/amandine-fontaine-hero/600/600"
      createdAt="2021-06-20T00:00:00.000Z"
    />
  );
}
