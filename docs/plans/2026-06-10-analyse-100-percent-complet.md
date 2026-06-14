# Analyse 100 % fonctionnel — Plan complet (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter `/dashboard/analyse` et **chaque scope dérivé** (Profil web, Service, Shop, Event, News) à **100 % fonctionnel** : toutes les métriques affichées proviennent de sources réelles, tous les graphiques ont des séries temporelles, aucun proxy trompeur, aucun `—` sauf absence de données sur la période (pas de feature manquante).

**Prérequis livrés (v1 — 2026-06-09/10):**
- Table `entity_analytics_events` + ingestion `/api/analytics/track`
- Loader `analyse-data.ts` + UI branchée + export CSV scope courant
- Collecte : profil, sections, publications, produits, services, events, follow/unfollow, wishlist, bookings, partages
- Équipe Supabase (rôles / invitations / membres) — base pour permissions

**Ce plan couvre le delta v1 → 100 %.**

---

## Définition stricte « 100 % »

| Règle | Signification |
|-------|---------------|
| **R1** | Aucune donnée mock, hash, ou placeholder « feature pas encore là » (`—` avec tooltip checkout) |
| **R2** | Chaque KPI du dashboard a une **source documentée** en BDD ou events |
| **R3** | Chaque KPI / item de ranking cliquable possède une **série graphique non vide** si des données existent sur la période |
| **R4** | Comparaison période N vs N-1 **mathématiquement correcte** (même fenêtre, même dénominateur) |
| **R5** | Collecte **complète** sur tous les parcours utilisateur qui alimentent une métrique |
| **R6** | Accès **owner + membres équipe** avec permission `analyse` |
| **R7** | Export CSV fidèle aux chiffres affichés |
| **R8** | Build + tests automatisés sur agrégations critiques |

---

## Audit delta — état au 2026-06-10

### ✅ Déjà OK (ne pas refaire)

| Zone | Élément |
|------|---------|
| Infra | Migration analytics, types, `trackEvent`, route track, cookie `ibee_vid` |
| UI | 5 scopes, navigation URL, périodes, ranking paginé, export scope courant |
| Web | `profile_view`, `section_view`, follows, unfollows, ranking sections |
| Service | Bookings SQL, no-show, top services, conversion vues→completed |
| Event | Inscriptions / annulations SQL, top events, taux remplissage |
| News | Vues, partages (event), top publications par vues |
| Shop (partiel) | Vues produit, wishlist, top produits par **vues** |

### ❌ Bloquants 100 %

| Scope | Manque | Impact |
|-------|--------|--------|
| **Shop** | Pas de tables `orders` / `order_lines` / checkout Stripe | Revenu, panier moyen, unités vendues = `—` |
| **Shop** | Pas d'event funnel checkout | « Paniers abandonnés » = proxy wishlist (imparfait) |
| **News** | « Likes » = proxy `publication_comments` | Métrique sémantiquement fausse |
| **News** | Graphique Likes = série vide `bucketTimestamps([])` | R2 + R3 violés |
| **Service** | « Taux remplissage planning » = `completed / service_view` | Formule incorrecte (libellé ≠ calcul) |
| **Service** | Conversion = `completed / views` | Devrait inclure `pending`+`confirmed` créés dans la fenêtre |
| **Event** | Pas d'event `event_registration` à l'inscription | OK via SQL mais pas de funnel vue→inscription |
| **Transverse** | Pas de gate permission `analyse` équipe | Seul owner |
| **Transverse** | Pas de rate limit / debounce ingestion | Risque qualité données |
| **Transverse** | Pas de tests `analyse-format` / buckets | R8 partiel |
| **Transverse** | Pas de script seed QA analytics | Validation manuelle difficile |

---

## Architecture cible

```
┌─────────────────────────────────────────────────────────────────┐
│                     Pages publiques Next.js                      │
│  TrackPageView + interactions (like, share, checkout, register) │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/analytics/track (+ debounce)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              entity_analytics_events (+ reactions/orders)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   follows/bookings   event_registrations   orders/order_lines
         │                   │                   │
         └───────────────────┴───────────────────┘
                             ▼
                  apps/platform/src/lib/analyse-data.ts
                             ▼
                  AnalyseDashboard + export CSV
                             ▲
                  Gate permission analyse (owner | membre)
```

