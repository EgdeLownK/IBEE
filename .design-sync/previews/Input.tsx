import { useState } from 'react';
import { Input } from '@ibee/ui-react';

export function Default() {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: 320 }}>
      <label
        htmlFor="job-title"
        style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}
      >
        Titre du poste
      </label>
      <Input
        id="job-title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ex: Développeur Fullstack React"
        required
      />
    </div>
  );
}

export function Filled() {
  return (
    <div style={{ maxWidth: 320 }}>
      <label
        htmlFor="job-location"
        style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}
      >
        Localisation
      </label>
      <Input id="job-location" defaultValue="Paris, France" />
    </div>
  );
}

export function Subtle() {
  return (
    <div style={{ maxWidth: 320 }}>
      <Input variant="subtle" placeholder="Rechercher…" />
    </div>
  );
}

export function ErrorState() {
  return (
    <div style={{ maxWidth: 320 }}>
      <label
        htmlFor="job-apply-url"
        style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}
      >
        Lien pour postuler
      </label>
      <Input
        id="job-apply-url"
        error
        defaultValue="pas-un-lien-valide"
        aria-invalid="true"
      />
      <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--color-error)' }}>
        Veuillez saisir une URL ou un email valide.
      </p>
    </div>
  );
}
