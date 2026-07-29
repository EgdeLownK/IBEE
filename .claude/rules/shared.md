---
paths:
  - "packages/shared/**"
---
# packages/shared

## Frontière

Logique métier TS pure, sans dépendance sur un framework ni sur la couche
BDD. Vérifié dans `package.json` : aucune entrée `dependencies` (seulement
des `devDependencies` — `eslint`, `typescript`, `typescript-eslint`) et,
dans `src/`, aucun import `react` ni `@ibee/supabase`. Ce n'est pas une
convention à respecter de mémoire : ce package **ne peut pas** importer ces
deux-là (React n'est même pas installé), donc toute tentative échoue au
type-check avant même l'exécution.

A sa place ici : parsing/validation de config de widget, calcul de tri
d'affichage, validation de brouillon multi-étapes (wizards), transforms de
présentation, helpers de format partagés entre plusieurs surfaces
(`home-feed.ts`, `analytics.ts`…). Exception notable : `lib/banner-image-crop.ts`
utilise des API DOM (`Blob`) pour le recadrage d'image côté client — reste
sans dépendance framework, mais n'est pas exécutable côté serveur ; à
n'appeler que depuis un Client Component.

N'a pas sa place ici :
- Tout ce qui exécute une requête Supabase → `packages/supabase`.
- Tout ce qui rend du JSX ou dépend de React (hooks, composants) →
  `packages/ui-react` ou `apps/platform`.
- Tout ce qui dépend de Next.js (Server Actions, Route Handlers, cookies,
  `revalidatePath`) → `apps/platform`.

## Exports

Deux mécanismes coexistent dans `package.json` (clé `exports`) : le barrel
`src/index.ts` (export `"."`, réexporte la majorité des modules) et des
sous-chemins dédiés par domaine (`@ibee/shared/entity-profile`,
`@ibee/shared/product-create`, `/service-create`, `/event-create`,
`/faq-items`, `/history-blocks`, `/home-widget-config`,
`/widget-display-content`, `/widget-empty-content`,
`/presentation-fields`, `/lib/banner-image-crop`). Ces modules-là sont
exportés **par les deux voies à la fois** (barrel + sous-chemin). Un second
groupe (`analytics.ts`, `carousel-items.ts`,
`carousel-picker-availability.ts`, `home-widget-order.ts`, `home-feed.ts`,
`manual-reg-contact-qr.ts`) n'a pas de sous-chemin dédié, uniquement le
barrel. Rien dans le code ne tranche lequel des deux choisir pour un
nouveau fichier — vérifier `package.json` avant d'ajouter, ne pas
supposer.

## Validation : convention dégagée pour les brouillons multi-étapes

Pour un formulaire wizard (plusieurs étapes, état de brouillon) ou un profil
complet, le pattern établi est une fonction `validate<Domaine>Step(step,
draft): ValidationResult` (ou `validate<Domaine>(input): ValidationResult`
pour un objet non séquencé) dans un fichier dédié du domaine — vérifié :
`validateServiceStep` (`service-create.ts`), `validateEventStep`
(`event-create.ts`), `validateProductStep` (`product-create.ts`),
`validateEntityProfile` (`entity-profile.ts`). Ces fonctions sont appelées
**à la fois côté client** (retour visuel immédiat pendant la saisie) **et
côté serveur**, à l'intérieur de la Server Action correspondante — vérifié
dans `apps/platform/src/app/dashboard/site/service-actions.ts`,
`event-actions.ts`, `entity-profile-actions.ts`, `product-actions.ts` (voir
`.claude/rules/server-actions.md`). Utiliser ce pattern plutôt que Zod
quand le besoin est un brouillon multi-étapes ou un profil déjà couvert par
un de ces validateurs.

Pour tout le reste (entrée simple, non liée à un wizard), aucune convention
ne se dégage à ce jour dans ce package : Zod est le choix fait ailleurs dans
le dépôt pour ce cas (`apply-schema.ts`, hors périmètre de ce package — voir
`.claude/rules/server-actions.md`), mais n'est pas utilisé dans
`packages/shared` lui-même. Ne pas présenter cela comme une doctrine
tranchée au-delà de ce qui est vérifié ici.