---

## Cartographie métrique finale par scope

### Scope `web` — Profil web

| KPI / ranking | Source finale | Event / table |
|---------------|---------------|---------------|
| Visiteurs | Analytics | `profile_view` DISTINCT `visitor_key` |
| Membres | BDD | `follows` COUNT fenêtre |
| Désabonnés | Analytics | `unfollow` COUNT fenêtre |
| Sections les plus vues | Analytics | `section_view` GROUP `section_type` |
| Graphiques | Analytics | Buckets par event type |

**Tâches delta:** debounce vues, banner « données depuis [date] », tests buckets visiteurs.

---

### Scope `service`

| KPI / ranking | Source finale | Event / table |
|---------------|---------------|---------------|
| Réservations | BDD | `bookings` créés fenêtre (tous statuts actifs) |
| Taux conversion | Analytics + BDD | `bookings créés / service_view` visiteurs distincts |
| No-show | BDD | `bookings.status = no_show` |
| Taux remplissage planning | BDD | créneaux réservés / créneaux disponibles (`availability_schedules` − exceptions) |
| Top services | BDD | GROUP `appointment_type_id` |
| Stats complémentaires | BDD | annulations, RDV effectués (`completed`) |

**Tâches delta:** corriger formules, série graphique conversion, helper `getPlanningFillRate()`.

---

### Scope `shop`

| KPI / ranking | Source finale | Event / table |
|---------------|---------------|---------------|
| Revenu | BDD | `SUM(orders.total_cents)` statut `paid` |
| Panier moyen | BDD | `AVG(orders.total_cents)` |
| Paniers abandonnés | Analytics + BDD | `checkout_started` sans `order` paid dans les 24h (ou wishlist + vue sans achat v2) |
| Top produits | BDD | `order_lines` SUM `quantity` (fallback vues si 0 vente) |
| Unités vendues | BDD | `SUM(order_lines.quantity)` |
| Vues produits (stat) | Analytics | `product_view` |

**Tâches delta:** migration orders complète + Stripe + brancher analyse (Phase 3 — plus gros morceau).

---

### Scope `event`

| KPI / ranking | Source finale | Event / table |
|---------------|---------------|---------------|
| Inscriptions | BDD | `event_registrations` confirmed |
| Annulations | BDD | `status = cancelled` |
| Taux remplissage | BDD | inscriptions / `events.capacity` |
| Top événements | BDD | GROUP `event_id` |
| Taux conversion | Analytics + BDD | inscriptions / `event_view` visiteurs distincts |
| Vitesse de vente | BDD | inscriptions / jours depuis publication (si `published_at` dispo) |

**Tâches delta:** event `event_registration` à l'API register, KPI conversion, corriger vitesse vente hors scope semaine.

---

### Scope `news`

| KPI / ranking | Source finale | Event / table |
|---------------|---------------|---------------|
| Vues | Analytics | `publication_view` |
| Likes | BDD | `publication_reactions` type `like` (ou event dédié) |
| Partages | Analytics | `publication_share` |
| Top publications | Analytics | vues + toggle ranking par likes |
| Graphique Likes | BDD / events | série temporelle réelle |

**Tâches delta:** table reactions + bouton like fonctionnel + corriger `loadNewsScope`.

---

