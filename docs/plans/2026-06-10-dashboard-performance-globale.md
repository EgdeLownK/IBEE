# Dashboard — Performance & fluidité globale

> **Goal:** Navigation fluide sur **tout** `/dashboard/*` (Analyse, Site, Équipe, Drive, futures pages), pas seulement débloquer Analyse.

**Problème racine:** Chaque navigation déclenche un **cycle serveur complet** — middleware auth + layout dynamique (5–7 requêtes Supabase) + page (souvent 10–20 requêtes) + latence réseau vers Supabase prod depuis localhost.

---

## Principe directeur

| Couche | Rôle | Doit recharger à chaque clic ? |
|--------|------|--------------------------------|
| **Shell** (header, rail, sidebar, compte) | Stable, quasi statique | **Non** — charger une fois, rafraîchir à la demande |
| **Contenu page** | Données métier | **Oui** — mais ciblé + streamé (Suspense) |
| **Filtres in-page** (scope, période) | État UI | **Non** — server action / fetch, pas `router.push` |

---

## Diagnostic par zone

### Layout dashboard (`dashboard/layout.tsx`)

À **chaque** navigation :

1. `getUser()` (Supabase)
2. `loadAccountShellData()` → `getUser()` + `getEntityByUserId()`
3. `getUnreadCount()`
4. `getNotifications(limit: 5)`

→ **4–6 aller-retours réseau** avant même le contenu de la page.

### Middleware

- `getUser()` sur **toutes** les routes (y compris assets filtrés partiellement)

### Pages lourdes

| Page | Requêtes typiques |
|------|-------------------|
| **Analyse** | 8–15 (events bruts × périodes) + refetch layout |
| **Site / studio** | 15+ (widgets, produits, events, reviews…) |
| **Équipe** | 3–5 + seed roles |
| **Drive** | shell + entity + files (double shell) |

### Patterns anti-perf

- `router.push` pour filtres **in-page** (Analyse)
- `revalidatePath('/dashboard', 'layout')` sur lecture notification → **invalide tout le shell**
- Agrégations analytics en JS après fetch de **toutes** les lignes
- `loadAccountShellData` rappelé dans `drive-data.ts` en plus du layout

---

## Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│  Middleware — session refresh uniquement (léger)             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Layout MINIMAL (1 requête contexte via React.cache)         │
│  → user + entity + accountShell (sans notifications)         │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│  AppShell (client)     │  │  {children} dans <Suspense>       │
│  Notifications SWR   │  │  loading.tsx par route             │
│  (fetch au mount)     │  │  données page streamées           │
└──────────────────────┘  └──────────────────────────────────┘
```

---

## Phase A — Fondations globales (priorité 1, ~1 jour)

### A.1 Contexte dashboard unifié

**Files:**
- Create: `apps/platform/src/lib/dashboard-context.ts`

- [ ] `getDashboardContext()` avec `React.cache()` :
  - un seul `getUser()`
  - un seul `getEntityByUserId()`
  - retour `{ supabase, user, entity }`
- [ ] `getAccountShellData()` réutilise le contexte (plus de double auth)
- [ ] Remplacer les appels redondants dans layout + pages + server actions

**Impact:** Toutes les pages dashboard.

### A.2 Layout allégé

**Files:**
- Modify: `apps/platform/src/app/dashboard/layout.tsx`
- Create: `apps/platform/src/app/api/dashboard/notifications/route.ts`

- [ ] Retirer `getUnreadCount` + `getNotifications` du layout serveur
- [ ] `GlobalHeader` charge notifications **côté client** au mount (fetch léger)
- [ ] Badge mis à jour sans recharger le layout

**Impact:** **−2 requêtes** sur chaque navigation dashboard.

### A.3 Notifications sans invalidation layout

**Files:**
- Modify: `apps/platform/src/app/dashboard/notification-actions.ts`
- Modify: `apps/platform/src/components/dashboard/GlobalHeader.tsx`

- [ ] Supprimer `revalidatePath('/dashboard', 'layout')` sur mark read
- [ ] Mise à jour optimiste du state client header

**Impact:** Clic notification ne force plus un reload shell complet.

### A.4 loading.tsx par route

**Files:**
- Create: `apps/platform/src/app/dashboard/analyse/loading.tsx`
- Create: `apps/platform/src/app/dashboard/site/loading.tsx`
- Create: `apps/platform/src/app/dashboard/equipe/loading.tsx`
- Create: `apps/platform/src/app/dashboard/drive/loading.tsx`

- [ ] Skeleton cohérent (header/sidebar restent visibles, contenu pulse)

**Impact:** Perception immédiate de réactivité sur **toutes** les pages.

---

## Phase B — Patterns de navigation (priorité 2, ~1 jour)

### B.1 Analyse : filtres sans navigation URL

**Files:**
- Create: `apps/platform/src/app/dashboard/analyse/analyse-actions.ts`
- Modify: `AnalyseDashboard.tsx`

- [ ] `fetchAnalyseScopeAction(scope, period, offset, rankingLimit)` 
- [ ] État client pour filtres ; URL optionnelle (`replaceState`) pour partage lien seulement
- [ ] Plus de `router.push` sur changement scope/période

**Impact:** Analyse instantanée entre onglets.

### B.2 Prefetch dashboard

**Files:**
- Modify: `FloatingNavPill.tsx`, sidebars (`Link prefetch`)

- [ ] `prefetch={true}` sur liens rail principal
- [ ] Option : prefetch données légères au hover (équipe, analyse web scope)

**Impact:** Première ouverture d'une zone plus rapide.

### B.3 Éviter double chargement shell

**Files:**
- Modify: `apps/platform/src/lib/drive-data.ts`

- [ ] Ne plus appeler `loadAccountShellData` si données déjà dans layout/context

---

## Phase C — Données & agrégations (priorité 3, ~1–2 jours)

### C.1 Analytics SQL

**Files:**
- Modify: `packages/supabase/src/analytics.ts`
- Modify: `analyse-data.ts`

- [ ] `countEventsInWindow`, `countDistinctVisitorsInWindow`, `bucketEventsDaily` en SQL/RPC
- [ ] Ne plus transférer des milliers de lignes events en dev

**Impact:** Analyse + export ; prépare rollups 100 %.

### C.2 Site studio — chargement progressif

**Files:**
- Modify: `profile-studio-data.ts`, `ProfileStudio.tsx`

- [ ] Split : données hero/menu d'abord, playlists produits/services en deferred
- [ ] Suspense boundaries par onglet studio

**Impact:** `/dashboard/site` perçu comme le plus lourd aujourd'hui.

---

## Phase D — Polish & mesure (priorité 4) ✅

- [x] Logger durée `getDashboardContext` + pages en dev (`NEXT_DEBUG=1`)
- [x] Comparer `next dev` vs `next start` (baseline) — procédure ci-dessous
- [x] `React.cache()` contexte unifié (pas de `unstable_cache` — incompatible cookies Supabase)
- [x] Budgets documentés dans `dashboard-perf.ts`

### Activation des logs

**Option recommandée** — dans `apps/platform/.env.local` (lu automatiquement par Next.js) :

```bash
NEXT_DEBUG=1
```

Puis lancer normalement :

```bash
pnpm --filter @ibee/platform start
```

**Une seule session (bash / macOS / Linux)** :

```bash
NEXT_DEBUG=1 pnpm --filter @ibee/platform start
```

**Une seule session (PowerShell Windows)** :

```powershell
$env:NEXT_DEBUG = "1"
pnpm --filter @ibee/platform start
```

Ou sur une ligne :

```powershell
$env:NEXT_DEBUG="1"; pnpm --filter @ibee/platform start
```

Logs serveur (préfixe `[dashboard:perf]`, dépassement `[dashboard:perf:OVER]`) :

| Label | Budget prod |
|-------|-------------|
| `context:getDashboardAccountShell` | 300 ms |
| `context:getDashboardContext` | 300 ms |
| `page:analyse` | 800 ms |
| `action:analyse` | 600 ms |
| `page:site-shell` | 400 ms |
| `page:site-playlists` | 1200 ms |
| `page:equipe` | 500 ms |
| `page:drive` | 600 ms |

Implémentation : `apps/platform/src/lib/dashboard-perf.ts`

### Baseline `next dev` vs `next start`

```bash
# 1. Build prod local
pnpm --filter @ibee/platform build

