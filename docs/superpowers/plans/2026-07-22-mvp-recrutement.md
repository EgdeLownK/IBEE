# MVP Recrutement — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le MVP Recrutement IBEE — offres d'emploi publiques, candidatures, profil candidat, et sélecteur d'entreprise dans le dashboard.

**Architecture:**
- Nouvelles migrations SQL pour `user_profiles`, `favorites`, et `entity_job_applications.applicant_user_id`
- Ajout de `'jobs'` dans le système de tabs public (`packages/ui-react/src/profile/profile-tabs.ts`)
- Nouveau groupe de routes `(account)/` pour les pages candidat (authentification requise, sans être owner)
- Le sélecteur d'entreprise (`#d1`) modifie `DashboardContext` pour lister les entités accessibles (owner + membre)

**Tech Stack:** Next.js 16 App Router, Supabase, TypeScript, Tailwind CSS, Lucide icons, sonner toast

---

## ⚠️ Points d'architecture à valider avec Killian avant l'exécution

### A. Sélecteur d'entreprise `#d1` — impact majeur sur `DashboardContext`

Actuellement `getDashboardContext()` cherche l'entité où `user_id = auth.uid()` (owner uniquement).  
Pour que le dropdown `#d1` fonctionne, il faut lister les entités où l'utilisateur est **aussi membre** (`entity_team_members`). C'est une modification du cœur du dashboard.

**Option A (recommandée) :** `DashboardContext` reste inchangé pour la session courante. On ajoute un état "entité active" dans `AccountContext` qui peut être différent de l'entité owner. Le header charge les entités accessibles en parallèle.

**Option B :** Reporter `#d1` à une prochaine itération. Les autres screens peuvent sortir sans lui.

### B. `#c3` — Overlay création entreprise

Créer une entité IBEE nécessite un `slug` unique + un handler qui appelle l'API de création. La logique de création existe côté auth trigger Supabase mais pas côté UI candidat.  
**Recommandation :** Implémenter l'overlay comme un formulaire simple (nom + slug) qui appelle une server action, sans les étapes d'onboarding complètes du wizard.

---

## Carte des fichiers

### Fichiers créés
| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260722170000_user_profiles_favorites.sql` | Tables `user_profiles` + `favorites` + `applicant_user_id` |
| `packages/supabase/src/user-profiles.ts` | Helpers `getUserProfile`, `upsertUserProfile` |
| `packages/supabase/src/favorites.ts` | Helpers `addFavorite`, `removeFavorite`, `listFavorites` |
| `apps/platform/src/app/(account)/layout.tsx` | Layout zone candidat (auth requise, pas owner) |
| `apps/platform/src/app/(account)/mes-candidatures/page.tsx` | Page liste candidatures |
| `apps/platform/src/app/(account)/mon-compte/page.tsx` | Page infos perso + CV + entreprises |
| `apps/platform/src/components/account/ApplicationsList.tsx` | Liste candidatures `#c1`/`#c1b` |
| `apps/platform/src/components/account/AccountPage.tsx` | Page compte `#c2` |
| `apps/platform/src/components/account/CreateEntityDialog.tsx` | Overlay `#c3` |
| `apps/platform/src/app/(public)/[slug]/offres/[offerId]/page.tsx` | Page détail offre publique `#p2` |
| `apps/platform/src/components/public/jobs/PublicJobOffersList.tsx` | Onglet Offres `#p1` |
| `apps/platform/src/components/public/jobs/PublicJobOfferDetail.tsx` | Détail offre publique `#p2` |
| `apps/platform/src/components/public/jobs/ApplyBottomSheet.tsx` | Overlay candidature `#p3`/`#p4` |
| `apps/platform/src/app/(public)/[slug]/offres/[offerId]/apply-actions.ts` | Server action `createJobApplicationAction` |

### Fichiers modifiés
| Fichier | Modification |
|---------|-------------|
| `packages/supabase/src/project-talent.ts` | Ajouter `createJobApplication`, `listMyApplications`, `listActiveJobOffersByEntity` |
| `packages/supabase/src/index.ts` | Exporter les nouvelles fonctions |
| `packages/ui-react/src/profile/profile-tabs.ts` | Ajouter `'jobs'` dans `PROFILE_TAB_ORDER`, labels, icônes |
| `packages/ui-react/src/profile/profile-tab-visibility.ts` | Logique visibilité `'jobs'` + `jobOffersCount` dans `ProfileTabContent` |
| `packages/ui-react/src/profile/index.ts` | Exporter `profileTabContentFromLists` avec le nouveau paramètre |
| `apps/platform/src/lib/load-public-profile.ts` | Charger les offres actives, passer `jobOffersCount` |
| `apps/platform/src/components/public/PublicProfileTabsController.tsx` | Gérer l'onglet `jobs` |
| `apps/platform/src/lib/team-data.ts` | Ajouter permission `talent`, rôle `recruiter` dans `DEFAULT_TEAM_ROLES` |
| `apps/platform/src/components/dashboard/team/TeamDialogs.tsx` | Fix défaut invitation → dernier rôle inviteable |
| `packages/supabase/src/team.ts` | Ajouter `talent` dans seeds + seed `recruiter` |
| `apps/platform/src/components/dashboard/GlobalHeader.tsx` (ou équivalent) | Sélecteur entité `#d1` |