## Fichiers principaux (création / modification)

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260611100000_orders_checkout.sql` | `orders`, `order_lines`, enums statut, RLS |
| `supabase/migrations/20260611110000_publication_reactions.sql` | Likes publications |
| `supabase/migrations/20260611120000_analytics_event_extensions.sql` | Nouveaux event types si besoin |
| `packages/supabase/src/orders.ts` | CRUD commandes, agrégations shop |
| `packages/supabase/src/publication-reactions.ts` | Like / unlike |
| `packages/supabase/src/entity-access.ts` | Résolution owner / membre + permissions |
| `packages/supabase/src/planning-stats.ts` | Taux remplissage créneaux |
| `apps/platform/src/lib/analyse-data.ts` | Corriger tous les scopes |
| `apps/platform/src/lib/analytics-client.ts` | Debounce + batch |
| `apps/platform/src/app/api/checkout/**` | Stripe session + webhook |
| `apps/platform/src/app/api/analytics/track/route.ts` | Rate limit |
| `apps/platform/src/app/dashboard/analyse/page.tsx` | Gate permission |
| `apps/platform/src/app/dashboard/analyse/export/route.ts` | Gate permission |
| `apps/platform/src/components/public/PublicationDetail.tsx` | Like réel |
| `supabase/seeds/analytics_demo_events.sql` | Jeu de test 30 jours |

---

## Phase 0 — Fondations transverses (1 jour)

### Task 0.1: Helper accès entity + permissions

**Files:**
- Create: `packages/supabase/src/entity-access.ts`
- Modify: `packages/supabase/src/index.ts`

- [ ] `resolveEntityAccess(client, userId)` → `{ entity, role: 'owner' | 'member', permissions }`
- [ ] Owner = `entity.user_id === userId`
- [ ] Membre = ligne `entity_team_members` + permissions via `entity_team_roles`
- [ ] `requirePermission(permissions, 'analyse')` utilitaire
- [ ] Tests : owner full access, membre sans analyse rejeté

### Task 0.2: Gate dashboard Analyse

**Files:**
- Modify: `apps/platform/src/app/dashboard/analyse/page.tsx`
- Modify: `apps/platform/src/app/dashboard/analyse/export/route.ts`
- Modify: `apps/platform/src/components/dashboard/ProfileSidebar.tsx` (masquer lien si pas permission)

- [ ] Remplacer `getEntityByUserId` seul par `resolveEntityAccess`
- [ ] Redirect ou 403 si pas `analyse`
- [ ] Sidebar : lien Analyse visible seulement si autorisé

### Task 0.3: Qualité ingestion analytics

**Files:**
- Modify: `apps/platform/src/app/api/analytics/track/route.ts`
- Modify: `apps/platform/src/lib/analytics-client.ts`
- Modify: `packages/shared/src/analytics.ts` (nouveaux event types)

- [ ] Rate limit : 60 req/min/IP (in-memory v1 ou Upstash si dispo)
- [ ] Debounce client : 30 min par `(entity_id, event_type, resource_id)` via `sessionStorage`
- [ ] Rejeter user-agents bots évidents (optionnel, liste courte)
- [ ] Nouveaux types : `checkout_started`, `checkout_completed`, `event_registration`, `publication_like` (si event-based)

### Task 0.4: Tests & seed QA

**Files:**
- Create: `apps/platform/src/lib/analyse-format.test.ts`
- Create: `apps/platform/src/lib/analyse-buckets.test.ts`
- Create: `supabase/seeds/analytics_demo_events.sql`

- [ ] Tests format FR, deltas, buckets semaine/mois/année
- [ ] Seed : 30 jours d'events variés pour entity de test
- [ ] Doc : procédure vérif manuelle dans ce plan (§ Validation)

---

## Phase 1 — Scope Web 100 % (0,5 jour)

### Task 1.1: Finitions web

**Files:**
- Modify: `apps/platform/src/lib/analyse-data.ts` (`loadWebScope`)
- Modify: `AnalyseDashboard.tsx`

- [ ] Banner info si `entity.created_at` < première event : « Données analytics depuis le DD/MM/YYYY »
- [ ] Vérifier toutes les sections `menu_section_type` instrumentées (y compris `videos`, `links`)
- [ ] Graphique désabonnés : série même quand 0 (barres à 0, pas undefined)
- [ ] Export CSV : inclure ligne « données depuis »

**Critères acceptation Web:**
- [ ] 3 KPI + ranking sections avec deltas réels
- [ ] Clic chaque KPI/ranking → graphique cohérent
- [ ] 0 mock / 0 série manquante

---

## Phase 2 — Scope Service 100 % (1 jour)

### Task 2.1: Helper taux remplissage planning

**Files:**
- Create: `packages/supabase/src/planning-stats.ts`
- Test: `packages/supabase/src/__tests__/planning-stats.test.ts`

- [ ] `getPlanningFillRate(client, entityId, window)` :
  - créneaux théoriques depuis `availability_schedules` − `availability_exceptions`
  - créneaux bookés (`bookings` pending/confirmed) sur même fenêtre
  - retour `{ bookedSlots, availableSlots, ratePct }`
- [ ] Gérer entity sans planning → afficher `0 %` avec hint « Planning non configuré »

### Task 2.2: Corriger métriques service

**Files:**
- Modify: `apps/platform/src/lib/analyse-data.ts` (`loadServiceScope`)

- [ ] Réservations = COUNT bookings **créés** dans fenêtre (pas seulement completed)
- [ ] Conversion = `bookings créés / distinct service_view`
- [ ] Stats « Taux remplissage planning » = vrai ratio planning
- [ ] Série `kpi:conversion` : bucket bookings créés / bucket vues (ou ratio par bucket)
- [ ] Annulations = bookings `cancelled` dans fenêtre

**Critères acceptation Service:**
- [ ] Formules documentées en commentaire code
- [ ] 3 KPI + 3 stats + top services + graphiques complets
- [ ] Cohérence avec données seed bookings + events

---

## Phase 3 — Scope Shop 100 % (3–4 jours) — CRITIQUE

### Task 3.1: Migration orders

**Files:**
- Create: `supabase/migrations/20260611100000_orders_checkout.sql`

- [ ] Enum `order_status` : `pending`, `paid`, `failed`, `refunded`, `cancelled`
- [ ] Table `orders` :
  - `id`, `entity_id`, `buyer_user_id`, `status`, `total_cents`, `currency`, `stripe_session_id`, `stripe_payment_intent_id`, `created_at`, `paid_at`
- [ ] Table `order_lines` :
  - `id`, `order_id`, `product_id`, `variant_id`, `quantity`, `unit_price_cents`, `title_snapshot`
- [ ] FK `product_reviews.order_id` → `orders.id` (ALTER existant)
- [ ] Index `(entity_id, status, paid_at DESC)`, `(entity_id, product_id)`
- [ ] RLS : buyer SELECT ses commandes ; owner SELECT commandes de son entity ; INSERT via service checkout

### Task 3.2: Package orders

**Files:**
- Create: `packages/supabase/src/orders.ts`
- Modify: `packages/supabase/src/index.ts`

- [ ] `createOrderFromCheckout`, `markOrderPaid`, `listOrdersByEntity`
- [ ] `getShopMetrics(entityId, window)` → revenue, avgBasket, unitsSold, topProducts
- [ ] Tests agrégations avec fixtures

### Task 3.3: Checkout Stripe

**Files:**
- Create: `apps/platform/src/app/api/checkout/create-session/route.ts`
- Create: `apps/platform/src/app/api/checkout/webhook/route.ts`
- Modify: pages produit / panier (bouton acheter)

- [ ] Stripe Checkout Session (mode payment)
- [ ] Webhook `checkout.session.completed` → `orders` paid + `order_lines`
- [ ] Events : `checkout_started` (ouverture session), `checkout_completed` (webhook)
- [ ] Variable env : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Task 3.4: Paniers abandonnés

**Files:**
- Modify: `analyse-data.ts`, `analytics.ts`

- [ ] Définition produit : sessions `checkout_started` sans `order paid` dans les 24h
- [ ] KPI « Paniers abandonnés » = COUNT distinct visitor/user selon cette règle
- [ ] Ne plus utiliser wishlist comme proxy principal (wishlist → stat secondaire optionnelle)

### Task 3.5: Brancher scope Shop analyse

**Files:**
- Modify: `apps/platform/src/lib/analyse-data.ts` (`loadShopScope`)

- [ ] Revenu, panier, unités : depuis `getShopMetrics` (plus de `formatUnavailableMetric()`)
- [ ] Top produits : `order_lines` SUM quantity (tie-break revenue)
- [ ] Graphiques revenue / basket / abandoned : séries réelles
- [ ] Delta période sur toutes les métriques

**Critères acceptation Shop:**
- [ ] Parcours test : vue produit → checkout → webhook → KPI shop mis à jour
- [ ] Aucun `—` lié à « checkout pas encore là »
- [ ] Export CSV shop = chiffres Stripe / BDD

---

## Phase 4 — Scope Event 100 % (1 jour)

### Task 4.1: Instrumentation inscription

**Files:**
- Modify: `apps/platform/src/app/api/events/register/route.ts`

- [ ] Après `createEventRegistration` : `trackEvent({ event_type: 'event_registration', resource_id: event_id })`

### Task 4.2: Métriques event complètes

**Files:**
- Modify: `apps/platform/src/lib/analyse-data.ts` (`loadEventScope`)

- [ ] KPI « Taux conversion » = inscriptions / distinct `event_view`
- [ ] Vitesse vente : inscriptions / jours depuis `events.published_at` (ou `created_at`)
- [ ] Série conversion + fill rate par bucket temporel
- [ ] Graphique annulations : série `cancelled` registrations

**Critères acceptation Event:**
- [ ] Inscription API alimente analytics + table registrations (double source cohérente)
- [ ] Tous KPI cliquables ont série
- [ ] Taux remplissage correct avec capacity NULL = N/A explicite « Illimité »

---

## Phase 5 — Scope News 100 % (1–1,5 jour)

### Task 5.1: Migration publication_reactions

**Files:**
- Create: `supabase/migrations/20260611110000_publication_reactions.sql`

- [ ] Table `publication_reactions` :
  - `id`, `publication_id`, `user_id`, `reaction_type` enum (`like`), `created_at`
  - UNIQUE `(publication_id, user_id, reaction_type)`
- [ ] RLS : INSERT/DELETE auteur ; SELECT public sur publications publiées
- [ ] Alternative retenue : **table** (pas seulement event) pour requêtes agrégées rapides + event `publication_like` en miroir pour funnel

### Task 5.2: API like + UI

**Files:**
- Create: `apps/platform/src/app/api/publications/like/route.ts`
- Modify: `apps/platform/src/components/public/PublicationDetail.tsx`

- [ ] Toggle like (auth requis ou anon refusé avec CTA login)
- [ ] Compteur likes réel affiché
- [ ] `trackEvent publication_like` à chaque like (pas unlike)

### Task 5.3: Métriques news complètes

**Files:**
- Create: `packages/supabase/src/publication-reactions.ts`
- Modify: `apps/platform/src/lib/analyse-data.ts` (`loadNewsScope`)

- [ ] Likes = COUNT reactions fenêtre (plus de proxy comments)
- [ ] Série `kpi:likes` : bucket `publication_reactions.created_at`
- [ ] Ranking secondaire optionnel : top par likes (onglet ou tri)
- [ ] Retirer dépendance `countPublicationCommentsInWindow` pour KPI likes

**Critères acceptation News:**
- [ ] Bouton like fonctionnel + compteur
- [ ] 3 KPI avec deltas + graphiques dont Likes non vide
- [ ] Partages = events `publication_share` (déjà OK)

---

## Phase 6 — Équipe & permissions Analyse (0,5 jour)

> Dépend de l'acceptation d'invitation (plan équipe v2) pour qu'un membre **réel** teste l'accès.

### Task 6.1: Acceptation invitation (prérequis)

**Files:**
- Create: `apps/platform/src/app/invite/[token]/page.tsx` (ou flow email magic link)
- Modify: `packages/supabase/src/team.ts`

- [ ] Accept invite → insert `entity_team_members`
- [ ] Marquer invitation `accepted`

### Task 6.2: Membre avec permission analyse

- [ ] Test E2E : membre rôle « Gérant » accède `/dashboard/analyse`
- [ ] Test E2E : membre sans `analyse` → redirect
- [ ] Export CSV respecte même gate

---

## Phase 7 — Finitions produit (0,5 jour)

### Task 7.1: Export avancé

**Files:**
- Modify: `export/route.ts`, `AnalyseDashboard.tsx`

- [ ] Menu export : scope courant (déjà) + **option « Tous les scopes »** (ZIP ou CSV multi-feuilles)
- [ ] UTF-8 BOM conservé pour Excel FR

### Task 7.2: UX états vides honnêtes

- [ ] Distinction UI : « 0 » (pas d'activité) vs « N/A » (capacity illimitée, planning absent)
- [ ] Tooltips sur KPI complexes (conversion, abandons)

### Task 7.3: Documentation dette résolue

- [ ] Mettre à jour `2026-06-09-analyse-fonctionnel.md` → statut **supersédé par v2**
- [ ] Checklist finale § Validation cochée

---

## Phase 8 — Performance (optionnel, si volume)

### Task 8.1: Rollups journaliers

**Files:**
- Create: `supabase/migrations/20260611130000_analytics_daily_rollups.sql`

- [ ] Table `entity_analytics_daily` (entity_id, day, event_type, count, unique_visitors)
- [ ] Job nightly Vercel Cron ou pg_cron
- [ ] `listAnalyticsEvents` lit rollups si période > 90 jours

### Task 8.2: Rétention

- [ ] Politique purge events > 13 mois (SQL job)

---

## Ordre d'exécution recommandé

```
Phase 0  (transverse)     → permissions + ingestion qualité + tests
Phase 5  (news)          → rapide, débloque KPI likes (indépendant)
Phase 2  (service)       → corrections formules
Phase 4  (event)         → instrumentation + conversion
Phase 1  (web)           → finitions
Phase 3  (shop)          → le plus long ; peut être parallélisé après Phase 0
Phase 6  (équipe)        → après acceptation invite
Phase 7  (finitions)
Phase 8  (perf)          → seulement si besoin mesuré
```

**Estimation totale :** 8–10 jours dev focused (dont 3–4 j pour Stripe/orders).

---

## Validation finale (checklist Killian)

### Par scope

- [ ] **Web** : naviguer profil + onglets → KPI visiteurs/sections bougent
- [ ] **Service** : créer RDV + vues service → conversion et planning cohérents
- [ ] **Shop** : achat test Stripe → revenu / panier / unités / top produits
- [ ] **Event** : inscription → KPI + conversion vue→inscription
- [ ] **News** : like + partage + vue → 3 KPI et graphiques
- [ ] **Permissions** : membre avec/sans analyse

### Technique

- [ ] `pnpm --filter @ibee/platform build`
- [ ] `pnpm --filter @ibee/supabase test`
- [ ] `pnpm test` (nouveaux tests format/buckets)
- [ ] Export CSV Excel FR tous scopes
- [ ] Aucun `formatUnavailableMetric()` restant dans `analyse-data.ts`
- [ ] Aucun `bucketTimestamps([])` intentionnel pour KPI affiché

### SQL Editor (Killian)

Exécuter dans l'ordre :
1. `20260611110000_publication_reactions.sql`
2. `20260611100000_orders_checkout.sql`
3. `20260611120000_analytics_event_extensions.sql` (si enum étendu)
4. `20260611130000_analytics_daily_rollups.sql` (optionnel)
5. `pnpm gen-types`

---

## Critères d'acceptation globaux « 100 % »

1. Les **5 scopes** n'ont **aucune métrique « feature manquante »**
2. Chaque KPI affiché est **vérifiable** via SQL ou seed
3. Chaque KPI/ranking sélectionnable produit un **graphique réel**
4. **Owner et membres autorisés** accèdent au dashboard
5. **Shop** reflète les vraies commandes Stripe
6. **News likes** = vraies réactions, pas commentaires
7. **Service planning** = vrai taux remplissage créneaux
8. Ingestion **rate-limited** et **debounced**
9. Tests automatisés + seed QA + build vert

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Stripe complexifie le planning | Environnement test Stripe d'abord ; commandes `paid` seedables sans Stripe pour tests analyse |
| Enum `analytics_event_type` ALTER lent en prod | Migration ADD VALUE transaction-safe ; ou JSON metadata en attendant |
| Permissions sans invite accept | Tester gate owner d'abord ; membre en Phase 6 |
| Volume events | Phase 8 rollups |
| Données historiques vides | Banner « depuis activation » — pas de backfill fictif |

---

## Références

- Plan v1 : `docs/plans/2026-06-09-analyse-fonctionnel.md`
- Loader actuel : `apps/platform/src/lib/analyse-data.ts`
- UI : `apps/platform/src/components/dashboard/analyse/AnalyseDashboard.tsx`
- Équipe : `packages/supabase/src/team.ts`, `apps/platform/src/app/dashboard/equipe/`
- Produits v1 (FK orders commentées) : `supabase/migrations/20260603120000_products_v1.sql`
