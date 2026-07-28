# CLAUDE.md — IBEE

Plateforme de profils web pour solopreneurs, optimisée SEO/GEO/AEO.
Un profil IBEE = un mini-site web pro indexable et citable par les LLMs (ChatGPT, Perplexity).

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
.ibee-brain/           Notes personnelles et recherches — hors dépôt, pas une source
                        de doctrine pour l'agent (voir Règle d'or ci-dessous)
```

- Package manager : **pnpm exclusivement** (hook force-pnpm.sh)
- Conventions techniques, collaboration, garde-fous : `.claude/rules/` — se charge
  automatiquement, certaines règles à chaque session, d'autres au contact du code
  concerné. Doctrine produit : `.claude/rules/produit.md` (détail complet :
  `docs/produit.md`). Configuration MCP : `.claude/rules/mcp-config.md`.

## Méthode de travail

1. **Planifier avant de coder.** Toute tâche touchant 3+ fichiers ou introduisant un
   nouveau pattern : poser le plan (fichiers concernés, approche, risques), obtenir le
   "go" de Killian, puis implémenter. Fix isolé d'un seul fichier : direct.
2. **Orchestrer via sous-agents.** L'agent principal décompose, délègue à des
   sous-agents spécialisés, garde son contexte clean. Reste responsable du respect
   des garde-fous — les sous-agents n'héritent pas automatiquement des règles.
3. **Auto-amélioration.** Erreur significative (bug introduit, mauvaise approche,
   oubli de vérification) → mémoire de session, pour ne pas la reproduire. Piège
   technique qui passe le filtre de `.claude/rules/collaboration.md` §Traçabilité →
   la règle `.claude/rules/` du domaine concerné. Erreurs de process → mémoire
   Claude Code.
4. **Vérifier après chaque tâche** : `pnpm type-check` → `pnpm build` → tests
   unitaires si existants → (modif UI/CSS/JS client) vérif navigateur par Killian
   avant de considérer la tâche close — "0 erreur TypeScript ≠ runtime OK". Check en
   échec → diagnostiquer et corriger avant de présenter le résultat.
5. **Fix autonome des bugs.** Lire les logs, diagnostiquer, corriger. 2 tentatives
   aveugles max avant d'escalader à Killian avec les hypothèses déjà testées.
6. **Workflow PR.** Branche depuis `main` à jour (`feat/`, `fix/`, `chore/`) → commit
   (après revue Killian des fichiers modifiés) → push → PR (`gh pr create`) → CI
   (type-check + build + tests) → `/code-review` → Killian valide et merge sur
   GitHub. Exception : fix d'urgence d'un seul fichier direct sur `main` si Killian
   le demande.

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

Si une décision contredit `.claude/rules/produit.md` (doctrine produit), alerter
Killian avant d'exécuter.