---

## Tâche 0 : Migration SQL

**Files:**
- Create: `supabase/migrations/20260722170000_user_profiles_favorites.sql`

> La migration RLS `20260722160000_entity_team_permissions_rls.sql` est déjà appliquée en prod.

- [ ] **Step 1 : Écrire la migration**

```sql
-- user_profiles : 1:1 avec auth.users, données candidat internes
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  default_resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Chaque utilisateur ne voit que son propre profil
create policy "user_profiles: own read" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "user_profiles: own insert" on public.user_profiles
  for insert with check (auth.uid() = user_id);

create policy "user_profiles: own update" on public.user_profiles
  for update using (auth.uid() = user_id);

-- applicant_user_id sur entity_job_applications
alter table public.entity_job_applications
  add column if not exists applicant_user_id uuid references auth.users(id) on delete set null;

-- Politique d'accès pour les candidats (lire ses propres candidatures)
create policy "job_applications: applicant read own" on public.entity_job_applications
  for select using (applicant_user_id = auth.uid());

-- favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text,
  entity_id uuid not null references public.entity(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_has_owner check (user_id is not null or anonymous_id is not null)
);

alter table public.favorites enable row level security;

create policy "favorites: own read" on public.favorites
  for select using (auth.uid() = user_id or anonymous_id is not null);

create policy "favorites: own insert" on public.favorites
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "favorites: own delete" on public.favorites
  for delete using (auth.uid() = user_id);

-- Lecture publique des offres actives pour les visiteurs
create policy "job_offers: public active read" on public.entity_job_offers
  for select using (status = 'active');
```

- [ ] **Step 2 : Appliquer la migration**

Killian applique le SQL via SQL Editor Supabase production.

- [ ] **Step 3 : Régénérer les types**

```bash
pnpm gen-types
```

Vérifier que `user_profiles`, `favorites` et `applicant_user_id` apparaissent dans `packages/supabase/src/types.ts`.

---

## Tâche 1 : Permission `talent` + rôle `recruiter`

**Files:**
- Modify: `apps/platform/src/lib/team-data.ts`
- Modify: `packages/supabase/src/team.ts`

### 1A — Ajouter la permission `talent` dans `team-data.ts`

- [ ] **Step 1 : Ajouter `talent` à `TeamPermissionKey`** (ligne 1-11)

```typescript
export type TeamPermissionKey =
  | 'profile_studio'
  | 'analyse'
  | 'news'
  | 'shop'
  | 'services'
  | 'events'
  | 'messages'
  | 'connecteur'
  | 'team'
  | 'revenue'
  | 'talent'  // ← ajout
```

- [ ] **Step 2 : Ajouter `talent` dans le groupe `content` de `TEAM_PERMISSION_GROUPS`**

Après la permission `events` (ligne ~67), ajouter :

```typescript
{
  key: 'talent',
  label: 'Recrutement',
  description: 'Créer et gérer les offres, voir les candidatures',
},
```

