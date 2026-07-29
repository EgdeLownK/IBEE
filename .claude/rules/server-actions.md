---
paths:
  - "apps/platform/src/app/**/*actions.ts"
---
# Sécurité des Server Actions

Une Server Action (`'use server'`) est un point d'entrée HTTP public au même
titre qu'une Route Handler : elle est appelable directement, avec des
arguments arbitraires, sans passer par le formulaire qui l'invoque
normalement dans l'UI. Voir `.claude/rules/api-security.md` pour l'équivalent
côté `app/api/**`.

## Identité côté serveur uniquement

Établir l'utilisateur via `auth.getUser()` server-side, jamais via un
identifiant transmis par le client. Deux patterns coexistent dans le dépôt,
tous deux corrects :
- `requireDashboardContext()` (`apps/platform/src/lib/dashboard-context.ts`)
  — appelle `auth.getUser()` puis résout l'entité possédée par cet
  utilisateur (`getEntityByUserId`). Pattern le plus récent, utilisé
  notamment par `event-ticket-actions.ts`, `service-actions.ts`,
  `boutique-actions.ts`, `messages-actions.ts`, `billetterie-actions.ts`.
- `auth.getUser()` + `getEntityByUserId(supabase, user.id)` inline — pattern
  plus ancien, encore majoritaire (`entity-profile-actions.ts`,
  `event-actions.ts`, `publication-actions.ts`, `history-actions.ts`,
  `product-actions.ts`, `contact-actions.ts`, `home-widgets-actions.ts`,
  `team-actions.ts`, `faq-actions.ts`, `payout-actions.ts`,
  `account-actions.ts`, `notification-actions.ts`). Équivalent
  fonctionnellement à `requireDashboardContext()`, pas une régression à
  corriger d'office.

Exception légitime : une action publique sans authentification requise
(ex. `createJobApplicationAction` dans `apply-actions.ts`, candidature à une
offre d'emploi) — dans ce cas le contrôle porte entièrement sur la ressource
visée (voir section suivante), pas sur l'identité de l'appelant.

## Autorisation sur la ressource, pas seulement authentification

Être connecté ne suffit pas : vérifier que l'utilisateur a le droit d'agir
sur la ressource précise visée par l'action (ownership), pas seulement
qu'il a une session valide. **Ne pas considérer le RLS comme une couche
suffisante** : une policy RLS protège la ligne (empêche de lire/écrire une
ligne d'une autre entité), elle ne protège pas une règle métier applicative
(ex. capacité restante, fenêtre de vente ouverte, cohérence entre deux
identifiants liés — voir point suivant). Détail des policies RLS :
`.claude/rules/database.md`.

## Le contrôle doit porter sur l'objet réellement muté

Vérifier l'ownership d'un identifiant ne protège pas les identifiants
imbriqués qui ne sont pas eux-mêmes revérifiés avant la mutation — motif
qui rassure à la relecture (« il y a bien un contrôle ») et donc plus
dangereux qu'une absence totale de contrôle.

Cas réel observé dans `event-ticket-actions.ts` : `requireOwnedEvent(eventId)`
vérifie que l'événement appartient à l'entité de l'appelant, mais
`saveEventTicketTypeAction`/`deleteEventTicketTypeAction` mutent ensuite
`ticketTypeId` sans revérifier qu'il appartient à cet `eventId` précis (idem
pour `activityId` en update dans `saveEventActivityAction`, et `codeId` dans
`deleteEventPromoCodeAction`) — seule la création vérifie explicitement
l'appartenance d'un `activityId` fourni (`listActivitiesByEvent` +
`.some(...)`). Dans ce cas précis, la policy RLS `*_owner_all`/`*_owner_update`
sur `entity_id` limite l'impact au périmètre de la même entité (pas de fuite
inter-tenant), mais rien ne garantit cette même limite pour une future table
sans policy équivalente — ne pas reproduire ce motif : quand une action
reçoit plusieurs identifiants imbriqués, vérifier la chaîne complète
(le sous-identifiant appartient au parent déjà vérifié), pas seulement le
premier maillon.

## Ne jamais faire confiance à un montant, prix, statut ou identifiant de propriétaire reçu en argument

Recalculer côté serveur à partir de la base plutôt que d'utiliser la valeur
transmise. Dans ce dépôt, les Server Actions actuelles qui manipulent un
`price_cents` (`product-actions.ts`, `service-actions.ts`, `event-actions.ts`,
`event-ticket-actions.ts`) le font en tant que **configuration par le
propriétaire** (l'entité fixe son propre prix de vente) : usage légitime,
il ne s'agit pas de faire confiance à un montant lors d'un paiement. Le
recalcul serveur du montant à charger existe déjà, mais dans les Route
Handlers de paiement (`app/api/checkout/**`, ex.
`resolveEventTicketPriceCents`, `resolveUnitPriceCents` — hors périmètre de
cette règle, voir `.claude/rules/api-security.md`) : si une future Server
Action initie elle-même une charge ou mute un statut de commande/paiement,
reproduire ce pattern (relire le prix/statut depuis la BDD, ne jamais
accepter celui de l'argument) plutôt que d'improviser.

## Validation des entrées

- Zod pour toute entrée non couverte par un validateur existant — dépendance
  déjà installée (`apps/platform/package.json`), pattern introduit par
  `apply-actions.ts`/`apply-schema.ts` (`ApplyFieldsSchema`, `OfferIdSchema`).
  Encore isolé à ce jour (un seul fichier) : à généraliser progressivement,
  pas un chantier de migration en masse à faire d'un coup.
- Les validateurs existants de `@ibee/shared` (`validateServiceStep`,
  `validateEventStep`, `validateEntityProfile`, `validateProductStep`,
  `validateFaqItems`, `validatePresentationFields`) là où ils couvrent déjà
  le besoin — déjà appelés côté serveur dans `service-actions.ts`,
  `event-actions.ts`, `entity-profile-actions.ts`, `product-actions.ts` (pas
  seulement côté client). Ne pas dupliquer cette logique en Zod si un de ces
  validateurs couvre déjà le champ concerné. Voir `.claude/rules/shared.md`.

## Messages d'erreur

Message destiné à l'utilisateur : en français, générique, sans détail
technique (pas de message d'erreur Postgres/Supabase brut, pas de nom de
colonne/table). Logguer le détail technique côté serveur
(`console.error('[nomDeLAction]', err)`) et retourner un message métier
court côté client — pattern déjà uniforme dans `event-ticket-actions.ts`
(`'Titre invalide.'`, `'Impossible d'enregistrer le billet.'`, etc.) et
`apply-actions.ts` (code Postgres `42501` traduit en `"Cette offre n'est
plus disponible."`, jamais exposé tel quel).
