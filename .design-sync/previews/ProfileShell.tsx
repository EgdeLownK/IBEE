import { ProfileShell } from '@ibee/ui-react/profile';

export function BookingPageComposition() {
  return (
    <ProfileShell>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '20px 0' }}>
        <img
          src="https://picsum.photos/seed/entity-strip/80/80"
          alt=""
          style={{ width: 56, height: 56, borderRadius: 9999, objectFit: 'cover' }}
        />
        <div>
          <p className="font-display text-base font-semibold text-neutral-900">
            Séance photo portrait
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">Amandine Fontaine — Lyon, France</p>
        </div>
      </div>
      <div
        style={{
          borderTop: '1px solid var(--color-border-soft)',
          padding: '20px 0',
        }}
      >
        <h2 className="font-display text-lg font-semibold text-neutral-900">Réserver un créneau</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Choisissez une date et un horaire disponibles ci-dessous pour confirmer votre réservation.
        </p>
      </div>
    </ProfileShell>
  );
}

export function SimpleContent() {
  return (
    <ProfileShell>
      <div style={{ padding: '24px 0' }}>
        <h2 className="font-display text-lg font-semibold text-neutral-900">
          Confirmation de réservation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Votre réservation a bien été enregistrée. Un email de confirmation vous a été envoyé.
        </p>
      </div>
    </ProfileShell>
  );
}