- [ ] **Step 3 : Mettre à jour `MEMBER_PERMISSIONS`** (talent reste false car `createEmptyPermissions()` l'initialise à false)

`MEMBER_PERMISSIONS` appelle `createEmptyPermissions()` qui itère sur `TEAM_PERMISSION_KEYS` — `talent` sera automatiquement `false`. Vérifier visuellement que c'est bien le cas.

- [ ] **Step 4 : Ajouter le rôle `recruiter` dans `DEFAULT_TEAM_ROLES`**

Insérer entre `manager` et `member` (qui passe à position 3) :

```typescript
{
  id: 'recruiter',
  roleKey: 'recruiter',
  label: 'Recruteur·se',
  bg: 'rgba(59, 130, 246, 0.12)',
  fg: 'rgb(59, 130, 246)',
  permissions: {
    ...clonePermissions(createEmptyPermissions()),
    talent: true,
    messages: true,
  },
  inviteable: true,
},
```

> Note : dans `DEFAULT_TEAM_ROLES`, `member` reste à la fin mais n'a pas de `position` explicite — l'ordre dans le tableau définit l'ordre visuel UI. `member` reste bien après `recruiter`.

### 1B — Mettre à jour les seeds dans `team.ts`

- [ ] **Step 5 : Ajouter `talent` dans les seeds existantes**

Dans `DEFAULT_ROLE_SEEDS`, ajouter `talent: true` dans `owner` et `manager`, `talent: false` dans `member` :

```typescript
// owner (ligne ~30) — ajouter dans permissions:
talent: true,

// manager (~ligne 54) — ajouter dans permissions:
talent: true,

// member (~ligne 72) — ajouter dans permissions:
talent: false,
```

- [ ] **Step 6 : Ajouter le seed `recruiter`** entre `manager` et `member` (position 2) :

```typescript
{
  role_key: 'recruiter',
  label: 'Recruteur·se',
  bg: 'rgba(59, 130, 246, 0.12)',
  fg: 'rgb(59, 130, 246)',
  permissions: {
    profile_studio: false,
    analyse: false,
    news: false,
    shop: false,
    services: false,
    events: false,
    messages: true,
    connecteur: false,
    team: false,
    revenue: false,
    talent: true,
  },
  inviteable: true,
  position: 2,
},
```

Et mettre à jour `member` → `position: 3`.

### 1C — Fix `TeamInviteDialog` (défaut = rôle le plus bas)

- [ ] **Step 7 : Fix ligne 337 de `apps/platform/src/components/dashboard/team/TeamDialogs.tsx`**

Changer :
```typescript
setRoleId(inviteableRoles[0]?.id ?? '')
```
En :
```typescript
setRoleId(inviteableRoles[inviteableRoles.length - 1]?.id ?? '')
```

> Pourquoi : les rôles sont ordonnés par `position` (manager=1, recruiter=2, member=3). Le premier est le plus élevé (manager). On veut le plus bas par défaut (member = dernier).

- [ ] **Step 8 : Type-check**

```bash
pnpm type-check
```

Corriger toute erreur TypeScript liée à l'ajout de `talent` (les helpers `mapRoleRecordToDefinition` et `createEmptyPermissions` utilisent `TEAM_PERMISSION_KEYS` donc se mettront à jour automatiquement).

- [ ] **Step 9 : Commit**

```bash
git checkout -b feat/mvp-recrutement
git add packages/supabase/src/team.ts apps/platform/src/lib/team-data.ts apps/platform/src/components/dashboard/team/TeamDialogs.tsx
git commit -m "feat(team): add talent permission and recruiter role, fix invite default to lowest role"
```

---

## Tâche 2 : Helpers Supabase — user_profiles, candidatures, favoris

**Files:**
- Create: `packages/supabase/src/user-profiles.ts`
- Create: `packages/supabase/src/favorites.ts`
- Modify: `packages/supabase/src/project-talent.ts`
- Modify: `packages/supabase/src/index.ts`

### 2A — `user-profiles.ts`

- [ ] **Step 1 : Créer `packages/supabase/src/user-profiles.ts`**

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

type Client = SupabaseClient<Database>

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export async function getUserProfile(client: Client, userId: string): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserProfile(
  client: Client,
  userId: string,
  input: {
    first_name?: string | null
    last_name?: string | null
    default_resume_url?: string | null
  }
): Promise<UserProfile> {
  const { data, error } = await client
    .from('user_profiles')
    .upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 2B — `favorites.ts`

- [ ] **Step 2 : Créer `packages/supabase/src/favorites.ts`**

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

type Client = SupabaseClient<Database>

export async function listFavoritesByUser(client: Client, userId: string) {
  const { data, error } = await client
    .from('favorites')
    .select('*, entity(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addFavorite(client: Client, userId: string, entityId: string) {
  const { error } = await client
    .from('favorites')
    .upsert({ user_id: userId, entity_id: entityId })

  if (error) throw error
}

export async function removeFavorite(client: Client, userId: string, entityId: string) {
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_id', entityId)

  if (error) throw error
}
```

### 2C — Étendre `project-talent.ts`

- [ ] **Step 3 : Ajouter les fonctions manquantes dans `packages/supabase/src/project-talent.ts`**

```typescript
// Ajouter après les exports existants :

export type CreateJobApplicationInput = {
  offer_id: string
  applicant_name: string
  applicant_email: string
  cover_letter?: string | null
  resume_url?: string | null
  applicant_user_id?: string | null
}

export async function createJobApplication(
  client: Client,
  input: CreateJobApplicationInput
): Promise<JobApplication> {
  const { data, error } = await client
    .from('entity_job_applications')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listMyApplications(
  client: Client,
  userId: string
): Promise<(JobApplication & { entity_job_offers: { title: string; entity_id: string } | null })[]> {
  const { data, error } = await client
    .from('entity_job_applications')
    .select('*, entity_job_offers(title, entity_id)')
    .eq('applicant_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as any
}

export async function listActiveJobOffersByEntity(
  client: Client,
  entityId: string
): Promise<JobOffer[]> {
  const { data, error } = await client
    .from('entity_job_offers')
    .select('*')
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

### 2D — Exporter dans `index.ts`

- [ ] **Step 4 : Ajouter les exports dans `packages/supabase/src/index.ts`**

```typescript
export { getUserProfile, upsertUserProfile } from './user-profiles'
export type { UserProfile } from './user-profiles'

export { listFavoritesByUser, addFavorite, removeFavorite } from './favorites'

// Dans la section project-talent (déjà `export * from './project-talent'`), les nouveaux exports sont automatiques
```

> `export * from './project-talent'` est déjà présent → les nouvelles fonctions sont exportées sans action supplémentaire.

- [ ] **Step 5 : Type-check + commit**

```bash
pnpm type-check
git add packages/supabase/src/user-profiles.ts packages/supabase/src/favorites.ts packages/supabase/src/project-talent.ts packages/supabase/src/index.ts
git commit -m "feat(supabase): add user-profiles, favorites helpers and extend project-talent with createJobApplication"
```

---

## Tâche 3 : Onglet Offres public `#p1`

**Files:**
- Modify: `packages/ui-react/src/profile/profile-tabs.ts`
- Modify: `packages/ui-react/src/profile/profile-tab-visibility.ts`
- Modify: `packages/ui-react/src/profile/index.ts`
- Modify: `apps/platform/src/lib/load-public-profile.ts`
- Create: `apps/platform/src/components/public/jobs/PublicJobOffersList.tsx`
- Modify: `apps/platform/src/components/public/PublicProfileTabsController.tsx`

### 3A — Ajouter `'jobs'` au système de tabs

- [ ] **Step 1 : Modifier `packages/ui-react/src/profile/profile-tabs.ts`**

```typescript
import {
  BookOpen,
  Briefcase,  // ← nouvel import icône jobs
  CalendarDays,
  House,
  Newspaper,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export const PROFILE_TAB_LABELS: Record<string, string> = {
  home: 'Accueil',
  shop: 'Shop',
  appointments: 'Service',
  events: 'Event',
  news: 'News',
  history: 'Histoire',
  jobs: 'Offres',  // ← ajout
}

export const PROFILE_TAB_ICONS: Record<string, LucideIcon> = {
  home: House,
  shop: ShoppingBag,
  appointments: CalendarDays,
  events: Zap,
  news: Newspaper,
  history: BookOpen,
  jobs: Briefcase,  // ← ajout
}

export const PROFILE_TAB_ORDER = [
  'home',
  'news',
  'shop',
  'appointments',
  'events',
  'history',
  'jobs',  // ← ajout (en fin)
] as const

export const PROFILE_ACTIVITY_TAB_TYPES = ['shop', 'appointments', 'events'] as const

export type ProfileTabType = (typeof PROFILE_TAB_ORDER)[number]
```

- [ ] **Step 2 : Modifier `profile-tab-visibility.ts`**

Ajouter `jobOffersCount` dans `ProfileTabContent` et la logique de visibilité :

```typescript
export type ProfileTabContent = {
  publicationsCount: number
  shopProductsCount: number
  playlistServicesCount: number
  playlistEventsCount: number
  historyBlocksCount: number
  jobOffersCount: number  // ← ajout
}

// Dans hasProfileTabContent, ajouter :
case 'jobs':
  return content.jobOffersCount > 0
```

Dans `getVisibleProfileTabs`, ajouter l'affichage de `jobs` après `history` :

```typescript
if (isVisible('history')) result.push('history')
if (isVisible('jobs')) result.push('jobs')  // ← ajout
```

Dans `profileTabContentFromLists` :

```typescript
export function profileTabContentFromLists(lists: {
  publications?: readonly unknown[]
  shopProducts?: readonly unknown[]
  playlistServices?: readonly unknown[]
  playlistEvents?: readonly unknown[]
  historyBlocks?: readonly unknown[]
  jobOffers?: readonly unknown[]  // ← ajout
}): ProfileTabContent {
  return {
    publicationsCount: lists.publications?.length ?? 0,
    shopProductsCount: lists.shopProducts?.length ?? 0,
    playlistServicesCount: lists.playlistServices?.length ?? 0,
    playlistEventsCount: lists.playlistEvents?.length ?? 0,
    historyBlocksCount: lists.historyBlocks?.length ?? 0,
    jobOffersCount: lists.jobOffers?.length ?? 0,  // ← ajout
  }
}
```

> Le type `ProfileTabType` est un union strict — `'jobs'` ajouté dans `PROFILE_TAB_ORDER` fait partie du type automatiquement. Aucune autre modification de type nécessaire.

### 3B — Charger les offres actives dans `load-public-profile.ts`

- [ ] **Step 3 : Modifier `apps/platform/src/lib/load-public-profile.ts`**

Importer et appeler `listActiveJobOffersByEntity` :

```typescript
// Ajouter dans l'import @ibee/supabase :
import { listActiveJobOffersByEntity } from '@ibee/supabase'

// Ajouter dans Promise.all (après listUpcomingEvents) :
listActiveJobOffersByEntity(supabase, entity.id).catch(() => []),

// Destructurer :
const [
  menuSections,
  homeWidgetsRaw,
  historyBlocks,
  contactInfoRaw,
  faq,
  publications,
  appointmentTypes,
  products,
  productCategories,
  upcomingEvents,
  activeJobOffers,  // ← ajout
] = await Promise.all([...])

// Mapper vers format public :
const jobOffers = activeJobOffers.map((offer) => ({
  id: offer.id,
  title: offer.title,
  contract_type: offer.contract_type,
  location_type: offer.location_type,
  location_text: offer.location_text,
  compensation_type: offer.compensation_type,
  compensation_amount: offer.compensation_amount,
  compensation_frequency: offer.compensation_frequency,
  created_at: offer.created_at,
}))

// Ajouter dans le return :
jobOffers,
```

Mettre à jour le `profileTabContentFromLists` dans `PublicProfileTabsController` pour passer `jobOffers`.

### 3C — Composant liste d'offres public

- [ ] **Step 4 : Créer `apps/platform/src/components/public/jobs/PublicJobOffersList.tsx`**

```tsx
import Link from 'next/link'
import { Briefcase, MapPin, Clock } from 'lucide-react'

type JobOfferPublic = {
  id: string
  title: string
  contract_type: string
  location_type: string
  location_text: string | null
  compensation_type: string | null
  compensation_amount: number | null
  compensation_frequency: string | null
  created_at: string
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  mission: 'Mission / Freelance',
}

const LOCATION_LABELS: Record<string, string> = {
  remote: '100% Télétravail',
  onsite: 'Sur site',
  hybrid: 'Hybride',
}

function compensationLabel(offer: JobOfferPublic) {
  if (!offer.compensation_type || !offer.compensation_amount) return null
  const unit = offer.compensation_type === 'percentage' ? '%' : '€'
  const freq =
    offer.compensation_frequency === 'monthly'
      ? '/mois'
      : offer.compensation_frequency === 'weekly'
        ? '/semaine'
        : offer.compensation_frequency === 'mission'
          ? '/mission'
          : ''
  return `${offer.compensation_amount}${unit}${freq ? ' ' + freq : ''}`
}

export function PublicJobOffersList({
  offers,
  entitySlug,
}: {
  offers: JobOfferPublic[]
  entitySlug: string
}) {
  if (offers.length === 0) {
    return (
      <div className="px-[22px] py-12 text-center">
        <p className="text-sm text-neutral-500">Aucune offre d&apos;emploi en ce moment.</p>
      </div>
    )
  }

  return (
    <div className="px-[22px] py-6 space-y-3">
      <p className="text-sm text-neutral-500 mb-4">
        {offers.length} offre{offers.length > 1 ? 's' : ''} disponible{offers.length > 1 ? 's' : ''}
      </p>
      {offers.map((offer) => (
        <Link
          key={offer.id}
          href={`/${entitySlug}/offres/${offer.id}`}
          className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 text-sm truncate">{offer.title}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <Briefcase className="h-3 w-3" />
                  {CONTRACT_LABELS[offer.contract_type] ?? offer.contract_type}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="h-3 w-3" />
                  {offer.location_type === 'remote'
                    ? LOCATION_LABELS.remote
                    : offer.location_text || LOCATION_LABELS[offer.location_type] || 'Sur site'}
                </span>
                {compensationLabel(offer) ? (
                  <span className="text-xs text-neutral-500">{compensationLabel(offer)}</span>
                ) : null}
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Postuler
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

### 3D — Câbler dans `PublicProfileTabsController.tsx`

- [ ] **Step 5 : Modifier `PublicProfileTabsController.tsx`**

```tsx
// Ajouter l'import :
import { PublicJobOffersList } from './jobs/PublicJobOffersList'

// Mettre à jour profileTabContentFromLists :
const tabContent = useMemo(
  () =>
    profileTabContentFromLists({
      publications: data.publications,
      shopProducts: data.shopProducts,
      playlistServices: data.playlistServices,
      playlistEvents: data.playlistEvents,
      historyBlocks: data.historyBlocks,
      jobOffers: data.jobOffers,  // ← ajout
    }),
  [
    data.publications,
    data.shopProducts,
    data.playlistServices,
    data.playlistEvents,
    data.historyBlocks,
    data.jobOffers,  // ← ajout
  ]
)

// Dans le rendu, ajouter AVANT le bloc ProfileStudioSections :
{activeType === 'jobs' ? (
  <PublicJobOffersList offers={data.jobOffers} entitySlug={data.entity.slug} />
) : null}
```

> Attention : l'onglet `jobs` n'est PAS géré par `ProfileStudioSections` (c'est un module nouveau). Utiliser un `else if` ou restructurer le bloc conditionnel.

- [ ] **Step 6 : Type-check**

```bash
pnpm type-check
```

- [ ] **Step 7 : Commit**

```bash
git add packages/ui-react/src/profile/ apps/platform/src/lib/load-public-profile.ts apps/platform/src/components/public/
git commit -m "feat(public): add jobs tab to public profile, list active job offers"
```

---

## Tâche 4 : Page détail offre publique `#p2`

**Files:**
- Create: `apps/platform/src/app/(public)/[slug]/offres/[offerId]/page.tsx`
- Create: `apps/platform/src/components/public/jobs/PublicJobOfferDetail.tsx`

### 4A — Page route

- [ ] **Step 1 : Créer `apps/platform/src/app/(public)/[slug]/offres/[offerId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createPublicSupabaseClient } from '@/lib/site-url'
import { getProjectJobOffer, getEntityBySlug } from '@ibee/supabase'
import { PublicJobOfferDetail } from '@/components/public/jobs/PublicJobOfferDetail'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string; offerId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, offerId } = await params
  const supabase = createPublicSupabaseClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return { title: 'Offre introuvable' }
  try {
    const offer = await getProjectJobOffer(supabase, entity.id, offerId)
    return {
      title: `${offer.title} — ${entity.display_name}`,
      description: `Offre d'emploi chez ${entity.display_name}`,
    }
  } catch {
    return { title: 'Offre introuvable' }
  }
}

export default async function PublicJobOfferPage({ params }: Props) {
  const { slug, offerId } = await params
  const supabase = createPublicSupabaseClient()

  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) notFound()

  let offer
  try {
    offer = await getProjectJobOffer(supabase, entity.id, offerId)
  } catch {
    notFound()
  }

  if (offer.status !== 'active') notFound()

  return (
    <PublicJobOfferDetail
      offer={offer}
      entitySlug={slug}
      entityName={entity.display_name}
      entityAvatarUrl={entity.avatar_url}
    />
  )
}
```

### 4B — Composant détail offre

- [ ] **Step 2 : Créer `apps/platform/src/components/public/jobs/PublicJobOfferDetail.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Briefcase, MapPin } from 'lucide-react'
import type { JobOffer } from '@ibee/supabase'
import { parseHistoryBlocks } from '@ibee/shared'
import { ApplyBottomSheet } from './ApplyBottomSheet'

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  mission: 'Mission / Freelance',
}