# 2. Mesure next start (référence prod-like)
# bash:   NEXT_DEBUG=1 pnpm --filter @ibee/platform start
# PowerShell:
$env:NEXT_DEBUG = "1"; pnpm --filter @ibee/platform start
# → naviguer /dashboard/analyse, /dashboard/site, noter les logs [dashboard:perf]

# 3. Mesure next dev (souvent 2–5× plus lent en TTFB)
$env:NEXT_DEBUG = "1"; pnpm --filter @ibee/platform dev
# → même parcours, comparer les durées
```

**Interprétation :** `next start` reflète la prod ; `next dev` surestime la lenteur (compilation Turbopack, HMR). Ne pas optimiser uniquement sur `dev`.

### Cache entity

`unstable_cache` **non utilisé** : le client Supabase serveur lit `cookies()` — incompatible avec `unstable_cache` (erreur 500 en prod). La déduplication par requête reste assurée par `React.cache()` dans `getDashboardContext`.

---

## Ordre d'exécution

```
Phase A (global, tout dashboard)  → commencer ici
Phase B (navigation + Analyse)
Phase C (données lourdes)
Phase D (mesure)
```

**Estimation:** 3–4 jours pour A+B (ressenti très différent), +2 jours pour C.

---

## Ce qui est ciblé vs général

| Changement | Type |
|------------|------|
| `dashboard-context.ts` | **Général** |
| Layout sans notifications serveur | **Général** |
| `loading.tsx` × 4 routes | **Général** |
| Notifications client + pas revalidate layout | **Général** |
| Analyse server action | **Ciblé** (modèle pour autres filtres) |
| Agrégations SQL analytics | **Ciblé données** (bénéfice export aussi) |
| Studio chargement progressif | **Ciblé page Site** |

→ **~70 % général, ~30 % par zone** — mais la base (Phase A) profite à tout le monde avant de tuner chaque page.

---

## Critères « expérience globale fluide »

1. Navigation rail Site → Analyse → Équipe → Drive : **shell ne clignote pas**, skeleton contenu < 100 ms
2. Filtres Analyse : **< 200 ms** ressenti (action client)
3. Layout dashboard : **≤ 2 requêtes Supabase** par navigation (auth + entity)
4. Marquer notification lue : **pas de reload** page courante
5. `next start` local : pages dashboard **< 1 s** TTFB contenu (hors Site studio complet)

---

## Références

- Layout actuel : `apps/platform/src/app/dashboard/layout.tsx`
- Analyse navigation : server action `fetchAnalyseScopeAction` (plus de `router.push` filtres)
- Perf debug : `apps/platform/src/lib/dashboard-perf.ts`
- Plan Analyse 100 % : `docs/plans/2026-06-10-analyse-100-percent-complet.md`
