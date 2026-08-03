import { useState } from 'react';
import { Textarea } from '@ibee/ui-react';

export function Default() {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 360 }}>
      <label
        htmlFor="pub-content"
        style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}
      >
        Contenu de la publication
      </label>
      <Textarea
        id="pub-content"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Partagez une actualité, une offre, un retour d'expérience…"
      />
    </div>
  );
}

export function Filled() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Textarea
        rows={4}
        defaultValue={
          "J'accompagne les indépendants dans la structuration de leur offre commerciale. " +
          'Premier échange toujours offert.'
        }
      />
    </div>
  );
}

export function ErrorState() {
  return (
    <div style={{ maxWidth: 360 }}>
      <label
        htmlFor="pub-bio"
        style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}
      >
        Bio
      </label>
      <Textarea id="pub-bio" rows={3} error defaultValue="" aria-invalid="true" />
      <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--color-error)' }}>
        La bio ne peut pas être vide.
      </p>
    </div>
  );
}