const LOCATION_LABELS: Record<string, string> = {
  remote: '100% Télétravail',
  onsite: 'Sur site',
  hybrid: 'Hybride',
}

function compensationLabel(offer: JobOffer) {
  if (!offer.compensation_type || !offer.compensation_amount) return null
  const unit = offer.compensation_type === 'percentage' ? '%' : '€'
  const freq =
    offer.compensation_frequency === 'monthly'
      ? ' / mois'
      : offer.compensation_frequency === 'weekly'
        ? ' / semaine'
        : offer.compensation_frequency === 'mission'
          ? ' / mission'
          : ''
  return `${offer.compensation_amount}${unit}${freq}`
}

interface Props {
  offer: JobOffer
  entitySlug: string
  entityName: string
  entityAvatarUrl: string | null
}

export function PublicJobOfferDetail({ offer, entitySlug, entityName, entityAvatarUrl }: Props) {
  const [applyOpen, setApplyOpen] = useState(false)

  const blocks = offer.blocks ? parseHistoryBlocks(offer.blocks) : []
  const comp = compensationLabel(offer)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <Link
          href={`/${entitySlug}#jobs`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux offres
        </Link>

        {/* Header */}
        <div className="mb-6">
          {entityAvatarUrl ? (
            <img src={entityAvatarUrl} alt={entityName} className="h-12 w-12 rounded-full object-cover mb-3" />
          ) : null}
          <p className="text-sm text-neutral-500 mb-1">{entityName}</p>
          <h1 className="text-2xl font-semibold text-neutral-900">{offer.title}</h1>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
              <Briefcase className="h-3 w-3" />
              {CONTRACT_LABELS[offer.contract_type] ?? offer.contract_type}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
              <MapPin className="h-3 w-3" />
              {offer.location_type === 'remote'
                ? LOCATION_LABELS.remote
                : offer.location_text || LOCATION_LABELS[offer.location_type] || 'Sur site'}
            </span>
            {comp ? (
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
                {comp}
              </span>
            ) : null}
          </div>
        </div>

        {/* Content blocks */}
        <div className="prose prose-sm max-w-none text-neutral-700 mb-8">
          {blocks.map((block, i) => {
            if (block.type === 'text') {
              return (
                <p key={i} className="whitespace-pre-wrap">
                  {block.content}
                </p>
              )
            }
            if (block.type === 'list') {
              return (
                <ul key={i} className="list-disc pl-5 space-y-1">
                  {block.items.map((item, j) => (
                    <li key={j}>{item.value}</li>
                  ))}
                </ul>
              )
            }
            if (block.type === 'image' && block.images?.[0]) {
              return (
                <img key={i} src={block.images[0]} alt={block.title ?? ''} className="rounded-lg w-full" />
              )
            }
            return null
          })}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => setApplyOpen(true)}
          className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
        >
          Postuler à cette offre
        </button>
      </div>

      <ApplyBottomSheet
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        offerId={offer.id}
        offerTitle={offer.title}
        entityName={entityName}
      />
    </div>
  )
}
```

---

## Tâche 5 : Overlay candidature `#p3` / `#p4`

