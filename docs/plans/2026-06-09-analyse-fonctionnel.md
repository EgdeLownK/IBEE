# Analyse 100 % fonctionnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer toutes les données mock de `/dashboard/analyse` par des métriques réelles, collectées et agrégées depuis Supabase, avec comparaison de périodes, graphique dynamique, classements, export CSV — parité fonctionnelle avec le prototype IBEE Profile.

**Architecture:** Introduire une table d’événements analytics first-party (`entity_analytics_events`) + rollups journaliers optionnels pour les perf. Brancher la collecte côté pages publiques Next.js (RSC middleware léger ou Route Handler `POST /api/analytics/track`). Centraliser les agrégations dans `packages/supabase/src/analytics.ts` et un loader serveur `apps/platform/src/lib/analyse-data.ts`. Le client `AnalyseDashboard` ne garde que l’état UI (scope, période, série sélectionnée) et consomme des props typées.

**Tech Stack:** Next.js 16 App Router, Supabase (migrations SQL + RLS), `@ibee/supabase` helpers, tests Vitest sur agrégations pures.

**Prérequis produit:** Le scope **Shop (revenu / panier / ventes)** dépend de la table `orders` (checkout Stripe — pas encore en base). Ce plan prévoit des métriques shop **réelles mais partielles** (vues produit, wishlist) jusqu’à l’arrivée des commandes, puis branchement revenu sans refonte UI.

---

## État des lieux (audit 2026-06-09)

### Déjà en place ✅

| Élément | Fichier | Note |
|---------|---------|------|
| UI complète (5 scopes, KPIs, graphique, ranking) | `apps/platform/src/components/dashboard/analyse/AnalyseDashboard.tsx` | Données 100 % mock (`SCOPE_CONFIG`) |
| Navigation temporelle réelle | `apps/platform/src/lib/analyse-period.ts` | Fenêtre semaine/mois/année + `minOffset` depuis `entity.created_at` |
| Graphique déterministe mock | `buildChartBars()` | Hash fake — **à supprimer** |
| Page RSC | `apps/platform/src/app/dashboard/analyse/page.tsx` | Passe seulement `accountCreatedAt` |
| Styles | `packages/ui-react/src/dashboard/analyse-styles.css` | OK |

### Données réelles disponibles en base (sans tracking) ✅

| Scope | Source | Tables / colonnes |
|-------|--------|-------------------|
| Web — Membres | Follows | `follows.created_at`, `entity.followers_count` |
| Service | Réservations | `bookings` (status, `start_at`, `appointment_type_id`) |
| Event | Inscriptions | `event_registrations` (status, `created_at`, `event_id`) |
| News | Contenu seulement | `publications` — **pas de vues/likes/partages** |
| Shop | Catalogue seulement | `products` — **pas de `orders`** (cf. migrations produits v1) |

### Manques bloquants pour « 100 % » ❌

1. **Aucune table de vues** (profil, sections, publications, produits)
2. **Pas d’historique unfollow** (KPI « Désabonnés » impossible sans event log)
3. **Pas de commandes** → revenu shop, panier moyen, top produits vendus
4. **Bouton Exporter** et **Afficher plus** non branchés
5. **Taux de conversion** (service/shop) = besoin d’un dénominateur (vues page)

---

## Décisions verrouillées

| Sujet | Décision | Raison |
|-------|----------|--------|
| Source analytics | **First-party Supabase** (pas Plausible en v1) | Cohérence brain, pas de dépendance externe, RLS maîtrisée |
| Collecte | **Route Handler** `POST /api/analytics/track` + appel client discret | Pas de service_role côté client ; insert via policy contrôlée |
| Identité visiteur | **Hash session** (`visitor_key` cookie HttpOnly ou fingerprint léger) | Déduplication visiteurs sans PII |
| Agrégation | **Helpers TS + SQL** (pas de cron v1) | Volume faible au début ; rollup daily en phase 2 si besoin |
| Shop revenu | **Placeholder honnête** jusqu’à `orders` | Afficher « — » + tooltip « Disponible après checkout » plutôt que mock |
| Permissions équipe | Respecter `analyse` permission (futur) | Loader vérifie accès entity owner/membre |

---

## Cartographie métriques → sources

### Scope `web` (Profil web)

| KPI / ranking | Source v1 | Event / requête |
|---------------|-----------|-----------------|
| Visiteurs | `entity_analytics_events` | `profile_view` distinct `visitor_key` |
| Membres | `follows` | `COUNT(*)` where `created_at` in window |
| Désabonnés | `entity_analytics_events` | `unfollow` count in window |
| Graphique | events bucketed | `profile_view` par jour/semaine/mois |
| Sections les plus vues | events + dimension | `section_view` group by `section_type` |

