import { ProfileCardReact } from '@ibee/ui-react';

export function SimpleContent() {
  return (
    <ProfileCardReact>
      <div style={{ padding: 24 }}>
        <h2 className="font-display text-xl font-semibold text-neutral-900">
          Séance de coaching individuel
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Une heure d'accompagnement personnalisé pour clarifier votre projet professionnel et
          définir un plan d'action concret.
        </p>
      </div>
    </ProfileCardReact>
  );
}

export function WithImageAndActions() {
  return (
    <ProfileCardReact>
      <img
        src="https://picsum.photos/seed/profile-card-cover/800/320"
        alt=""
        style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
      />
      <div style={{ padding: 24 }}>
        <h2 className="font-display text-xl font-semibold text-neutral-900">
          Atelier photo studio — groupe
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          3 heures pour apprendre les bases de la prise de vue en studio, matériel fourni. Places
          limitées à 6 participants.
        </p>
        <div className="mt-5 flex items-center gap-2.5">
          <button type="button" className="btn btn--dark flex-1">
            Réserver
          </button>
          <button type="button" className="btn btn--ghost flex-1">
            En savoir plus
          </button>
        </div>
      </div>
    </ProfileCardReact>
  );
}