**Files:**
- Create: `apps/platform/src/components/public/jobs/ApplyBottomSheet.tsx`
- Create: `apps/platform/src/app/(public)/[slug]/offres/[offerId]/apply-actions.ts`

### 5A — Server Action candidature

- [ ] **Step 1 : Créer `apply-actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createJobApplication } from '@ibee/supabase'

export type ApplyFormInput = {
  offer_id: string
  applicant_name: string
  applicant_email: string
  cover_letter?: string
  resume_url?: string
}

export async function createJobApplicationAction(
  input: ApplyFormInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    await createJobApplication(supabase, {
      offer_id: input.offer_id,
      applicant_name: input.applicant_name,
      applicant_email: input.applicant_email,
      cover_letter: input.cover_letter ?? null,
      resume_url: input.resume_url ?? null,
      applicant_user_id: user?.id ?? null,
    })
    return {}
  } catch (err: any) {
    return { error: err.message || 'Une erreur est survenue.' }
  }
}
```

### 5B — Bottom-sheet overlay

- [ ] **Step 2 : Créer `ApplyBottomSheet.tsx`**

Ce composant implémente `#p3` (non connecté → CTA login) et `#p4` (connecté → formulaire).

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createJobApplicationAction } from '../../../app/(public)/[slug]/offres/[offerId]/apply-actions'