### Scope `service`

| KPI | Source v1 |
|-----|-----------|
| Réservations | `bookings` created/completed in window |
| No-show | `bookings.status = 'no_show'` |
| Taux conversion | `bookings completed / service_view events` |
| Top services | `GROUP BY appointment_type_id` |
| Stats planning | `availability_schedules` vs créneaux bookés |

### Scope `shop` (partiel jusqu’à orders)

| KPI | Source v1 | Après checkout |
|-----|-----------|----------------|
| Revenu | **N/A** | `SUM(orders.total_cents)` |
| Panier moyen | **N/A** | `AVG(orders.total_cents)` |
| Paniers abandonnés | proxy: `booking_started` shop? ou wishlist sans achat | funnel checkout |
| Top produits | `product_view` events (v1) → `order_lines` (v2) | commandes |
| Unités vendues | **N/A** | `SUM(quantity)` |

### Scope `event`

| KPI | Source v1 |
|-----|-----------|
| Inscriptions | `event_registrations` confirmed in window |
| Annulations | `status = 'cancelled'` |
| Taux remplissage | `registrations / events.capacity` |
| Top événements | `GROUP BY event_id` |

### Scope `news`

| KPI | Source v1 |
|-----|-----------|
| Vues | `publication_view` events |
| Likes | proxy v1: `publication_comments` count (ou event `publication_like` si ajouté) |
| Partages | event `publication_share` (bouton partage à instrumenter) |
| Top publications | `GROUP BY publication_id` on views |

---

