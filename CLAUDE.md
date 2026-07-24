# CLAUDE.md — IBEE

Plateforme de profils web pour solopreneurs, optimisée SEO/GEO/AEO.
Un profil IBEE = un mini-site web pro indexable et citable par les LLMs (ChatGPT, Perplexity).

## En début de session

Lire `.ibee-brain/_BRAIN-STATE.md` — statut projet, prochains chantiers, blocages (~30 secondes).

## Commandes

```bash
pnpm dev                    # Dev local Next.js (:3000)
pnpm type-check              # Vérification TypeScript
pnpm test                   # Tests unitaires (Vitest)
pnpm build                  # Build production (@ibee/platform)
```

## Structure

```
apps/platform/         Next.js 16 — app unifiée (public SEO + studio owner, Vercel)
packages/shared/       Logique métier TS pure (wizards, widgets, validation)
packages/ui-react/     Composants React + design system profil
packages/supabase/     Client Supabase + types + helpers
supabase/migrations/   Migrations SQL
.ibee-brain/          Second brain du projet (vision, décisions, features, marché)
```

## Environnement

- Package manager : **pnpm exclusivement** (hook force-pnpm.sh)
- Dev local : `apps/platform/.env.local` (voir `.env.example`)

## Configuration MCP

`.mcp.json` n'est pas committé (voir `.mcp.json.example` pour le template).
Pour configurer : copier `.mcp.json.example` vers `.mcp.json`, puis définir les variables d'environnement système `SUPABASE_ACCESS_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `OBSIDIAN_API_KEY`. Le fichier `.mcp.json` résout les références `${VAR}` depuis l'environnement au démarrage de Claude Code.

## Règles

Les conventions techniques, la collaboration, et les garde-fous vivent dans `.claude/rules/`.
Les règles se chargent automatiquement — certaines toujours, d'autres au contact du code concerné.

## Méthode de travail

### 1. Planifier avant de coder
Toute tâche touchant 3+ fichiers ou introduisant un nouveau pattern : poser le plan d'abord (fichiers concernés, approche, risques), obtenir le "go" de Killian, puis implémenter. Les fix isolés d'un seul fichier peuvent être directs.

### 2. Orchestrer via sous-agents
L'agent principal devient orchestrateur : il décompose, délègue à des sous-agents spécialisés, et garde son contexte clean. L'orchestrateur reste responsable du respect des garde-fous — les sous-agents n'héritent pas automatiquement des règles.

### 3. Auto-amélioration
Chaque erreur significative (bug introduit, mauvaise approche, oubli de vérification) est loguée dans la mémoire de session. La session suivante ne reproduira pas la même erreur. Les pièges techniques qui passent le filtre de `.claude/rules/collaboration.md` §Traçabilité vont en dur dans `.ibee-brain/_BRAIN-DEV.md` (section concernée). Les erreurs de processus vont dans la mémoire Claude Code.

### 4. Vérifier après chaque tâche
Après chaque tâche d'implémentation, exécuter la chaîne de vérification :
1. `pnpm type-check` — zéro erreurs TypeScript
2. `pnpm build` — build complet passe
3. Tests unitaires si existants
4. Modif UI/CSS/JS client : demander à Killian une vérification navigateur (hard refresh)
   avant de considérer la tâche close — "0 erreurs TypeScript ≠ runtime OK".
Si un check échoue, diagnostiquer et corriger avant de présenter le résultat à Killian.

### 5. Fix autonome des bugs
Quand un test ou un build échoue, lire les logs, diagnostiquer, et corriger automatiquement. Si 2 tentatives échouent : stop, lister les hypothèses testées, escalader à Killian. Jamais plus de 2 tentatives aveugles.

### 6. Workflow PR
Toute modification passe par une Pull Request sur `main` :
1. Créer une branche depuis `main` : `feat/description`, `fix/description`, ou `chore/description`
2. Committer les changements sur la branche (après revue Killian des fichiers modifiés)
3. Pousser la branche et créer une PR via `gh pr create`
4. CI (GitHub Actions) exécute type-check + build + tests automatiquement
5. Killian demande `/code-review` pour une revue technique de la PR
6. Killian valide et merge sur GitHub

Exception : fix d'urgence d'un seul fichier peut aller directement sur `main` si Killian le demande.

### 7. Commentaires (obligatoire)

- Tout fichier créé commence par un commentaire d'en-tête : rôle du fichier en 1-3 lignes.
- Toute fonction exportée ou non-triviale : JSDoc/commentaire — but, paramètres importants, retour.
- Toute logique complexe (calcul, condition métier, workaround) : commentaire expliquant
  le **pourquoi**, pas le quoi.
- En français, concis, mis à jour quand le code change (un commentaire faux est pire qu'absent).
- Objectif : Killian doit pouvoir comprendre n'importe quel fichier sans aide.
- S'applique aussi aux sous-agents : l'orchestrateur vérifie que le code délégué est commenté.

## Brain

Le brain (`.ibee-brain/`) est la mémoire long terme du projet. Racine à 5 fichiers (voir `_BRAIN-RULES.md` §Structure) :
- `_IBEE.md` — pilier produit & boussole (promesse, différenciateur, JTBD, doctrines non-négociables). Fondateur.
- `_BRAIN-DEV.md` — doctrine technique unique (architecture, versions, patterns sécurité/SEO, coûts, inventaire). Fondateur.
- `_BRAIN-STATE.md` — tableau de bord (dette ouverte, prochaine action, dernière session) — lu en début de session.
- `_BRAIN-RULES.md` — grammaire du brain.
- `README.md` — index sémantique.
- Sous-dossiers thématiques : `app/` (specs), `marche/` (marché, persona, concurrents), `wiki/` (recherches externes), `marketing/` (présence publique, interviews).

## Doctrine des surfaces (post-migration Astro → Next)

| Surface | URL | Rôle |
|---------|-----|------|
| Public | `/{slug}`, pages détail, explore… | SSR/ISR SEO, interactions visiteur |
| Studio | `/dashboard/site` | Édition owner — Server Actions |
| Preview owner | `/{slug}?preview=1` | Aperçu public sans redirect studio |

- Owner sur `/{slug}` sans `?preview=1` → redirect `/dashboard/site`.
- Cache prod : `revalidatePath` (Vercel) — pas de purge Cloudflare.
- Invalidation : `revalidatePublicPaths` / `revalidateAfterEntityMutation` dans les mutations.

## Format de rapport (relais vers Claude chat)

Killian relaie les rapports à Claude chat (qui pilote ; toi tu codes). Tout rapport de fin
de tâche ou de phase suit ce format, sans prose autour :

    ## RAPPORT — [titre court]
    **TL;DR** : 2-3 phrases max.
    **FAIT** : fichier → quoi (1 ligne chacun)
    **VÉRIFIÉ** : type-check ✅/❌ · build ✅/❌ · tests ✅/❌ · vérif navigateur ✅/❌/n.a.
    **À VALIDER PAR KILLIAN** : liste ou "rien"
    **QUESTIONS** : numérotées, chacune avec ta recommandation (tranchable par oui/non)
    **RISQUES / DÉCOUVERTES** : liste ou "rien"

Chemins complets, pas de répétition du contexte connu, une question = une recommandation.

## Règle d'or

Si une décision contredit `.ibee-brain/_IBEE.md`, alerter Killian avant d'exécuter.