interface Props {
  open: boolean
  onClose: () => void
  offerId: string
  offerTitle: string
  entityName: string
  isAuthenticated?: boolean
  userEmail?: string
  userName?: string
}

export function ApplyBottomSheet({
  open,
  onClose,
  offerId,
  offerTitle,
  entityName,
  isAuthenticated = false,
  userEmail = '',
  userName = '',
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState(userEmail)
  const [coverLetter, setCoverLetter] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setName(userName)
      setEmail(userEmail)
      setCoverLetter('')
      setSubmitted(false)
      setError('')
    }
  }, [open, userName, userEmail])

  useEffect(() => {
    if (!open) return
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError('Nom et email requis.')
      return
    }
    setError('')
    startTransition(async () => {
      const result = await createJobApplicationAction({
        offer_id: offerId,
        applicant_name: name.trim(),
        applicant_email: email.trim(),
        cover_letter: coverLetter.trim() || undefined,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-neutral-500">{entityName}</p>
            <h2 className="text-base font-semibold text-neutral-900">{offerTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="font-semibold text-neutral-900">Candidature envoyée !</p>
            <p className="text-sm text-neutral-500 mt-1">
              Nous avons bien reçu votre candidature. Bonne chance !
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white"
            >
              Fermer
            </button>
          </div>
        ) : !isAuthenticated ? (
          /* #p3 — Non connecté */
          <div className="py-4 text-center">
            <p className="text-sm text-neutral-600 mb-6">
              Connectez-vous pour postuler et suivre vos candidatures.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`)}
              className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white mb-3"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-700"
            >
              Plus tard
            </button>
          </div>
        ) : (
          /* #p4 — Connecté */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Nom complet *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                placeholder="Votre nom"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">
                Message (optionnel)
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                placeholder="Décrivez votre motivation en quelques lignes..."
              />
            </div>

            {error ? (
              <p className="text-xs text-red-600 font-medium">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi...
                </span>
              ) : (
                'Envoyer ma candidature'
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
```

> Le composant reçoit `isAuthenticated`, `userEmail`, `userName` depuis le Server Component parent qui vérifie la session.

- [ ] **Step 3 : Câbler `isAuthenticated` dans la page détail offre**

Modifier `apps/platform/src/app/(public)/[slug]/offres/[offerId]/page.tsx` pour lire la session et passer les props au composant client.

- [ ] **Step 4 : Type-check + commit**

```bash
pnpm type-check
git add apps/platform/src/app/\(public\)/\[slug\]/offres/ apps/platform/src/components/public/jobs/
git commit -m "feat(public): job offer detail page + apply bottom-sheet with auth gate"
```

---

## Tâche 6 : Pages candidat `#c1` / `#c2`

**Files:**
- Create: `apps/platform/src/app/(account)/layout.tsx`
- Create: `apps/platform/src/app/(account)/mes-candidatures/page.tsx`
- Create: `apps/platform/src/app/(account)/mon-compte/page.tsx`
- Create: `apps/platform/src/components/account/ApplicationsList.tsx`
- Create: `apps/platform/src/components/account/AccountPage.tsx`

### 6A — Layout zone compte

- [ ] **Step 1 : Créer `apps/platform/src/app/(account)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicShell } from '@/components/public/PublicShell'
import { loadAccountShellData } from '@/lib/account-shell-data'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const accountData = await loadAccountShellData(supabase)

  return (
    <PublicShell accountData={accountData} webUrl={webUrl}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </div>
    </PublicShell>
  )
}
```

### 6B — Page mes-candidatures `#c1` / `#c1b`

- [ ] **Step 2 : Créer `apps/platform/src/app/(account)/mes-candidatures/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listMyApplications } from '@ibee/supabase'
import { ApplicationsList } from '@/components/account/ApplicationsList'

export default async function MesCandidaturesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const applications = await listMyApplications(supabase, user.id)

  return <ApplicationsList applications={applications} />
}
```

- [ ] **Step 3 : Créer `apps/platform/src/components/account/ApplicationsList.tsx`**

```tsx
import Link from 'next/link'
import { Briefcase } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-50 text-yellow-700' },
  reviewing: { label: 'En cours', className: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Accepté', className: 'bg-green-50 text-green-700' },
  rejected: { label: 'Refusé', className: 'bg-red-50 text-red-700' },
  archived: { label: 'Archivé', className: 'bg-neutral-50 text-neutral-600' },
}

type Application = {
  id: string
  status: string
  created_at: string
  entity_job_offers: { title: string; entity_id: string } | null
}

export function ApplicationsList({ applications }: { applications: Application[] }) {
  if (applications.length === 0) {
    return (
      <div className="py-16 text-center">
        <Briefcase className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Aucune candidature</h2>
        <p className="text-sm text-neutral-500">
          Explorez les offres disponibles sur les profils IBEE.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Explorer
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Mes candidatures</h1>
      <div className="space-y-3">
        {applications.map((app) => {
          const status = STATUS_LABELS[app.status] ?? STATUS_LABELS.pending
          const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(app.created_at))
          return (
            <div key={app.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm text-neutral-900">
                    {app.entity_job_offers?.title ?? 'Offre supprimée'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{date}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### 6C — Page mon-compte `#c2`

- [ ] **Step 4 : Créer `apps/platform/src/app/(account)/mon-compte/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@ibee/supabase'
import { AccountPage } from '@/components/account/AccountPage'

export default async function MonComptePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(supabase, user.id)

  return <AccountPage user={user} profile={profile} />
}
```

- [ ] **Step 5 : Créer `apps/platform/src/components/account/AccountPage.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { User } from '@supabase/supabase-js'
import type { UserProfile } from '@ibee/supabase'
import { toast } from 'sonner'
import { upsertUserProfileAction } from '../../app/(account)/mon-compte/account-actions'

interface Props {
  user: User
  profile: UserProfile | null
}

export function AccountPage({ user, profile }: Props) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await upsertUserProfileAction({ first_name: firstName, last_name: lastName })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Profil mis à jour')
    })
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Mon compte</h1>

      <form onSubmit={handleSave} className="space-y-4 bg-white rounded-xl border border-neutral-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-neutral-900">Informations personnelles</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="Nom"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-600 block mb-1">Email</label>
          <input
            type="email"
            value={user.email ?? ''}
            disabled
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6 : Créer la server action `account-actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertUserProfile } from '@ibee/supabase'

export async function upsertUserProfileAction(input: {
  first_name?: string
  last_name?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Non authentifié' }

  try {
    await upsertUserProfile(supabase, user.id, input)
    return {}
  } catch (err: any) {
    return { error: err.message || 'Erreur serveur' }
  }
}
```

- [ ] **Step 7 : Type-check + commit**

```bash
pnpm type-check
git add apps/platform/src/app/\(account\)/ apps/platform/src/components/account/
git commit -m "feat(account): add mes-candidatures and mon-compte pages for applicants"
```

---

## Tâche 7 : Sélecteur d'entreprise `#d1` et overlay création `#c3`

> ⚠️ **Valider Option A vs B avec Killian** (voir section Architecture en haut du plan) avant de commencer cette tâche.

**Files:**
- Modify: `apps/platform/src/components/dashboard/GlobalHeader.tsx` (ou équivalent)
- Create: `apps/platform/src/components/account/CreateEntityDialog.tsx`

### 7A — EntitySwitcher dans le header dashboard

La logique repose sur une query qui liste les entités accessibles à l'user courant :
1. L'entité dont l'user est owner (`entity.user_id = auth.uid()`)
2. Les entités dont l'user est membre (`entity_team_members.email = auth.email()`)

- [ ] **Step 1 : Ajouter helper `listAccessibleEntities` dans `packages/supabase/src/team.ts`**

```typescript
export async function listAccessibleEntities(client: Client, userId: string, email: string) {
  // Entités dont l'user est owner
  const { data: owned, error: ownedError } = await client
    .from('entity')
    .select('id, display_name, slug, avatar_url')
    .eq('user_id', userId)

  if (ownedError) throw ownedError

  // Entités dont l'user est membre
  const { data: memberRows, error: memberError } = await client
    .from('entity_team_members')
    .select('entity_id, entity(id, display_name, slug, avatar_url)')
    .ilike('email', email.toLowerCase())

  if (memberError) throw memberError

  const ownedIds = new Set((owned ?? []).map((e) => e.id))
  const memberEntities = (memberRows ?? [])
    .map((row) => row.entity as any)
    .filter(Boolean)
    .filter((e: any) => !ownedIds.has(e.id))

  return {
    owned: owned ?? [],
    member: memberEntities,
  }
}
```

- [ ] **Step 2 : Trouver et modifier `GlobalHeader`**

Localiser le composant `GlobalHeader` dans `apps/platform/src/components/dashboard/`, ajouter le dropdown entité.

- [ ] **Step 3 : Créer `CreateEntityDialog.tsx`** (`#c3`)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateEntityDialog({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleNameChange(value: string) {
    setName(value)
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value))
    }
  }

  function slugify(str: string) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Créer une entreprise</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        <form className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="Nom de l'entreprise"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">
              Slug URL *
            </label>
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
              <span className="px-3 text-xs text-neutral-400 bg-neutral-50 h-full flex items-center py-2.5 border-r border-neutral-200">ibee.io/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                placeholder="mon-entreprise"
              />
            </div>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isPending || !name.trim() || !slug}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 4 : Type-check + build**

```bash
pnpm type-check
pnpm build
```

- [ ] **Step 5 : Commit final**

```bash
git add .
git commit -m "feat(dashboard): add entity switcher header + create entity dialog"
```

---

## Checklist de vérification finale

```bash
pnpm type-check   # 0 erreurs
pnpm build        # build production OK
```

Routes à tester manuellement :
- [ ] `/{slug}#jobs` → onglet Offres visible si offres actives
- [ ] `/{slug}/offres/{offerId}` → page détail offre
- [ ] Overlay candidature : non connecté → CTA login ; connecté → formulaire
- [ ] `/mes-candidatures` → liste ou état vide
- [ ] `/mon-compte` → formulaire infos perso
- [ ] `/dashboard/equipe` → rôle Recruteur·se visible, défaut invitation = Membre
- [ ] `/dashboard/talent` → table des offres (inchangé visuellement)

---

## Points hors scope (ne pas toucher)

Boutique, billetterie, rendez-vous, revenus, analyse globale.