## Fichiers à créer / modifier

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/YYYYMMDD_entity_analytics.sql` | Table events + enum + RLS + indexes |
| `supabase/migrations/YYYYMMDD_analytics_rollups.sql` | (Optionnel phase 2) table `entity_analytics_daily` |
| `packages/supabase/src/analytics.ts` | `trackEvent`, agrégations par scope/période |
| `packages/supabase/src/analytics.test.ts` | Tests agrégations / deltas |
| `packages/shared/src/analytics.ts` | Types events + validation payload track |
| `apps/platform/src/lib/analyse-data.ts` | `loadAnalyseDashboardData(entityId, …)` |
| `apps/platform/src/lib/analyse-format.ts` | Format FR (`+12 %`, `€3 240`, deltas) |
| `apps/platform/src/app/api/analytics/track/route.ts` | Ingestion events |
| `apps/platform/src/components/analytics/TrackPageView.tsx` | Client léger pour pages publiques |
| `apps/platform/src/components/dashboard/analyse/AnalyseDashboard.tsx` | Consommer props réelles, retirer mock |
| `apps/platform/src/app/dashboard/analyse/page.tsx` | Loader serveur |
| `apps/platform/src/app/dashboard/analyse/export/route.ts` | Export CSV |
| Pages publiques `[slug]/*` | Appeler track (profil, section, publication, produit, service, event) |

---

## Phase 1 — Infrastructure analytics (BDD + ingestion)

### Task 1: Migration `entity_analytics_events`

**Files:**
- Create: `supabase/migrations/20260610120000_entity_analytics.sql`

- [ ] Créer enum `analytics_event_type` : `profile_view`, `section_view`, `publication_view`, `product_view`, `service_view`, `event_view`, `booking_created`, `follow`, `unfollow`, `wishlist_add`, `publication_share`
- [ ] Créer table `entity_analytics_events` (`entity_id`, `event_type`, `occurred_at`, `visitor_key`, `section_type`, `resource_id`, `metadata jsonb`)
- [ ] Index `(entity_id, event_type, occurred_at DESC)` + `(entity_id, resource_id, occurred_at)`
- [ ] RLS : `INSERT` anon + authenticated (avec CHECK entity existe) ; `SELECT` owner entity only
- [ ] Pas de `UPDATE`/`DELETE` public
- [ ] Régénérer types : `pnpm --filter @ibee/supabase gen-types`

### Task 2: Types partagés + validation

**Files:**
- Create: `packages/shared/src/analytics.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] Exporter `AnalyticsEventType`, `TrackEventPayload`, validateur Zod-like manuel (pattern existant `@ibee/shared`)
- [ ] Limiter taille `metadata`, whitelist `event_type`

### Task 3: Helper Supabase `trackEvent`

**Files:**
- Create: `packages/supabase/src/analytics.ts`
- Modify: `packages/supabase/src/index.ts`

- [ ] `trackEvent(client, payload)` — insert single event
- [ ] `trackEventBatch` — pour flush client (max 10)
- [ ] Tests unitaires mock client

### Task 4: Route Handler ingestion

**Files:**
- Create: `apps/platform/src/app/api/analytics/track/route.ts`

- [ ] `POST` JSON → validate → `trackEvent` via server client
- [ ] Rate limit basique (IP + entity_id, header ou in-memory v1)
- [ ] Réponse 204
- [ ] Ne jamais exposer `service_role`

### Task 5: Collecte côté pages publiques

**Files:**
- Create: `apps/platform/src/components/analytics/TrackPageView.tsx`
- Create: `apps/platform/src/lib/analytics-client.ts`
- Modify: pages `[slug]/page.tsx`, `[slug]/news/[publicationSlug]`, shop/service/event detail

- [ ] Cookie `ibee_vid` (visitor_key UUID) HttpOnly posé par middleware ou route
- [ ] `TrackPageView` : `useEffect` → `fetch('/api/analytics/track', …)` once per mount
- [ ] Instrumenter : profil home, onglets actifs (section_view), fiches publication/produit/service/event
- [ ] Instrumenter follow/unfollow : `apps/platform/src/app/api/follow/route.ts` + unfollow → events `follow`/`unfollow`

---

## Phase 2 — Couche agrégation

### Task 6: Fenêtres de comparaison

**Files:**
- Create: `packages/supabase/src/analytics-period.ts` (ou étendre `analyse-period.ts` côté app)
- Test: `packages/supabase/src/analytics-period.test.ts`

- [ ] `getComparisonWindows(period, offset)` → `{ current, previous }` (ex. semaine N vs N-1)
- [ ] Réutiliser logique existante `getPeriodWindow` / `getMinPeriodOffset`

### Task 7: Agrégations par scope

**Files:**
- Modify: `packages/supabase/src/analytics.ts`

- [ ] `getWebScopeMetrics(entityId, window)` → visitors, members, unsubscribed, section ranking, series
- [ ] `getServiceScopeMetrics` → bookings SQL + join `appointment_types`
- [ ] `getEventScopeMetrics` → registrations SQL + join `events`
- [ ] `getNewsScopeMetrics` → publication views from events
- [ ] `getShopScopeMetrics` → product views + wishlist ; revenu `null` si pas d'orders
- [ ] `computeDelta(current, previous)` → `{ value, deltaPct, up }`
- [ ] `bucketSeries(events, period, window)` → `AnalyseBarPoint[]` (**remplace `buildChartBars` mock**)

### Task 8: Loader serveur dashboard

**Files:**
- Create: `apps/platform/src/lib/analyse-data.ts`
- Create: `apps/platform/src/lib/analyse-format.ts`

- [ ] `loadAnalyseDashboardData(supabase, entityId, accountCreatedAt)` → structure `AnalyseDashboardData` (5 scopes)
- [ ] Formatter nombres FR (`formatMetricValue`, `formatDelta`)
- [ ] Gérer états vides (zéro event) sans retomber sur mock

---

## Phase 3 — Branchement UI

### Task 9: Refactor `AnalyseDashboard`

**Files:**
- Modify: `apps/platform/src/components/dashboard/analyse/AnalyseDashboard.tsx`
- Modify: `apps/platform/src/app/dashboard/analyse/page.tsx`

- [ ] Supprimer `SCOPE_CONFIG` mock et import hash `buildChartBars` fake
- [ ] Props : `data: AnalyseDashboardData`, `accountCreatedAt`
- [ ] Scope/period/offset : fetch via **router shallow** ou `useState` + `useTransition` + server action `refreshAnalyseData(scope, period, offset)` (éviter prop drilling massif)
- [ ] Alternative recommandée : URL search params `?scope=web&period=week&offset=0` + RSC re-fetch page
- [ ] KPI sélectionné + ranking → met à jour graphique depuis **vraies séries** dans data
- [ ] États loading / error (skeleton minimal)

### Task 10: Bouton « Afficher plus »

**Files:**
- Modify: `AnalyseDashboard.tsx`, `analyse-data.ts`

- [ ] Pagination ranking : param `rankingLimit` default 4, +10 au clic
- [ ] Loader accepte `rankingLimit` par scope

### Task 11: Export CSV

**Files:**
- Create: `apps/platform/src/app/dashboard/analyse/export/route.ts`
- Modify: `AnalyseDashboard.tsx`

- [ ] `GET /dashboard/analyse/export?scope=web&period=week&offset=0&format=csv`
- [ ] Auth + ownership entity
- [ ] CSV : KPIs + série graphique + ranking (UTF-8 BOM pour Excel FR)
- [ ] Brancher bouton Exporter (menu dropdown scope actuel / tous scopes — v1 : scope actuel)

---

## Phase 4 — Compléter les scopes bloqués

### Task 12: Shop — honest empty state

**Files:**
- Modify: `analyse-data.ts`, `AnalyseDashboard.tsx`

- [ ] KPI revenu / panier / unités : afficher `—` avec `title="Disponible après activation du checkout"`
- [ ] Top produits v1 : classer par `product_view` events
- [ ] Documenter dette dans `.ibee-brain/_BRAIN-STATE.md` : « Analyse shop revenue → orders table »

### Task 13: Orders — branchement post-checkout (tâche séparée, déclenchée quand `orders` existe)

**Files:**
- Migration orders (hors scope immédiat)
- Modify: `getShopScopeMetrics`

- [ ] Remplacer placeholders par agrégations commandes
- [ ] Top produits par `order_lines`

### Task 14: News — likes & partages

**Files:**
- Modify: pages publication (bouton partage), `analytics.ts`

- [ ] v1 likes : `COUNT(publication_comments)` par publication dans window
- [ ] Event `publication_share` sur action partage native
- [ ] Iteration v2 : table `publication_reactions` si besoin granularité

---

## Phase 5 — Qualité & permissions

### Task 15: Tests

**Files:**
- Create: `packages/supabase/src/analytics.test.ts`
- Create: `apps/platform/src/lib/analyse-format.test.ts`

- [ ] Tests `computeDelta` (0 previous, division par zéro → « — »)
- [ ] Tests `bucketSeries` semaine/mois/année
- [ ] Tests format FR

### Task 16: Permission équipe `analyse`

**Files:**
- Modify: `apps/platform/src/app/dashboard/analyse/page.tsx`
- Future: middleware permissions

- [ ] Quand RBAC équipe sera persisté : gate `permissions.analyse`
- [ ] v1 : owner entity only (comportement actuel)

### Task 16b: Vérification manuelle

- [ ] Profil test : générer events sur 7 jours (script seed ou navigation manuelle)
- [ ] Vérifier chaque scope : KPI ≠ mock, graphique cohérent avec table events
- [ ] Naviguer avant `entity.created_at` → bloqué (déjà OK)
- [ ] Export CSV ouvre correctement dans Excel FR
- [ ] `pnpm --filter @ibee/platform build` + tests passent

---

## Phase 6 — Optimisation (si volume)

### Task 17: Rollups journaliers (optionnel)

**Files:**
- Create: `supabase/migrations/20260610130000_analytics_daily_rollups.sql`
- Create: fonction SQL `refresh_entity_analytics_daily(entity_id, day)`

- [ ] Cron pg_cron ou job Vercel nightly
- [ ] Les helpers lisent rollups si dispo, sinon raw events

---

## Ordre d'exécution recommandé

```
Phase 1 (Tasks 1–5)   → sans ça, scope web/news/shop conversion impossible
Phase 2 (Tasks 6–8)   → data layer
Phase 3 (Tasks 9–11)  → UI branchée + export
Phase 4 (Tasks 12–14) → honnêteté shop + news complètes
Phase 5 (Tasks 15–16b) → qualité
Phase 6 (Task 17)     → seulement si perf insuffisante
```

**Estimation:** ~3–4 jours dev focused (hors migration `orders`).

---

## Critères d'acceptation « 100 % fonctionnel »

1. **Aucune donnée hash/mock** dans `AnalyseDashboard` ni `buildChartBars`
2. **5 scopes** affichent des KPI calculés depuis Supabase (shop revenu excepté → état vide explicite)
3. **Comparaison période** (vs semaine/mois/an dernier) reflète réellement current vs previous window
4. **Graphique** réagit au KPI/ranking sélectionné avec série temporelle réelle
5. **Navigation temporelle** respecte `entity.created_at` (déjà OK)
6. **Classement** paginable (« Afficher plus »)
7. **Export CSV** fonctionnel pour le scope courant
8. **Collecte** active sur les pages publiques principales (profil + fiches + follow/unfollow)
9. Build + tests verts

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Volume events élevé | Rollups daily (phase 6) ; retention 13 mois |
| Bots gonflent visiteurs | Rate limit + filtre user-agent basique |
| Shop incomplet sans orders | UX transparente, pas de faux chiffres |
| Désabonnés avant migration | Données partielles ; mention « depuis activation analytics » |
| Double comptage vues | `visitor_key` + debounce client 30 min par page |

---

## Références code existant

- UI mock actuelle : `apps/platform/src/components/dashboard/analyse/AnalyseDashboard.tsx`
- Périodes : `apps/platform/src/lib/analyse-period.ts`
- Prototype : `.tmp-bundle-6cde7dbc.jsx` → `AnalyticsScreen`
- Bookings : `packages/supabase/src/bookings.ts`
- Events : `packages/supabase/src/events.ts`
- Follows : `supabase/migrations/20260412180000_follows_system.sql`
