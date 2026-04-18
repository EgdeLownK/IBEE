# CLAUDE.md — Agora

Plateforme de profils web pour solopreneurs, optimisée SEO/GEO/AEO.
Un profil Agora = un mini-site web pro indexable et citable par les LLMs (ChatGPT, Perplexity).

## En début de session

Lire `.agora-brain/_BRAIN-STATE.md` — statut projet, prochains chantiers, blocages (~30 secondes).

## Commandes

```bash
pnpm dev                    # Dev local (web:4321 + dashboard:3000)
pnpm type-check              # Vérification TypeScript
pnpm test                   # Tests unitaires (Vitest)
pnpm build                  # Build complet
```

## Structure

```
apps/web/              Astro SSR (profils publics, Cloudflare Pages)
apps/dashboard/        Next.js App Router (back-office, Vercel)
packages/ui-server/    Composants Astro + Tailwind v4 (zéro React)
packages/ui-react/     Composants React + Radix UI
packages/supabase/     Client Supabase + types + helpers
supabase/migrations/   Migrations SQL
.agora-brain/          Second brain du projet (vision, décisions, features, marché)
```

## Environnement

- Package manager : **pnpm exclusivement** (hook force-pnpm.sh)

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
Dès qu'une tâche est complexe (multi-fichiers, multi-packages, recherche + implémentation), l'agent principal devient orchestrateur : il décompose, délègue à des sous-agents spécialisés, et garde son contexte clean. L'orchestrateur reste responsable du respect des garde-fous — les sous-agents n'héritent pas automatiquement des règles.

### 3. Auto-amélioration
Chaque erreur significative (bug introduit, mauvaise approche, oubli de vérification) est loguée dans la mémoire de session. La session suivante ne reproduira pas la même erreur. Les erreurs techniques runtime vont dans `pieges-claude-code.md` (technique/). Les erreurs de processus vont dans la mémoire Claude Code.

### 4. Vérifier après chaque tâche
Après chaque tâche d'implémentation, exécuter la chaîne de vérification :
1. `pnpm type-check` — zéro erreurs TypeScript
2. `pnpm build` — build complet passe
3. Tests unitaires si existants
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

## Brain

Le brain (`.agora-brain/`) est la mémoire long terme du projet.
- `DIGEST.md` — résumé stratégique pour onboarding externe
- `_BRAIN-STATE.md` — tableau de bord (lu en début de session)
- `_decision-log-code.md` — décisions techniques (code, stack, UI, patterns) — lu avant un choix code
- `_decision-log-projet.md` — décisions non-code (business, méthode, stratégie) — lu avant un choix projet
- `pilier/` — vision, non-négociable (`fondation-projet.md` = persona, modèle économique, promesse, différenciation)
- `technique/` — règles tech, stack, pièges, opérations brain, guide entretiens, setup Claude Code, commandes gstack
- `marche/` — intelligence marché, concurrents, entretiens
- `to-do/` — matrice d'Eisenhower. Chantiers réels de Killian à mener.

## Règle d'or

Si une décision contredit `.agora-brain/pilier/`, alerter Killian avant d'exécuter.
