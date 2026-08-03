## Conventions IBEE UI

Cette librairie est le design system de **IBEE**, une plateforme de profils
web pour solopreneurs. Composants React consommés tels quels par une app
Next.js — aucun wrapper/provider de contexte n'est requis pour les faire
fonctionner : chaque composant est autonome (pas de `ThemeProvider`, pas de
contexte i18n/routeur à fournir).

### Styling — classes utilitaires Tailwind v4 liées aux tokens IBEE

Les composants stylent exclusivement via des classes utilitaires Tailwind
générées depuis les tokens de marque (bloc `@theme` de `tokens.css`) —
**jamais** les valeurs par défaut Tailwind (`bg-white`, `gray-*`,
`rounded-lg`/`rounded-xl` génériques, couleurs hex en dur). Vocabulaire réel
disponible :

| Rôle | Classes |
|---|---|
| Fonds | `bg-surface`, `bg-panel`, `bg-background`, `bg-neutral-0`…`bg-neutral-900` |
| Bordures | `border-border`, `border-border-soft` |
| Rayons (par rôle, jamais par taille) | `rounded-card` (18px, cartes/panneaux), `rounded-field` (12px, inputs), `rounded-pill` (boutons/pills), `rounded-tile` (14px, vignettes) |
| Ombres | `shadow-md`, `shadow-shell` |
| Accent produit | `bg-accent`, `bg-accent-soft` |
| CTA principal | `bg-cta-primary`, `hover:bg-cta-primary-hover` |
| États sémantiques | `text-error`, `bg-error`, `text-success`, `bg-success` (jamais `red-*`/`green-*` bruts) |
| Polices | `font-sans` (Roboto, texte courant), `font-display` (Poppins, titres/boutons) |

D'autres tokens de rôle existent en variable CSS sans classe utilitaire
générée (usage non détecté dans le scan Tailwind actuel) — ex.
`var(--shadow-card)`, `var(--shadow-pop)`, `var(--radius-chip)`. Utiliser la
variable directement en style inline plutôt que d'inventer une classe
Tailwind qui n'existe pas dans le bundle.

**Boutons** : jamais de `<button>` restylé au cas par cas. Système unique —
`className="btn btn--dark"` (action principale sombre) ou `className="btn
btn--ghost"` (secondaire) pour un bouton texte, `className="iconbtn"` pour
un bouton icône seule.

### Où lire la vérité

- `styles.css` (racine du bundle) — importe la cascade complète (tokens,
  `button.css`, styles de composants). C'est la source de style à lire avant
  de composer une nouvelle mise en page, pas un résumé.
- `<Name>.prompt.md` par composant — contrat de props + doc d'usage.

### Exemple idiomatique

```tsx
import { Input } from '@ibee/ui-react'

<div className="rounded-card bg-surface p-6 shadow-md">
  <label className="mb-2 block text-sm font-medium text-neutral-900">
    Titre du poste
  </label>
  <Input placeholder="Ex: Développeur Fullstack React" />
  <button type="button" className="btn btn--dark mt-4">
    Enregistrer
  </button>
</div>
```
